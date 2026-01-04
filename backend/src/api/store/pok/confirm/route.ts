import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { confirmGuestPayment, isPokConfigured } from "../../../../lib/pok-payment"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"

interface ConfirmPaymentBody {
  cart_id: string
  sdk_order_id: string
  credit_card_id: string
  consumer_auth_info?: object
}

/**
 * POST /store/pok/confirm
 *
 * Confirms a POK payment after 3DS authentication (if required).
 * On success, stores POK transaction info in cart metadata.
 * The frontend should then call cart.complete() to finalize the Medusa order.
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

  const body = req.body as ConfirmPaymentBody

  if (!body.cart_id || !body.sdk_order_id || !body.credit_card_id) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
      required: ["cart_id", "sdk_order_id", "credit_card_id"],
    })
  }

  try {
    const cartModule = req.scope.resolve(Modules.CART)

    // Retrieve cart
    const cart = await cartModule.retrieveCart(body.cart_id)

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

    console.log(`[POK Confirm] Confirming payment for order ${body.sdk_order_id}`)

    // Confirm payment with POK
    const result = await confirmGuestPayment(
      body.sdk_order_id,
      body.credit_card_id,
      body.consumer_auth_info
    )

    if (!result.success) {
      console.error(`[POK Confirm] Payment failed: ${result.message}`)
      return res.status(400).json({
        success: false,
        error: "Payment failed",
        message: result.message,
      })
    }

    console.log(`[POK Confirm] Payment successful: transaction ${result.transactionId}`)

    // Store POK payment info in cart metadata
    // This will transfer to order metadata when cart is completed
    await cartModule.updateCarts([{
      id: body.cart_id,
      metadata: {
        ...(cart.metadata || {}),
        pok_payment: {
          transaction_id: result.transactionId,
          sdk_order_id: body.sdk_order_id,
          completed: true,
          completed_at: new Date().toISOString(),
        },
      },
    }])

    return res.status(200).json({
      success: true,
      transaction_id: result.transactionId,
      sdk_order_id: body.sdk_order_id,
      message: "Payment confirmed. Proceed to complete order.",
    })

  } catch (error: any) {
    console.error("[POK Confirm] Error:", error.message)

    // Check for common payment errors
    const isPaymentError = error.message?.includes('declined') ||
      error.message?.includes('insufficient') ||
      error.message?.includes('expired')

    return res.status(isPaymentError ? 400 : 500).json({
      success: false,
      error: isPaymentError ? "Payment declined" : "Failed to confirm payment",
      message: isPaymentError ? error.message : "Please try again",
    })
  }
}
