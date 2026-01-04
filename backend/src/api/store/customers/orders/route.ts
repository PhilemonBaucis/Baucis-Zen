import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getAuthLimiter } from "../../../../lib/rate-limiter"
import { sanitizeClerkId } from "../../../../lib/log-utils"

/**
 * GET /store/customers/orders
 *
 * Get orders for authenticated customer.
 * Requires Clerk JWT token in Authorization header.
 *
 * Query params:
 *   - limit: number (default 10, max 50)
 *   - offset: number (default 0)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting (20 requests per minute per IP)
  const rateLimitOk = await applyRateLimit(req, res, getAuthLimiter)
  if (!rateLimitOk) return

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
      console.log(`[Orders] Customer not found for ${sanitizeClerkId(clerkId)}`)
      return res.status(200).json({
        orders: [],
        count: 0,
        limit: 10,
        offset: 0,
      })
    }

    // Parse pagination params
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50)
    const offset = parseInt(req.query.offset as string) || 0

    // Retrieve orders for this customer with full relations
    const [orders, count] = await orderModule.listAndCountOrders(
      { customer_id: customer.id },
      {
        relations: ["items", "shipping_address", "shipping_methods", "summary"],
        order: { created_at: "DESC" },
        take: limit,
        skip: offset,
      }
    )

    // Map orders to response format with full details
    const ordersResponse = orders.map((order: any) => ({
      id: order.id,
      display_id: order.display_id,
      created_at: order.created_at,
      status: order.status,
      fulfillment_status: order.fulfillment_status,
      payment_status: order.payment_status,
      total: order.total,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      currency_code: order.currency_code,
      // Include summary for order totals
      summary: order.summary,
      // Include metadata for zen_tier_discount
      metadata: order.metadata,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        title: item.title || item.product_title,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      // Include full shipping address
      shipping_address: order.shipping_address ? {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        address_1: order.shipping_address.address_1,
        address_2: order.shipping_address.address_2,
        city: order.shipping_address.city,
        postal_code: order.shipping_address.postal_code,
        phone: order.shipping_address.phone,
        country_code: order.shipping_address.country_code,
      } : null,
      // Include shipping methods for shipping cost
      shipping_methods: (order.shipping_methods || []).map((sm: any) => ({
        id: sm.id,
        name: sm.name,
        amount: sm.amount,
      })),
    }))

    console.log(`[Orders] Retrieved ${orders.length} orders for customer ${customer.id.slice(0, 8)}...`)

    return res.status(200).json({
      orders: ordersResponse,
      count,
      limit,
      offset,
    })

  } catch (error: any) {
    console.error(`[Orders] Error fetching orders:`, error.message)
    return res.status(500).json({
      error: "Failed to fetch orders",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
