import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../middlewares/clerk-auth"
import { calculateTier, getTierDiscount } from "../../../../lib/zen-points-config"
import { sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

interface SetZenPointsBody {
  clerk_id: string
  points: number
  dev_secret: string
}

/**
 * POST /store/customers/dev-zen-points
 * 
 * DEV/ADMIN: Manually set Zen Points for testing different tiers
 * Requires DEV_SECRET environment variable to match
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as SetZenPointsBody

  // Check dev secret
  const devSecret = process.env.DEV_SECRET
  if (!devSecret || body.dev_secret !== devSecret) {
    return res.status(403).json({
      error: "Invalid or missing dev secret",
    })
  }

  if (!body.clerk_id || typeof body.points !== "number" || body.points < 0) {
    return res.status(400).json({
      error: "clerk_id and points (non-negative number) are required",
    })
  }

  const { clerk_id, points } = body

  // Verify the user making the request owns this clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerk_id
  )

  if (!authResult.authenticated) {
    console.log(`[Dev Zen Points] ❌ Auth failed for ${sanitizeClerkId(clerk_id)}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Dev Zen Points] 🛠 Setting ${points} points for ${sanitizeClerkId(clerk_id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    const customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === clerk_id
    )

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    // Calculate tier based on new points
    const tier = calculateTier(points)
    const discount = getTierDiscount(tier)

    // Update customer metadata with new zen_points
    // IMPORTANT: Preserve cycle_start_date so the 30-day reset timer isn't affected
    const currentMetadata = (customer.metadata as Record<string, any>) || {}
    const existingZenPoints = currentMetadata.zen_points || {}
    const updatedMetadata = {
      ...currentMetadata,
      zen_points: {
        ...existingZenPoints,
        current_balance: points,
        tier,
        discount_percent: discount,
        lifetime_points: Math.max(points, existingZenPoints.lifetime_points || 0),
        // Keep existing cycle_start_date - don't reset the 30-day timer
      },
    }

    await customerModule.updateCustomers(customer.id, {
      metadata: updatedMetadata,
    })

    console.log(`[Dev Zen Points] ✅ Set ${points} pts (${tier}) for ${sanitizeCustomerId(customer.id)}`)

    return res.status(200).json({
      success: true,
      points,
      tier,
      discount,
      message: `Zen Points set to ${points} (${tier} tier, ${discount}% discount)`,
    })
  } catch (error: any) {
    console.error(`[Dev Zen Points] ❌ Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to set zen points",
    })
  }
}

