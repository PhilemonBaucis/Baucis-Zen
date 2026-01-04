import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { checkCartForBackorders, CartItemForBackorderCheck } from "../../../../lib/stock-config"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"
import { sanitizeCartId } from "../../../../lib/log-utils"
import { isPokConfigured } from "../../../../lib/pok-payment"

interface PaymentProvider {
  id: string
  name: string
  available: boolean
  reason?: string
}

interface PaymentRestriction {
  provider: string
  reason: string
  details?: {
    items?: Array<{
      id: string
      title: string
      backorderQty: number
    }>
    message?: string
  }
}

interface PhoneVerificationStatus {
  verified: boolean
  phone?: string
  verified_at?: string
}

/**
 * GET /store/payment/available
 * 
 * Returns available payment methods for a cart, taking into account:
 * - Pre-order/backorder items (COD not allowed)
 * - Region payment providers
 * 
 * Rate limited: 60 requests per minute (cart operations)
 * 
 * Query params:
 *   - cart_id: The cart ID to check
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const cartId = req.query.cart_id as string

  if (!cartId) {
    return res.status(400).json({
      error: "cart_id query parameter is required",
    })
  }

  try {
    const cartModule = req.scope.resolve(Modules.CART)

    // Retrieve cart with items, variant info, and shipping address
    const cart = await cartModule.retrieveCart(cartId, {
      relations: ["items", "items.variant", "shipping_address"],
    })

    if (!cart) {
      return res.status(404).json({
        error: "Cart not found",
      })
    }

    // Check for backorder items
    const cartItems: CartItemForBackorderCheck[] = (cart.items || []).map((item: any) => ({
      id: item.id,
      title: item.title || item.variant?.title || "Unknown",
      quantity: item.quantity,
      variant: {
        inventory_quantity: item.variant?.inventory_quantity,
        allow_backorder: item.variant?.allow_backorder,
      },
    }))

    const backorderResult = checkCartForBackorders(cartItems)

    // Check phone verification status from cart metadata
    const cartMetadata = cart.metadata || {}
    const phoneVerification: PhoneVerificationStatus = {
      verified: cartMetadata.phone_verified === true,
      phone: cartMetadata.verified_phone as string | undefined,
      verified_at: cartMetadata.phone_verified_at as string | undefined,
    }

    // Build provider list
    const providers: PaymentProvider[] = []
    const restrictions: PaymentRestriction[] = []

    // Phone verification is required for all payment methods
    const phoneVerified = phoneVerification.verified

    // Cash on Delivery - requires phone verification AND no backorder items
    const codAvailable = phoneVerified && !backorderResult.hasBackorder
    providers.push({
      id: "pp_system_default",
      name: "Cash on Delivery",
      available: codAvailable,
      reason: !phoneVerified ? "phone_not_verified" : (!codAvailable ? "preorder_items" : undefined),
    })

    if (!phoneVerified) {
      restrictions.push({
        provider: "pp_system_default",
        reason: "phone_not_verified",
        details: {
          message: "Phone number must be verified before placing order",
        },
      })
    } else if (!codAvailable) {
      restrictions.push({
        provider: "pp_system_default",
        reason: "preorder_items",
        details: {
          items: backorderResult.preOrderItems.map((item) => ({
            id: item.id,
            title: item.title,
            backorderQty: item.backorderQty,
          })),
        },
      })
    }

    // Card payment (Stripe) - requires phone verification
    const stripeAvailable = phoneVerified
    providers.push({
      id: "stripe",
      name: "Credit / Debit Card",
      available: stripeAvailable,
      reason: !stripeAvailable ? "phone_not_verified" : undefined,
    })

    if (!phoneVerified) {
      restrictions.push({
        provider: "stripe",
        reason: "phone_not_verified",
        details: {
          message: "Phone number must be verified before placing order",
        },
      })
    }

    // POK Pay - Albania/Kosovo only, requires phone verification
    // Check if shipping address is in AL or XK
    const shippingCountry = cart.shipping_address?.country_code?.toUpperCase()
    const isAlbaniaOrKosovo = shippingCountry === 'AL' || shippingCountry === 'XK'
    const pokConfigured = isPokConfigured()
    const pokAvailable = phoneVerified && isAlbaniaOrKosovo && pokConfigured

    if (pokConfigured) {
      providers.push({
        id: "pok",
        name: "POK Pay",
        available: pokAvailable,
        reason: !phoneVerified
          ? "phone_not_verified"
          : !isAlbaniaOrKosovo
            ? "region_not_supported"
            : undefined,
      })

      if (!phoneVerified) {
        restrictions.push({
          provider: "pok",
          reason: "phone_not_verified",
          details: {
            message: "Phone number must be verified before placing order",
          },
        })
      } else if (!isAlbaniaOrKosovo) {
        restrictions.push({
          provider: "pok",
          reason: "region_not_supported",
          details: {
            message: "POK Pay is only available for Albania and Kosovo",
          },
        })
      }
    }

    return res.status(200).json({
      success: true,
      cartId: cart.id,
      providers,
      restrictions,
      phoneVerification,
      backorderInfo: {
        hasBackorder: backorderResult.hasBackorder,
        hasPreOrder: backorderResult.hasPreOrder,
        itemCount: backorderResult.preOrderItems.length,
      },
    })
  } catch (error: any) {
    console.error("[Payment Available] Error:", error.message)

    return res.status(500).json({
      error: "Failed to check payment availability",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
