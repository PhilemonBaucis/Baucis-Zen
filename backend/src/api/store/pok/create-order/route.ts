import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createSdkOrder, isPokConfigured } from "../../../../lib/pok-payment"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"

interface CreateOrderBody {
  cart_id: string
  shipping_amount?: number  // EUR, from frontend customShipping.priceEUR
  discount_amount?: number  // EUR, from frontend tier discount
}

/**
 * POST /store/pok/create-order
 *
 * Creates a POK SDK Order for the cart total.
 * Must be called before tokenizing card and processing payment.
 *
 * Rate limited: 60 requests per minute (cart operations)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  // Check POK configuration
  if (!isPokConfigured()) {
    return res.status(503).json({
      success: false,
      error: "POK payments not configured",
    })
  }

  const body = req.body as CreateOrderBody

  if (!body.cart_id) {
    return res.status(400).json({
      success: false,
      error: "cart_id is required",
    })
  }

  try {
    const cartModule = req.scope.resolve(Modules.CART)

    // Retrieve cart with items
    const cart = await cartModule.retrieveCart(body.cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      })
    }

    // Calculate cart total (items + shipping)
    // Note: Medusa stores unit_price in whole euros (NOT cents) per CLAUDE.md
    const items = cart.items || []
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1),
      0
    )

    // Log what frontend sent
    console.log(`[POK] Request body: shipping_amount=${body.shipping_amount}, discount_amount=${body.discount_amount}`)
    console.log(`[POK] Cart metadata: shipping_cost=${(cart.metadata as any)?.shipping_cost}, zen_tier_discount=${JSON.stringify((cart.metadata as any)?.zen_tier_discount)}`)

    // Use request body values if provided, fallback to cart metadata
    // Frontend passes these since they exist in React state, not cart metadata
    const tierDiscount = body.discount_amount ?? (cart.metadata as any)?.zen_tier_discount?.amount ?? 0
    const shippingCost = body.shipping_amount ?? (cart.metadata as any)?.shipping_cost ?? 0

    const totalAmount = itemsTotal - tierDiscount + shippingCost

    console.log(`[POK] Cart calculation: itemsTotal=${itemsTotal}€, discount=${tierDiscount}€, shipping=${shippingCost}€, total=${totalAmount}€`)

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Cart total must be greater than 0",
      })
    }

    // Get currency from cart region or default to EUR
    const currency = cart.currency_code?.toUpperCase() || "EUR"

    console.log(`[POK] Creating order for cart ${body.cart_id}: ${totalAmount} ${currency}`)

    // Create POK SDK Order
    // Note: POK doesn't support separate shipping - only shows total amount
    const sdkOrder = await createSdkOrder(
      totalAmount,
      currency,
      body.cart_id,
      `Order for cart ${body.cart_id.substring(0, 8)}...`
    )

    // Store POK order ID in cart metadata for later reference
    await cartModule.updateCarts([{
      id: body.cart_id,
      metadata: {
        ...(cart.metadata || {}),
        pok_order_id: sdkOrder.id,
        pok_order_created_at: new Date().toISOString(),
      },
    }])

    return res.status(200).json({
      success: true,
      sdk_order_id: sdkOrder.id,
      amount: totalAmount,
      currency,
      expires_at: sdkOrder.expiresAt,
      confirm_url: sdkOrder._self.confirmUrl,
    })

  } catch (error: any) {
    console.error("[POK Create Order] Error:", error.message, error.stack)

    return res.status(500).json({
      success: false,
      error: "Failed to create POK order",
      // Include error details for debugging (remove in production if sensitive)
      details: error.message,
    })
  }
}
