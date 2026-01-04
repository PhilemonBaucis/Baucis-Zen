import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/utils"
import { sendEmail, isEmailConfigured } from "../lib/email-service"
import {
  generateOrderShippedEmail,
  generateOrderShippedText,
  shouldUseAlbanian
} from "../lib/email-templates"

/**
 * Subscriber to send order shipped email when a fulfillment is created
 *
 * Triggered when admin creates a fulfillment (marks order as shipped)
 */
export default async function orderShippedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const fulfillmentId = data.id

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.log(`[Email] Gmail API not configured, skipping shipped email for fulfillment ${fulfillmentId}`)
    return
  }

  try {
    const orderModule = container.resolve(Modules.ORDER)
    const customerModule = container.resolve(Modules.CUSTOMER)
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

    // Get the fulfillment to find the order
    const fulfillment = await fulfillmentModule.retrieveFulfillment(fulfillmentId, {
      relations: ["items"],
    })

    if (!fulfillment) {
      console.log(`[Email] Fulfillment ${fulfillmentId} not found`)
      return
    }

    // Get the order ID from fulfillment metadata or items
    // In Medusa v2, we need to find the order through the fulfillment's order relation
    const orderId = (fulfillment as any).order_id

    if (!orderId) {
      console.log(`[Email] No order ID found for fulfillment ${fulfillmentId}`)
      return
    }

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
        address1: shippingAddress?.address_1 || '',
        address2: shippingAddress?.address_2 || '',
        city: shippingAddress?.city || '',
        postalCode: shippingAddress?.postal_code || '',
        country: countryName,
        countryCode: countryCode,
      },
      // Estimated delivery can be added from fulfillment metadata if available
      estimatedDelivery: (fulfillment as any).metadata?.estimated_delivery,
    }

    const htmlContent = generateOrderShippedEmail(emailData)
    const textContent = generateOrderShippedText(emailData)

    // Send the email - use Albanian subject for Albania/Kosovo
    const isAlbanian = shouldUseAlbanian(countryCode)
    const subject = isAlbanian
      ? `Porosia u Dërgua - #${order.display_id || orderId}`
      : `Order Shipped - #${order.display_id || orderId}`

    const sent = await sendEmail(customerEmail, subject, htmlContent, textContent)

    if (sent) {
      console.log(`[Email] Order shipped email sent to ${customerEmail} for order ${orderId}`)
    } else {
      console.error(`[Email] Failed to send shipped email for order ${orderId}`)
    }

  } catch (error) {
    console.error(`[Email] Error sending shipped email for fulfillment ${fulfillmentId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
