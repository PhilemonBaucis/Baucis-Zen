import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/utils"
import { sendEmail, isEmailConfigured } from "../lib/email-service"
import {
  generateOrderConfirmationEmail,
  generateOrderConfirmationText
} from "../lib/email-templates"
import { calculatePointsForOrder } from "../lib/zen-points-config"
import { generateInvoicePdf, orderToInvoiceData } from "../lib/invoice-pdf-service"

/**
 * Subscriber to send order confirmation email when an order is placed
 */
export default async function orderConfirmationEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id

  // Check if email is configured
  if (!isEmailConfigured()) {
    console.log(`[Email] Gmail API not configured, skipping order confirmation email for ${orderId}`)
    return
  }

  try {
    // Get the order service
    const orderModule = container.resolve(Modules.ORDER)
    const customerModule = container.resolve(Modules.CUSTOMER)
    const cartModule = container.resolve(Modules.CART)

    // Get the order with all details including summary for totals and shipping_methods for shipping cost
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["items", "shipping_address", "summary", "shipping_methods"],
    })

    if (!order) {
      console.log(`[Email] Order ${orderId} not found`)
      return
    }

    // Get Zen tier discount - check order.metadata first (Medusa v2.1.3+ copies cart metadata to order)
    // Then fall back to cart.metadata for older versions or edge cases
    let discountAmount = 0
    let discountTier = ''

    // First, check order.metadata (should be set by Medusa v2.1.3+ during completeCart)
    const orderDiscount = (order as any)?.metadata?.zen_tier_discount
    if (orderDiscount?.amount) {
      discountAmount = Number(orderDiscount.amount)
      discountTier = orderDiscount.tier || ''
      console.log(`[Email] Found Zen tier discount in order.metadata: ${discountTier} - €${discountAmount.toFixed(2)}`)
    } else if ((order as any).cart_id) {
      // Fallback: try to get from cart metadata (for older Medusa versions)
      try {
        const cart = await (cartModule as any).retrieveCart((order as any).cart_id)
        const cartDiscount = (cart as any)?.metadata?.zen_tier_discount
        if (cartDiscount?.amount) {
          discountAmount = Number(cartDiscount.amount)
          discountTier = cartDiscount.tier || ''
          console.log(`[Email] Found Zen tier discount in cart.metadata: ${discountTier} - €${discountAmount.toFixed(2)}`)
        }
      } catch (cartError) {
        console.log(`[Email] Could not retrieve cart ${(order as any).cart_id}:`, (cartError as Error).message)
      }
    }

    if (discountAmount === 0) {
      console.log(`[Email] No Zen tier discount found for order ${orderId}`)
    }

    const customerEmail = order.email
    if (!customerEmail) {
      console.log(`[Email] No customer email for order ${orderId}`)
      return
    }

    // Get customer name - try from order or fetch customer
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

    // Get order totals from summary (Medusa v2 structure)
    const summary = (order as any).summary || {}
    const orderTotal = Number(summary.current_order_total) || Number((order as any).total) || 0
    const orderSubtotal = Number((order as any).subtotal) || Number((order as any).item_total) || orderTotal
    const orderShipping = Number((order as any).shipping_total) || 0

    // Calculate discounted total (apply Zen tier discount if applicable)
    const discountedTotal = discountAmount > 0 ? orderTotal - discountAmount : orderTotal

    // Calculate Zen Points earned (if registered customer)
    // Points are based on ORIGINAL price, not discounted
    let zenPointsEarned = 0
    if (order.customer_id) {
      zenPointsEarned = calculatePointsForOrder(orderTotal)
    }

    // Determine payment method from order metadata or payment collection
    const paymentMethod: 'cod' | 'card' = 
      (order.metadata as any)?.payment_method === 'cod' ? 'cod' : 'card'

    // Prepare order items
    const items = (order.items || []).map((item: any) => ({
      title: item.title || item.product_title || 'Product',
      quantity: item.quantity || 1,
      unit_price: Number(item.unit_price) || 0,
      thumbnail: item.thumbnail,
    }))

    // Get country name and code
    const countryNames: Record<string, string> = {
      AL: 'Shqipëri',
      XK: 'Kosovë',
      // Add more as needed
    }
    const countryCode = shippingAddress?.country_code?.toUpperCase() || 'AL'
    const countryName = countryNames[countryCode] || countryCode

    // Generate email content
    // Use discounted total for display (COD amount, etc.)
    const emailData = {
      orderId,
      displayId: String(order.display_id || orderId),
      customerName,
      email: customerEmail,
      items,
      subtotal: orderSubtotal,
      shippingTotal: orderShipping,
      total: discountedTotal,  // Use discounted total for COD payment message
      shippingAddress: {
        firstName: shippingAddress?.first_name || '',
        lastName: shippingAddress?.last_name || '',
        address1: shippingAddress?.address_1 || '',
        address2: shippingAddress?.address_2 || '',
        city: shippingAddress?.city || '',
        postalCode: shippingAddress?.postal_code || '',
        country: countryName,
        countryCode: countryCode, // Pass country code for language detection
      },
      paymentMethod,
      zenPointsEarned,
    }

    const htmlContent = generateOrderConfirmationEmail(emailData)
    const textContent = generateOrderConfirmationText(emailData)

    // Generate PDF invoice
    // Pass cart discount info so invoice shows correct discounted total
    let pdfAttachment: { filename: string; content: Buffer; contentType: string } | undefined
    try {
      const invoiceData = orderToInvoiceData(order, { discountAmount, discountTier })
      const pdfBuffer = generateInvoicePdf(invoiceData)

      // Build filename: Fatura - FirstName LastName.pdf
      const fullName = `${shippingAddress?.first_name || ''} ${shippingAddress?.last_name || ''}`.trim()
      const safeCustomerName = fullName.replace(/[^a-zA-Z0-9\s]/g, '') || 'Klient'
      const filename = `Fatura - ${safeCustomerName}.pdf`

      pdfAttachment = {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
      console.log(`[Email] Generated PDF invoice for order ${orderId}`)
    } catch (pdfError) {
      console.error(`[Email] Failed to generate PDF invoice for order ${orderId}:`, pdfError)
      // Continue without PDF attachment
    }

    // Send the email - use Albanian subject for Albania/Kosovo
    // Subject without order number as requested
    const isAlbanian = ['AL', 'XK'].includes(countryCode)
    const subject = isAlbanian
      ? 'Porosia u Konfirmua - Baucis Zen'
      : 'Order Confirmed - Baucis Zen'
    const sent = await sendEmail(
      customerEmail,
      subject,
      htmlContent,
      textContent,
      pdfAttachment ? [pdfAttachment] : undefined
    )

    if (sent) {
      console.log(`[Email] Order confirmation sent to ${customerEmail} for order ${orderId}${pdfAttachment ? ' with invoice PDF' : ''}`)
    } else {
      console.error(`[Email] Failed to send order confirmation for order ${orderId}`)
    }

  } catch (error) {
    console.error(`[Email] Error sending order confirmation for ${orderId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

