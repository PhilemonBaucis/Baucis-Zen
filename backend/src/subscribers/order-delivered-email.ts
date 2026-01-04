import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/utils"
import { sendEmail, isEmailConfigured } from "../lib/email-service"
import {
  generateOrderDeliveredEmail,
  generateOrderDeliveredText,
  shouldUseAlbanian
} from "../lib/email-templates"

/**
 * Subscriber to send order delivered email when order is completed
 *
 * Triggered when admin marks the order as complete (all items fulfilled and delivered)
 */
export default async function orderDeliveredEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.log(`[Email] Gmail API not configured, skipping delivered email for ${orderId}`)
    return
  }

  try {
    const orderModule = container.resolve(Modules.ORDER)
    const customerModule = container.resolve(Modules.CUSTOMER)

    // Get the order with details
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address"],
    })

    if (!order) {
      console.log(`[Email] Order ${orderId} not found`)
      return
    }

    const customerEmail = order.email
    if (!customerEmail) {
      console.log(`[Email] No customer email for order ${orderId}`)
      return
    }

    // Get customer name
    let customerName = ''
    const shippingAddress = order.shipping_address as any

    if (shippingAddress?.first_name) {
      customerName = shippingAddress.first_name
    } else if (order.customer_id) {
      try {
        const customer = await customerModule.retrieveCustomer(order.customer_id)
        customerName = customer?.first_name || ''
      } catch {
        // Customer not found, use empty name
      }
    }

    // Get country info for language detection
    const countryNames: Record<string, string> = {
      AL: 'Shqipëri',
      XK: 'Kosovë',
    }
    const countryCode = shippingAddress?.country_code?.toUpperCase() || 'AL'
    const countryName = countryNames[countryCode] || countryCode

    // Prepare order items
    const items = (order.items || []).map((item: any) => ({
      title: item.title || item.product_title || 'Product',
      quantity: item.quantity || 1,
      unit_price: Number(item.unit_price) || 0,
      thumbnail: item.thumbnail,
    }))

    // Generate email content
    const emailData = {
      orderId,
      displayId: String(order.display_id || orderId),
      customerName,
      email: customerEmail,
      items,
      total: Number(order.total) || 0,
      shippingAddress: {
        firstName: shippingAddress?.first_name || '',
        lastName: shippingAddress?.last_name || '',
        city: shippingAddress?.city || '',
        country: countryName,
        countryCode: countryCode,
      },
      deliveredAt: new Date().toISOString(),
    }

    const htmlContent = generateOrderDeliveredEmail(emailData)
    const textContent = generateOrderDeliveredText(emailData)

    // Send the email - use Albanian subject for Albania/Kosovo
    const isAlbanian = shouldUseAlbanian(countryCode)
    const subject = isAlbanian
      ? `Porosia u Dorëzua - #${order.display_id || orderId}`
      : `Order Delivered - #${order.display_id || orderId}`

    const sent = await sendEmail(customerEmail, subject, htmlContent, textContent)

    if (sent) {
      console.log(`[Email] Order delivered email sent to ${customerEmail} for order ${orderId}`)
    } else {
      console.error(`[Email] Failed to send delivered email for order ${orderId}`)
    }

  } catch (error) {
    console.error(`[Email] Error sending delivered email for ${orderId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}
