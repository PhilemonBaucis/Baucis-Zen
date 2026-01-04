import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../../middlewares/clerk-auth"
import { applyRateLimit, getGameLimiter } from "../../../../../lib/rate-limiter"
import { checkCooldown } from "../../../../../lib/game-utils"
import { sanitizeClerkId } from "../../../../../lib/log-utils"

interface MemoryGameMetadata {
  last_played_at?: string
  cooldown_ends_at?: string
  last_nonce?: string
  total_wins?: number
}

/**
 * GET /store/game/memory/status
 * 
 * Returns the current game status for the authenticated user.
 * - can_play: boolean - whether user can start a new game
 * - cooldown_ends_at: string | null - when cooldown ends (if active)
 * - last_played_at: string | null - when user last played
 * - total_wins: number - total games won
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getGameLimiter)
  if (!rateLimitOk) return

  // Require valid JWT token
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined
  )

  if (!authResult.authenticated) {
    return sendAuthError(res, authResult)
  }

  const clerkId = authResult.clerkId

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    const customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === clerkId
    )

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        message: "Please sync your account first",
      })
    }

    const metadata = customer.metadata as Record<string, any> || {}
    const gameData: MemoryGameMetadata = metadata.memory_game || {}

    // Check cooldown status
    const cooldownStatus = checkCooldown(gameData.cooldown_ends_at)

    console.log(`[Memory Game] Status check for ${sanitizeClerkId(clerkId)}: can_play=${cooldownStatus.canPlay}`)

    return res.status(200).json({
      can_play: cooldownStatus.canPlay,
      cooldown_ends_at: cooldownStatus.cooldownEndsAt,
      last_played_at: gameData.last_played_at || null,
      total_wins: gameData.total_wins || 0,
    })

  } catch (error: any) {
    console.error("[Memory Game] Status error:", error.message)
    return res.status(500).json({
      error: "Failed to get game status",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

