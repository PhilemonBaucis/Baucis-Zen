/**
 * Email Templates for Baucis Zen
 * 
 * Professional HTML email templates with brand styling.
 * Albanian language for Albania and Kosovo customers.
 */

// Brand colors
const BRAND_GREEN = '#6a8a55'
const BRAND_GREEN_LIGHT = '#f7f8f6'
const BRAND_PINK = '#f7d1d1'
const BRAND_PINK_LIGHT = '#fefcfc'

// Albanian translations for email
const translations = {
  sq: {
    orderConfirmed: 'Porosia u Konfirmua',
    thankYou: 'Faleminderit shumë',
    valuedCustomer: 'klient i nderuar',
    orderConfirmedMessage: 'Jemi të lumtur që zgjodhët Baucis Zen! Porosia juaj është konfirmuar me sukses dhe do të përgatitet me kujdes për dërgesë.',
    invoiceAttached: 'Fatura e porosisë suaj gjendet e bashkangjitur në këtë email. Ju lutem ruajeni për referencë.',
    order: 'Porosia',
    orderSummary: 'Përmbledhja e Porosisë',
    qty: 'Sasia',
    subtotal: 'Nëntotali',
    shipping: 'Transporti',
    total: 'Totali',
    shippingTo: 'Dërgesa Tek',
    cashOnDelivery: 'Pagesë në Dorëzim',
    codMessage: 'Ju lutem keni gati {amount} kur të mbërrijë porosia.',
    paymentProcessed: 'Pagesa u përpunua me sukses',
    zenPointsEarned: 'Pikë Zen të Fituara',
    trackingNote: 'Do të merrni SMS me informacion gjurmimi kur porosia të dërgohet.',
    continueShopping: 'Vazhdo Blerjet',
    questions: 'Pyetje? Na kontaktoni në',
    allRightsReserved: 'Të gjitha të drejtat të rezervuara.',
    warmRegards: 'Me respekt,',
    baucisTeam: 'Ekipi Baucis Zen',
    // Shipped email
    orderShipped: 'Porosia u Dërgua',
    shippedMessage: 'Lajme të mira! Porosia juaj është në rrugë!',
    onTheWay: 'Në Rrugë',
    estimatedDelivery: 'Koha e Vlerësuar',
    trackOrder: 'Gjurmo Porosinë',
    deliveryAddress: 'Adresa e Dorëzimit',
    // Delivered email
    orderDelivered: 'Porosia u Dorëzua',
    deliveredMessage: 'Porosia juaj u dorëzua me sukses!',
    enjoyPurchase: 'Shpresojmë që t\'i shijoni produktet tuaja!',
    leaveReview: 'Na Jepni Mendimin',
    reviewMessage: 'Na do të dëshironit të ndajnit eksperiencën tuaj? Vlerësimet tuaja na ndihmojnë të përmirësohemi.',
  },
  en: {
    orderConfirmed: 'Order Confirmed',
    thankYou: 'Thank you so much',
    valuedCustomer: 'valued customer',
    orderConfirmedMessage: 'We are thrilled you chose Baucis Zen! Your order has been confirmed and will be carefully prepared for delivery.',
    invoiceAttached: 'Your order invoice is attached to this email. Please keep it for your records.',
    order: 'Order',
    orderSummary: 'Order Summary',
    qty: 'Qty',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    shippingTo: 'Shipping To',
    cashOnDelivery: 'Cash on Delivery',
    codMessage: 'Please have {amount} ready when your order arrives.',
    paymentProcessed: 'Payment successfully processed',
    zenPointsEarned: 'Zen Points Earned',
    trackingNote: 'You will receive an SMS with tracking information when your order ships.',
    continueShopping: 'Continue Shopping',
    questions: 'Questions? Contact us at',
    allRightsReserved: 'All rights reserved.',
    warmRegards: 'Warm regards,',
    baucisTeam: 'The Baucis Zen Team',
    // Shipped email
    orderShipped: 'Order Shipped',
    shippedMessage: 'Great news! Your order is on its way!',
    onTheWay: 'On The Way',
    estimatedDelivery: 'Estimated Delivery',
    trackOrder: 'Track Order',
    deliveryAddress: 'Delivery Address',
    // Delivered email
    orderDelivered: 'Order Delivered',
    deliveredMessage: 'Your order has been delivered successfully!',
    enjoyPurchase: 'We hope you enjoy your purchase!',
    leaveReview: 'Leave a Review',
    reviewMessage: 'Would you like to share your experience? Your feedback helps us improve.',
  }
}

interface OrderItem {
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
}

interface OrderEmailData {
  orderId: string
  displayId: string
  customerName: string
  email: string
  items: OrderItem[]
  subtotal: number
  shippingTotal: number
  total: number
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    postalCode?: string
    country: string
    countryCode?: string
  }
  paymentMethod: 'cod' | 'card'
  zenPointsEarned?: number
  locale?: string
}

/**
 * Determine if Albanian language should be used based on country
 */
function shouldUseAlbanian(countryCode?: string): boolean {
  const albanianCountries = ['AL', 'XK', 'ALBANIA', 'KOSOVO']
  return albanianCountries.includes((countryCode || '').toUpperCase())
}

/**
 * Generate order confirmation email HTML
 * Clean, simple design - just thank you message with reference to attached invoice
 */
export function generateOrderConfirmationEmail(data: OrderEmailData): string {
  const {
    customerName,
    total,
    shippingAddress,
    paymentMethod,
    zenPointsEarned,
  } = data

  // Use Albanian for Albania and Kosovo
  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en

  // Format currency
  const formatPrice = (amount: number) => `€${amount.toFixed(2)}`

  // Payment method specific content (COD reminder)
  const codMessageText = t.codMessage.replace('{amount}', formatPrice(total))
  const paymentHtml = paymentMethod === 'cod' ? `
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align: middle; padding-right: 16px;">
            <div style="width: 48px; height: 48px; background: #fef3c7; border-radius: 50%; text-align: center; line-height: 48px;">
              <span style="font-size: 20px; color: #92400e; font-weight: bold;">COD</span>
            </div>
          </td>
          <td style="vertical-align: middle;">
            <p style="margin: 0; font-weight: 600; color: #92400e; font-family: 'Georgia', serif; font-size: 16px;">${t.cashOnDelivery}</p>
            <p style="margin: 6px 0 0 0; color: #b45309; font-size: 14px;">${codMessageText}</p>
          </td>
        </tr>
      </table>
    </div>
  ` : ''

  // Zen Points section removed - keeping email clean and professional

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.orderConfirmed} - Baucis Zen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f8f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f8f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_GREEN} 0%, #5a7448 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 400; font-family: 'Georgia', serif;">Baucis Zen</h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-family: 'Georgia', serif;">${t.orderConfirmed}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Greeting -->
              <p style="font-size: 20px; color: #3e4e32; margin: 0 0 16px 0; font-family: 'Georgia', serif;">
                ${t.thankYou}, ${customerName || t.valuedCustomer}!
              </p>

              <!-- Main Message -->
              <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.7;">
                ${t.orderConfirmedMessage}
              </p>

              <!-- Invoice Reference -->
              <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.7;">
                ${t.invoiceAttached}
              </p>

              ${paymentHtml}

              <!-- Tracking Note -->
              <div style="background: ${BRAND_PINK_LIGHT}; border-left: 4px solid ${BRAND_PINK}; border-radius: 0 12px 12px 0; padding: 16px 20px; margin: 24px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  ${t.trackingNote}
                </p>
              </div>

              <!-- Signature -->
              <div style="margin: 32px 0 24px 0; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${t.warmRegards}</p>
                <p style="margin: 0; color: ${BRAND_GREEN}; font-weight: 600; font-size: 16px; font-family: 'Georgia', serif;">${t.baucisTeam}</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0 10px 0;">
                <a href="https://bauciszen.com/products" style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: 500; font-family: 'Georgia', serif; font-size: 15px;">
                  ${t.continueShopping}
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f7f8f6; padding: 24px 30px; text-align: center; border-top: 1px solid #eef1ea;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                ${t.questions}
              </p>
              <a href="mailto:info@bauciszen.com" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 500;">
                info@bauciszen.com
              </a>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Baucis Zen. ${t.allRightsReserved}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of order confirmation
 */
export function generateOrderConfirmationText(data: OrderEmailData): string {
  const { customerName, total, shippingAddress, paymentMethod } = data
  const formatPrice = (amount: number) => `€${amount.toFixed(2)}`

  // Use Albanian for Albania and Kosovo
  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en

  const codMessageText = t.codMessage.replace('{amount}', formatPrice(total))

  let text = useAlbanian ? `
BAUCIS ZEN - POROSIA U KONFIRMUA
================================

${t.thankYou}, ${customerName || t.valuedCustomer}!

${t.orderConfirmedMessage}

${t.invoiceAttached}

${paymentMethod === 'cod' ? `${t.cashOnDelivery}: ${codMessageText}` : ''}

${t.trackingNote}

${t.warmRegards}
${t.baucisTeam}

---
${t.questions} info@bauciszen.com
© ${new Date().getFullYear()} Baucis Zen
  `.trim() : `
BAUCIS ZEN - ORDER CONFIRMED
================================

${t.thankYou}, ${customerName || t.valuedCustomer}!

${t.orderConfirmedMessage}

${t.invoiceAttached}

${paymentMethod === 'cod' ? `${t.cashOnDelivery}: ${codMessageText}` : ''}

${t.trackingNote}

${t.warmRegards}
${t.baucisTeam}

---
${t.questions} info@bauciszen.com
© ${new Date().getFullYear()} Baucis Zen
  `.trim()

  return text
}

// Shipped email data interface
interface ShippedEmailData {
  orderId: string
  displayId: string
  customerName: string
  email: string
  items: OrderItem[]
  total: number
  shippingAddress: {
    firstName: string
    lastName: string
    address1: string
    address2?: string
    city: string
    postalCode?: string
    country: string
    countryCode?: string
  }
  estimatedDelivery?: string
}

/**
 * Generate order shipped email HTML
 */
export function generateOrderShippedEmail(data: ShippedEmailData): string {
  const {
    displayId,
    orderId,
    customerName,
    items,
    total,
    shippingAddress,
    estimatedDelivery,
  } = data

  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en
  const formatPrice = (amount: number) => `€${(amount / 100).toFixed(2)}`

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eef1ea;">
        <span style="color: #3e4e32;">${item.title}</span>
        <span style="color: #6b7280;"> x${item.quantity}</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.orderShipped} - Baucis Zen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f8f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f8f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_GREEN} 0%, #5a7448 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 400; font-family: 'Georgia', serif;">Baucis Zen</h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-family: 'Georgia', serif;">${t.orderShipped}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">

              <!-- Greeting -->
              <p style="font-size: 18px; color: #3e4e32; margin: 0 0 8px 0; font-family: 'Georgia', serif; text-align: center;">
                ${t.shippedMessage}
              </p>
              <p style="color: #6b7280; margin: 0 0 20px 0; text-align: center;">
                ${customerName || t.valuedCustomer}, ${t.order.toLowerCase()} #${displayId || orderId}
              </p>

              <!-- Status Badge -->
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${t.onTheWay}</p>
                ${estimatedDelivery ? `<p style="margin: 0; color: #3b82f6; font-size: 16px; font-weight: 600;">${t.estimatedDelivery}: ${estimatedDelivery}</p>` : ''}
              </div>

              <!-- Order Items -->
              <h2 style="font-size: 14px; color: #6b7280; margin: 24px 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
                ${t.orderSummary}
              </h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                ${itemsHtml}
              </table>

              <p style="text-align: right; font-weight: 600; color: ${BRAND_GREEN}; font-size: 18px; font-family: 'Georgia', serif;">
                ${t.total}: ${formatPrice(total)}
              </p>

              <!-- Delivery Address -->
              <h2 style="font-size: 14px; color: #6b7280; margin: 24px 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
                ${t.deliveryAddress}
              </h2>

              <div style="background: ${BRAND_GREEN_LIGHT}; border-radius: 12px; padding: 16px;">
                <p style="margin: 0 0 4px 0; font-weight: 600; color: #3e4e32; font-family: 'Georgia', serif;">
                  ${shippingAddress.firstName} ${shippingAddress.lastName}
                </p>
                <p style="margin: 0; color: #6b7280; line-height: 1.6;">
                  ${shippingAddress.address1}<br/>
                  ${shippingAddress.address2 ? shippingAddress.address2 + '<br/>' : ''}
                  ${shippingAddress.city}${shippingAddress.postalCode ? ', ' + shippingAddress.postalCode : ''}<br/>
                  ${shippingAddress.country}
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f7f8f6; padding: 24px; text-align: center; border-top: 1px solid #eef1ea;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                ${t.questions}
              </p>
              <a href="mailto:info@bauciszen.com" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 500;">
                info@bauciszen.com
              </a>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Baucis Zen. ${t.allRightsReserved}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of shipped email
 */
export function generateOrderShippedText(data: ShippedEmailData): string {
  const { displayId, orderId, customerName, items, total, shippingAddress, estimatedDelivery } = data
  const formatPrice = (amount: number) => `€${(amount / 100).toFixed(2)}`
  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en

  return `
BAUCIS ZEN - ${t.orderShipped.toUpperCase()}
================================

${t.shippedMessage}

${t.order} #${displayId || orderId}
${customerName || t.valuedCustomer}

${t.orderSummary.toUpperCase()}:
${items.map(item => `- ${item.title} x${item.quantity}`).join('\n')}

${t.total.toUpperCase()}: ${formatPrice(total)}

${estimatedDelivery ? `${t.estimatedDelivery}: ${estimatedDelivery}\n` : ''}
${t.deliveryAddress.toUpperCase()}:
${shippingAddress.firstName} ${shippingAddress.lastName}
${shippingAddress.address1}
${shippingAddress.address2 || ''}
${shippingAddress.city}${shippingAddress.postalCode ? ', ' + shippingAddress.postalCode : ''}
${shippingAddress.country}

${t.questions} info@bauciszen.com

© ${new Date().getFullYear()} Baucis Zen
  `.trim()
}

// Delivered email data interface
interface DeliveredEmailData {
  orderId: string
  displayId: string
  customerName: string
  email: string
  items: OrderItem[]
  total: number
  shippingAddress: {
    firstName: string
    lastName: string
    city: string
    country: string
    countryCode?: string
  }
  deliveredAt?: string
}

/**
 * Generate order delivered email HTML
 */
export function generateOrderDeliveredEmail(data: DeliveredEmailData): string {
  const {
    displayId,
    orderId,
    customerName,
    items,
    total,
    shippingAddress,
  } = data

  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en
  const formatPrice = (amount: number) => `€${(amount / 100).toFixed(2)}`

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eef1ea;">
        <span style="color: #3e4e32;">${item.title}</span>
        <span style="color: #6b7280;"> x${item.quantity}</span>
      </td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.orderDelivered} - Baucis Zen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f8f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f8f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_GREEN} 0%, #5a7448 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 400; font-family: 'Georgia', serif;">Baucis Zen</h1>
              <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-family: 'Georgia', serif;">${t.orderDelivered}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">

              <!-- Greeting -->
              <p style="font-size: 18px; color: #3e4e32; margin: 0 0 8px 0; font-family: 'Georgia', serif; text-align: center;">
                ${t.deliveredMessage}
              </p>
              <p style="color: #6b7280; margin: 0 0 8px 0; text-align: center;">
                ${t.order} #${displayId || orderId}
              </p>
              <p style="color: ${BRAND_GREEN}; margin: 0 0 24px 0; text-align: center; font-family: 'Georgia', serif;">
                ${t.enjoyPurchase}
              </p>

              <!-- Order Summary -->
              <div style="background: ${BRAND_GREEN_LIGHT}; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h2 style="font-size: 14px; color: #6b7280; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
                  ${t.orderSummary}
                </h2>

                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                </table>

                <p style="text-align: right; font-weight: 600; color: ${BRAND_GREEN}; font-size: 18px; font-family: 'Georgia', serif; margin: 16px 0 0 0;">
                  ${t.total}: ${formatPrice(total)}
                </p>
              </div>

              <!-- Review CTA -->
              <div style="background: linear-gradient(135deg, ${BRAND_PINK_LIGHT} 0%, ${BRAND_PINK} 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 12px 0; color: #3e4e32; font-family: 'Georgia', serif;">
                  ${t.reviewMessage}
                </p>
                <a href="https://bauciszen.com/products" style="display: inline-block; background: ${BRAND_GREEN}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 50px; font-weight: 500; font-family: 'Georgia', serif;">
                  ${t.leaveReview}
                </a>
              </div>

              <!-- Continue Shopping -->
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://bauciszen.com/products" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 500;">
                  ${t.continueShopping} →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f7f8f6; padding: 24px; text-align: center; border-top: 1px solid #eef1ea;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                ${t.questions}
              </p>
              <a href="mailto:info@bauciszen.com" style="color: ${BRAND_GREEN}; text-decoration: none; font-weight: 500;">
                info@bauciszen.com
              </a>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Baucis Zen. ${t.allRightsReserved}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text version of delivered email
 */
export function generateOrderDeliveredText(data: DeliveredEmailData): string {
  const { displayId, orderId, customerName, items, total, shippingAddress } = data
  const formatPrice = (amount: number) => `€${(amount / 100).toFixed(2)}`
  const useAlbanian = shouldUseAlbanian(shippingAddress.countryCode)
  const t = useAlbanian ? translations.sq : translations.en

  return `
BAUCIS ZEN - ${t.orderDelivered.toUpperCase()}
================================

${t.deliveredMessage}

${t.order} #${displayId || orderId}
${customerName || t.valuedCustomer}

${t.enjoyPurchase}

${t.orderSummary.toUpperCase()}:
${items.map(item => `- ${item.title} x${item.quantity}`).join('\n')}

${t.total.toUpperCase()}: ${formatPrice(total)}

${t.reviewMessage}

${t.continueShopping}: https://bauciszen.com/products

${t.questions} info@bauciszen.com

© ${new Date().getFullYear()} Baucis Zen
  `.trim()
}

// Export the helper function for use in subscribers
export { shouldUseAlbanian }
