import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { 
  trackPurchase,
  untrackPurchase,
  getPurchasedToday,
  DAILY_PURCHASE_LIMIT,
  applyRateLimit,
  getCartLimiter 
} from "../../../../lib/rate-limiter"
import { requireClerkAuth } from "../../../middlewares/clerk-auth"

interface TrackPurchaseBody {
  variant_id: string
  quantity: number
  cart_id?: string // Required for guests
  action?: "add" | "remove" | "set" // Default: "add"
}

/**
 * POST /store/purchase-limit/track
 * 
 * Records a purchase after successful cart addition.
 * 
 * Actions:
 * - "add": Increment the daily counter (default)
 * - "remove": Decrement the counter (when items removed from cart)
 * - "set": Set the counter to exact value (for sync corrections)
 * 
 * User Identification:
 * - Logged-in users: Uses clerk_id from JWT token
 * - Guest users: Uses cart_id from request body
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const body = req.body as TrackPurchaseBody

  // Validate required fields
  if (!body.variant_id) {
    return res.status(400).json({
      error: "variant_id is required",
    })
  }

  if (typeof body.quantity !== "number" || body.quantity < 0) {
    return res.status(400).json({
      error: "quantity must be a non-negative number",
    })
  }

  const { variant_id, quantity, cart_id, action = "add" } = body

  // Determine user identifier
  let userId: string

  // Try to get authenticated user first
  const authHeader = req.headers.authorization as string | undefined
  if (authHeader) {
    const authResult = await requireClerkAuth(authHeader)
    if (authResult.authenticated && authResult.clerkId) {
      userId = authResult.clerkId
    } else if (cart_id) {
      // Auth failed but cart_id provided - use as guest
      userId = `guest:${cart_id}`
    } else {
      return res.status(400).json({
        error: "cart_id is required for guest users",
      })
    }
  } else if (cart_id) {
    // No auth header - use cart_id for guest
    userId = `guest:${cart_id}`
  } else {
    return res.status(400).json({
      error: "Either authorization header or cart_id is required",
    })
  }

  try {
    let result: { success: boolean; newTotal: number; error?: string }

    switch (action) {
      case "remove":
        result = await untrackPurchase(userId, variant_id, quantity)
        break
      case "add":
      default:
        result = await trackPurchase(userId, variant_id, quantity)
        break
    }

    if (!result.success) {
      console.error(`[Purchase Limit Track] Failed to ${action} purchase:`, result.error)
    }

    const remaining = Math.max(0, DAILY_PURCHASE_LIMIT - result.newTotal)

    return res.status(200).json({
      success: result.success,
      newTotal: result.newTotal,
      remaining,
      limit: DAILY_PURCHASE_LIMIT,
    })
  } catch (error: any) {
    console.error("[Purchase Limit Track] Error:", error.message)
    
    return res.status(500).json({
      success: false,
      error: "Failed to track purchase",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal error",
    })
  }
}

/**
 * GET /store/purchase-limit/track
 * 
 * Get current purchase count for a user and product.
 * Query params: variant_id, cart_id (for guests)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const variant_id = req.query.variant_id as string
  const cart_id = req.query.cart_id as string

  if (!variant_id) {
    return res.status(400).json({
      error: "variant_id query parameter is required",
    })
  }

  // Determine user identifier
  let userId: string

  const authHeader = req.headers.authorization as string | undefined
  if (authHeader) {
    const authResult = await requireClerkAuth(authHeader)
    if (authResult.authenticated && authResult.clerkId) {
      userId = authResult.clerkId
    } else if (cart_id) {
      userId = `guest:${cart_id}`
    } else {
      return res.status(400).json({
        error: "cart_id is required for guest users",
      })
    }
  } else if (cart_id) {
    userId = `guest:${cart_id}`
  } else {
    return res.status(400).json({
      error: "Either authorization header or cart_id is required",
    })
  }

  try {
    const currentlyPurchased = await getPurchasedToday(userId, variant_id)
    const remaining = Math.max(0, DAILY_PURCHASE_LIMIT - currentlyPurchased)

    return res.status(200).json({
      currentlyPurchased,
      remaining,
      limit: DAILY_PURCHASE_LIMIT,
    })
  } catch (error: any) {
    console.error("[Purchase Limit Track GET] Error:", error.message)
    
    return res.status(200).json({
      currentlyPurchased: 0,
      remaining: DAILY_PURCHASE_LIMIT,
      limit: DAILY_PURCHASE_LIMIT,
      warning: "Could not retrieve limit data",
    })
  }
}



