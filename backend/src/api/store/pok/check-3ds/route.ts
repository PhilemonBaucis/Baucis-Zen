import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { check3dsEnrollment, isPokConfigured } from "../../../../lib/pok-payment"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"

interface Check3dsBody {
  cart_id: string
  credit_card_id: string
  sdk_order_id: string
}

/**
 * POST /store/pok/check-3ds
 *
 * Checks 3DS enrollment for a tokenized card.
 * Returns the 3DS step-up URL if authentication is required.
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

  const body = req.body as Check3dsBody

  if (!body.cart_id || !body.credit_card_id || !body.sdk_order_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      required: ["cart_id", "credit_card_id", "sdk_order_id"],
    })
  }

  try {
    const cartModule = req.scope.resolve(Modules.CART)

    // Retrieve cart to get the amount
    const cart = await cartModule.retrieveCart(body.cart_id, {
      relations: ["items"],
    })

    if (!cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found",
      })
    }

    // Verify POK order ID matches
    const storedOrderId = (cart.metadata as any)?.pok_order_id
    if (storedOrderId && storedOrderId !== body.sdk_order_id) {
      return res.status(400).json({
        success: false,
        error: "SDK order ID mismatch",
      })
    }

    // Calculate total amount
    const items = cart.items || []
    const itemsTotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1),
      0
    )
    const tierDiscount = (cart.metadata as any)?.zen_tier_discount?.amount || 0
    const shippingCost = (cart.metadata as any)?.shipping_cost || 0
    const totalAmount = itemsTotal - tierDiscount + shippingCost

    const currency = cart.currency_code?.toUpperCase() || "EUR"

    console.log(`[POK 3DS] Checking enrollment for order ${body.sdk_order_id}`)

    // Check 3DS enrollment
    const enrollment = await check3dsEnrollment(
      body.credit_card_id,
      body.sdk_order_id,
      totalAmount,
      currency
    )

    // Store 3DS info in cart metadata for the confirm step
    await cartModule.updateCarts([{
      id: body.cart_id,
      metadata: {
        ...(cart.metadata || {}),
        pok_3ds_status: enrollment.status,
        pok_credit_card_id: body.credit_card_id,
      },
    }])

    if (enrollment.status === 'PENDING_AUTHENTICATION' && enrollment.stepUp) {
      // 3DS authentication required - return step-up URL
      return res.status(200).json({
        success: true,
        requires_3ds: true,
        status: enrollment.status,
        step_up: {
          url: enrollment.stepUp.url,
          access_token: enrollment.stepUp.accessToken,
        },
      })
    }

    if (enrollment.status === 'AUTHENTICATION_SUCCESSFUL') {
      // 3DS not required or already authenticated
      return res.status(200).json({
        success: true,
        requires_3ds: false,
        status: enrollment.status,
      })
    }

    // Authentication failed
    return res.status(400).json({
      success: false,
      error: "3DS authentication failed",
      status: enrollment.status,
    })

  } catch (error: any) {
    console.error("[POK 3DS] Error:", error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to check 3DS enrollment",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
