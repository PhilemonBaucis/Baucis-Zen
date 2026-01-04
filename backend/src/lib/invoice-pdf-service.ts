/**
 * Invoice PDF Generation Service for Baucis Zen
 *
 * Generates PDF invoices using jsPDF library
 * Matches the frontend invoice format (Albanian language, centered logo, VAT breakdown)
 */

import { jsPDF } from 'jspdf'
import { LOGO_BASE64 } from './logo-data'

interface InvoiceItem {
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
}

interface ShippingAddress {
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  postalCode?: string
  country: string
  countryCode: string
  phone?: string
}

interface InvoiceData {
  orderId: string
  displayId: string
  invoiceNumber: string // Formatted invoice number: IN-YYYY-XXXXX
  orderNumber: string   // Formatted order number: BZ-YYYY-XXXXX
  customerName: string
  email: string
  items: InvoiceItem[]
  subtotal: number
  shippingTotal: number
  discountTotal?: number
  total: number
  currencyCode: string
  shippingAddress: ShippingAddress
  createdAt: string
  paymentMethod: 'cod' | 'card'
}

/**
 * Generate formatted invoice number from display_id and date
 * Format: IN-YYYY-XXXXX (e.g., IN-2025-00042)
 * Uses "IN" prefix to distinguish from order numbers
 */
function generateInvoiceNumber(displayId: string | number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear()
  const paddedId = String(displayId).padStart(5, '0')
  return `IN-${year}-${paddedId}`
}

/**
 * Generate formatted order number from display_id and date
 * Format: BZ-YYYY-XXXXX (e.g., BZ-2025-00042)
 * Uses "BZ" prefix for Baucis Zen orders
 */
function generateOrderNumber(displayId: string | number, createdAt: string): string {
  const year = new Date(createdAt).getFullYear()
  const paddedId = String(displayId).padStart(5, '0')
  return `BZ-${year}-${paddedId}`
}

/**
 * Format price for display
 * Prices are stored in whole euros (not cents)
 */
function formatPrice(amount: number, currency: string = 'EUR'): string {
  const val = Number(amount) || 0
  if (currency?.toLowerCase() === 'all') {
    return `${val.toLocaleString('sq-AL')} Leke`
  }
  return `€${val.toFixed(2)}`
}

/**
 * Format date for display (Albanian format)
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sq-AL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Generate a PDF invoice for an order (Albanian format with VAT)
 * Matches the frontend invoice format exactly
 * @returns Buffer containing the PDF data
 */
export function generateInvoicePdf(data: InvoiceData): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 25
  const contentWidth = pageWidth - (margin * 2)

  // Colors (brand colors)
  const green = [106, 138, 85] as [number, number, number]
  const black = [0, 0, 0] as [number, number, number]
  const gray = [100, 100, 100] as [number, number, number]
  const lightGray = [200, 200, 200] as [number, number, number]

  let y = margin

  // Get tax rate based on country (AL=20%, XK=18%)
  const countryCode = data.shippingAddress.countryCode?.toUpperCase() || 'AL'
  const taxRate = countryCode === 'XK' ? 18 : 20

  // Calculate VAT (prices include VAT)
  const vatAmount = data.total - (data.total / (1 + taxRate / 100))

  // ============ HEADER - Company Name + Logo ============

  // Company name (on the left)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...green)
  doc.text('Baucis Zen', margin, y + 7)

  // Add actual PNG logo (on the right side)
  const logoSize = 15  // 15mm x 15mm
  const logoX = pageWidth - margin - logoSize  // Right side
  const logoY = y - 3  // Higher position
  doc.addImage(LOGO_BASE64, 'PNG', logoX, logoY, logoSize, logoSize)

  y += 15

  // Line separator
  doc.setDrawColor(...green)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)

  y += 12

  // ============ INVOICE TITLE ============

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...green)
  doc.text(`FATURE Nr. ${data.invoiceNumber}`, margin, y)

  doc.setTextColor(...gray)
  doc.setFontSize(10)
  doc.text(formatDate(data.createdAt), pageWidth - margin, y, { align: 'right' })

  y += 6

  // Order reference
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text(`Porosia: ${data.orderNumber}`, margin, y)

  y += 16

  // ============ FROM / TO ============

  const midX = pageWidth / 2

  // FROM
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('NGA:', margin, y)

  doc.setTextColor(...black)
  doc.setFontSize(10)
  y += 5
  doc.text('Baucis Zen SHPK', margin, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  y += 4
  doc.text('Rruga Bardhyl, Nr. 42', margin, y)
  y += 4
  doc.text('Tirane, 1001, Shqiperi', margin, y)
  y += 4
  doc.text('NIPT: L91234567A', margin, y)

  // TO (same line as FROM start)
  const toX = midX + 50
  let toY = y - 17
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('PER:', toX, toY)

  doc.setTextColor(...black)
  doc.setFontSize(10)
  toY += 5
  const name = `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`.trim() || 'Klient'
  doc.text(name, toX, toY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  if (data.shippingAddress.address1) {
    toY += 4
    doc.text(data.shippingAddress.address1, toX, toY)
  }
  if (data.shippingAddress.city) {
    toY += 4
    const cityLine = `${data.shippingAddress.city}${data.shippingAddress.postalCode ? ', ' + data.shippingAddress.postalCode : ''}, ${countryCode === 'XK' ? 'Kosove' : 'Shqiperi'}`
    doc.text(cityLine, toX, toY)
  }
  if (data.shippingAddress.phone) {
    toY += 4
    doc.text(data.shippingAddress.phone, toX, toY)
  }

  y += 20

  // ============ TABLE ============

  // Header with VAT column
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y - 4, contentWidth, 10, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text('ARTIKULLI', margin + 3, y + 2)
  doc.text('SASIA', margin + 65, y + 2)
  doc.text('CMIMI', margin + 85, y + 2)
  doc.text('TVSH', margin + 110, y + 2)
  doc.text('TOTALI', margin + 135, y + 2)

  y += 10

  // Items with VAT breakdown
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...black)

  for (const item of data.items) {
    let itemName = item.title || 'Produkt'
    if (itemName.length > 35) itemName = itemName.substring(0, 32) + '...'

    const itemTotal = (Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
    const itemPriceNoVat = itemTotal / (1 + taxRate / 100)
    const itemVat = itemTotal - itemPriceNoVat

    doc.text(itemName, margin + 3, y)
    doc.text(String(item.quantity), margin + 68, y)
    doc.text(formatPrice(itemPriceNoVat, data.currencyCode), margin + 85, y)
    doc.text(formatPrice(itemVat, data.currencyCode), margin + 110, y)
    doc.setFont('helvetica', 'bold')
    doc.text(formatPrice(itemTotal, data.currencyCode), margin + 135, y)
    doc.setFont('helvetica', 'normal')

    y += 8
  }

  // Line after items
  y += 2
  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)

  y += 12

  // ============ TOTALS ============

  const labelX = pageWidth - margin - 60
  const valueX = pageWidth - margin

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  // Subtotal
  doc.setTextColor(...gray)
  doc.text('Nentotali:', labelX, y)
  doc.setTextColor(...black)
  doc.text(formatPrice(data.subtotal, data.currencyCode), valueX, y, { align: 'right' })
  y += 6

  // Shipping
  doc.setTextColor(...gray)
  doc.text('Transporti:', labelX, y)
  doc.setTextColor(...black)
  doc.text(formatPrice(data.shippingTotal, data.currencyCode), valueX, y, { align: 'right' })
  y += 6

  // Discount
  if (data.discountTotal && data.discountTotal > 0) {
    doc.setTextColor(...gray)
    doc.text('Zbritje:', labelX, y)
    doc.setTextColor(34, 139, 34)
    doc.text('-' + formatPrice(data.discountTotal, data.currencyCode), valueX, y, { align: 'right' })
    y += 6
  }

  // VAT
  doc.setTextColor(...gray)
  doc.text(`TVSH (${taxRate}% perfshire):`, labelX, y)
  doc.setTextColor(...black)
  doc.text(formatPrice(vatAmount, data.currencyCode), valueX, y, { align: 'right' })
  y += 10

  // Total line
  doc.setDrawColor(...green)
  doc.setLineWidth(0.5)
  doc.line(labelX - 5, y - 3, valueX, y - 3)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...green)
  doc.text('TOTALI:', labelX, y + 3)
  doc.text(formatPrice(data.total, data.currencyCode), valueX, y + 3, { align: 'right' })

  // ============ FOOTER ============

  y = doc.internal.pageSize.getHeight() - 35

  doc.setDrawColor(...lightGray)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)

  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...gray)
  doc.text('Faleminderit qe zgjodhët Baucis Zen!', pageWidth / 2, y, { align: 'center' })

  y += 5
  doc.setFontSize(8)
  doc.text('Per pyetje: info@bauciszen.com | www.bauciszen.com', pageWidth / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(7)
  doc.text(`© ${new Date().getFullYear()} Baucis Zen SHPK. Te gjitha te drejtat e rezervuara.`, pageWidth / 2, y, { align: 'center' })

  // Return as Buffer
  const pdfOutput = doc.output('arraybuffer')
  return Buffer.from(pdfOutput)
}

/**
 * Cart discount info passed from email subscriber
 * (used when order metadata hasn't been updated yet)
 */
interface CartDiscount {
  discountAmount: number
  discountTier: string
}

/**
 * Generate invoice data from a Medusa order
 * Properly calculates totals including zen tier discount from metadata or cart
 * @param order - The Medusa order object
 * @param cartDiscount - Optional discount info from cart (used when order.metadata isn't set yet)
 */
export function orderToInvoiceData(order: any, cartDiscount?: CartDiscount): InvoiceData {
  const shippingAddress = order.shipping_address as any || {}

  // Get country code
  const countryCode = shippingAddress?.country_code?.toUpperCase() || 'AL'
  const countryNames: Record<string, string> = {
    AL: 'Shqiperi',
    XK: 'Kosove',
  }

  // Calculate items subtotal (items only)
  const itemsSubtotal = (order.items || []).reduce((sum: number, item: any) => {
    return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
  }, 0)

  // Get shipping - prioritize stored EUR price from metadata, then fallback to Medusa values
  const customShipping = (order.metadata as any)?.custom_shipping
  const shippingTotal = customShipping?.priceEUR ||
                        Number(order.shipping_methods?.[0]?.amount) ||
                        Number(order.shipping_total) || 0

  // Get discount - check in order: discount_total, order metadata, then cart metadata (fallback)
  const zenDiscount = (order.metadata as any)?.zen_tier_discount
  const discountTotal = Number(order.discount_total) ||
                        Number(zenDiscount?.amount) ||
                        Number(cartDiscount?.discountAmount) || 0

  // Helper to round to 2 decimal places (avoids floating-point precision issues)
  const round2 = (n: number) => Math.round(n * 100) / 100

  // Calculate total - apply discount from wherever we found it
  let total: number
  if (zenDiscount?.amount && !Number(order.discount_total)) {
    // Zen tier discount from order metadata
    total = round2((itemsSubtotal - Number(zenDiscount.amount)) + shippingTotal)
  } else if (cartDiscount?.discountAmount && !Number(order.discount_total) && !zenDiscount?.amount) {
    // Zen tier discount from cart metadata (when order metadata not yet set)
    total = round2((itemsSubtotal - cartDiscount.discountAmount) + shippingTotal)
  } else {
    // Use Medusa's total or calculate from components
    const summary = order.summary || {}
    total = round2(
      Number(summary.current_order_total) ||
      Number(order.total) ||
      (itemsSubtotal + shippingTotal - discountTotal)
    )
  }

  const displayId = String(order.display_id || order.id)
  const createdAt = order.created_at || new Date().toISOString()

  return {
    orderId: order.id,
    displayId,
    invoiceNumber: generateInvoiceNumber(displayId, createdAt),
    orderNumber: generateOrderNumber(displayId, createdAt),
    customerName: shippingAddress?.first_name || '',
    email: order.email || '',
    items: (order.items || []).map((item: any) => ({
      title: item.title || item.product_title || 'Product',
      quantity: item.quantity || 1,
      unit_price: Number(item.unit_price) || 0,
      thumbnail: item.thumbnail,
    })),
    subtotal: round2(itemsSubtotal),
    shippingTotal: round2(shippingTotal),
    discountTotal: round2(discountTotal),
    total,
    currencyCode: order.currency_code || 'EUR',
    shippingAddress: {
      firstName: shippingAddress?.first_name || '',
      lastName: shippingAddress?.last_name || '',
      address1: shippingAddress?.address_1 || '',
      address2: shippingAddress?.address_2 || '',
      city: shippingAddress?.city || '',
      postalCode: shippingAddress?.postal_code || '',
      country: countryNames[countryCode] || countryCode,
      countryCode,
      phone: shippingAddress?.phone || '',
    },
    createdAt,
    paymentMethod: (order.metadata as any)?.payment_method === 'cod' ? 'cod' : 'card',
  }
}
