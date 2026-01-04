import { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { checkCartForBackorders, CartItemForBackorderCheck } from "../../lib/stock-config"

/**
 * Middleware to validate payment method is allowed for cart contents.
 * 
 * This prevents Cash on Delivery from being used for pre-order/backorder items.
 * Applied to cart completion/checkout routes.
 */
export async function validatePaymentMethod(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  // Only validate on payment-related operations
  // This middleware should be applied to specific routes
  
  try {
    const cartId = req.params.id || (req.body as any)?.cart_id
    const providerId = (req.body as any)?.provider_id

    // If no cart ID or provider, skip validation
    if (!cartId || !providerId) {
      return next()
    }

    // Only validate COD (pp_system_default)
    if (providerId !== "pp_system_default") {
      return next()
    }

    const cartModule = req.scope.resolve(Modules.CART)

    // Retrieve cart with items
    const cart = await cartModule.retrieveCart(cartId, {
      relations: ["items", "items.variant"],
    })

    if (!cart) {
      return next()
    }

    // Check for backorder items
    const cartItems: CartItemForBackorderCheck[] = (cart.items || []).map((item: any) => ({
      id: item.id,
      title: item.title || "Unknown",
      quantity: item.quantity,
      variant: {
        inventory_quantity: item.variant?.inventory_quantity,
        allow_backorder: item.variant?.allow_backorder,
      },
    }))

    const backorderResult = checkCartForBackorders(cartItems)

    // If cart has backorder items, reject COD
    if (backorderResult.hasBackorder) {
      console.log(`[Payment Validation] Rejected COD for cart ${cartId} - contains backorder items`)
      
      return res.status(400).json({
        error: "Payment method not allowed",
        message: "Cash on Delivery is not available for pre-order or backorder items",
        code: "COD_NOT_ALLOWED_FOR_PREORDER",
        details: {
          preOrderItems: backorderResult.preOrderItems.map((item) => ({
            title: item.title,
            backorderQty: item.backorderQty,
          })),
        },
      })
    }

    return next()
  } catch (error: any) {
    console.error("[Payment Validation] Error:", error.message)
    // Don't block on validation errors - let the request proceed
    return next()
  }
}

/**
 * Middleware configuration for Medusa v2
 * Export this to be used in route configuration
 */
export const paymentValidationMiddleware = {
  matcher: "/store/carts/:id/payment-sessions",
  method: ["POST"],
  handler: validatePaymentMethod,
}

