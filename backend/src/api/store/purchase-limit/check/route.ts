import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { 
  DAILY_PURCHASE_LIMIT,
  applyRateLimit,
  getCartLimiter 
} from "../../../../lib/rate-limiter"
import { requireClerkAuth } from "../../../middlewares/clerk-auth"

interface CheckLimitBody {
  variant_id: string
  quantity: number
  cart_id?: string // Required for guests, optional for logged-in users
}

/**
 * POST /store/purchase-limit/check
 * 
 * Checks if a user can add the requested quantity of a product to cart.
 * 
 * The limit is enforced per cart - a user cannot have more than 10 units
 * of any single product in their cart at any time.
 * 
 * User Identification:
 * - Logged-in users: Uses clerk_id from JWT token
 * - Guest users: Uses cart_id from request body
 * 
 * Returns:
 * - allowed: Whether the addition is allowed
 * - remaining: How many more units can be added
 * - currentInCart: Units already in cart for this product
 * - limit: The per-product limit (10)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const body = req.body as CheckLimitBody

  // Validate required fields
  if (!body.variant_id) {
    return res.status(400).json({
      error: "variant_id is required",
    })
  }

  if (typeof body.quantity !== "number" || body.quantity < 1) {
    return res.status(400).json({
      error: "quantity must be a positive number",
    })
  }

  const { variant_id, quantity, cart_id } = body

  // Determine user identifier (for logging purposes)
  let userId: string = "unknown"

  const authHeader = req.headers.authorization as string | undefined
  if (authHeader) {
    const authResult = await requireClerkAuth(authHeader)
    if (authResult.authenticated && authResult.clerkId) {
      userId = authResult.clerkId
    } else if (cart_id) {
      userId = `guest:${cart_id}`
    }
  } else if (cart_id) {
    userId = `guest:${cart_id}`
  }

  // If no cart_id provided, we can't check cart contents
  if (!cart_id) {
    // Allow the request but with full limit (no cart to check)
    return res.status(200).json({
      allowed: quantity <= DAILY_PURCHASE_LIMIT,
      remaining: DAILY_PURCHASE_LIMIT,
      currentInCart: 0,
      limit: DAILY_PURCHASE_LIMIT,
      requestedQuantity: quantity,
    })
  }

  try {
    // Get the cart module to check current cart contents
    const cartModule = req.scope.resolve(Modules.CART)
    
    let currentInCart = 0
    
    try {
      const cart = await cartModule.retrieveCart(cart_id, {
        relations: ["items"],
      })
      
      // Find the item with this variant in the cart
      const existingItem = cart.items?.find(
        (item: any) => item.variant_id === variant_id
      )
      
      if (existingItem) {
        // Convert BigNumberValue to number
        currentInCart = typeof existingItem.quantity === 'number' 
          ? existingItem.quantity 
          : Number(existingItem.quantity)
      }
    } catch (cartError: any) {
      // Cart not found or error - proceed with 0 current quantity
      console.log(`[Purchase Limit Check] Could not retrieve cart ${cart_id}: ${cartError.message}`)
    }
    
    // Calculate remaining and check if allowed
    const remaining = Math.max(0, DAILY_PURCHASE_LIMIT - currentInCart)
    const allowed = quantity <= remaining

    return res.status(200).json({
      allowed,
      remaining,
      currentInCart,
      limit: DAILY_PURCHASE_LIMIT,
      requestedQuantity: quantity,
    })
  } catch (error: any) {
    console.error("[Purchase Limit Check] Error:", error.message)
    
    // Fail open - allow the purchase if there's an error
    return res.status(200).json({
      allowed: true,
      remaining: DAILY_PURCHASE_LIMIT,
      currentInCart: 0,
      limit: DAILY_PURCHASE_LIMIT,
      requestedQuantity: quantity,
      warning: "Could not verify limit - allowing purchase",
    })
  }
}
