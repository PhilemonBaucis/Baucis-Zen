import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../../middlewares/clerk-auth"
import { generateInvoicePdf, orderToInvoiceData } from "../../../../../lib/invoice-pdf-service"

/**
 * GET /store/orders/:id/invoice
 *
 * Generate and return a PDF invoice for an order.
 * Requires Clerk JWT token in Authorization header.
 * Only returns invoice if order belongs to authenticated customer.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Order ID is required",
    })
  }

  // Require valid Clerk authentication
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined
  )

  if (!authResult.authenticated) {
    return sendAuthError(res, authResult)
  }

  const clerkId = authResult.clerkId

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    const orderModule = req.scope.resolve(Modules.ORDER)

    // Find customer by clerk_id in metadata
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    const customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === clerkId
    )

    if (!customer) {
      return res.status(401).json({
        success: false,
        error: "Customer not found",
      })
    }

    // Find order - could be by id or display_id
    let order: any = null

    // First try direct retrieval by id
    try {
      order = await orderModule.retrieveOrder(id, {
        relations: ["items", "shipping_address", "shipping_methods", "summary"],
      })
    } catch {
      // If not found by id, search by display_id
      const [orders] = await orderModule.listAndCountOrders(
        { customer_id: customer.id },
        { relations: ["items", "shipping_address", "shipping_methods", "summary"] }
      )
      order = orders.find(
        (o: any) => o.display_id?.toString() === id || o.id?.includes(id)
      )
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Verify order belongs to authenticated customer
    if (order.customer_id !== customer.id) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to access this order",
      })
    }

    // Generate PDF invoice
    const invoiceData = orderToInvoiceData(order)
    const pdfBuffer = generateInvoicePdf(invoiceData)

    // Build filename: Fatura - CustomerName.pdf
    const shippingAddress = order.shipping_address as any
    const customerName = `${shippingAddress?.first_name || ''} ${shippingAddress?.last_name || ''}`.trim() || 'Klient'
    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9\s]/g, '')
    const filename = `Fatura - ${safeCustomerName}.pdf`

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    )
    res.setHeader("Content-Length", pdfBuffer.length)

    // Send PDF buffer
    return res.status(200).send(pdfBuffer)

  } catch (error: any) {
    console.error(`[Invoice] Error generating invoice for order ${id}:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to generate invoice",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
