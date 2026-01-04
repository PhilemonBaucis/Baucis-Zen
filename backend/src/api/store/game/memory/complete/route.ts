import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../../middlewares/clerk-auth"
import { applyRateLimit, getGameLimiter } from "../../../../../lib/rate-limiter"
import { 
  verifyGameCompletion,
  getNewCooldownEnd,
  GAME_WIN_POINTS,
  GameCard,
} from "../../../../../lib/game-utils"
import { 
  calculateTier, 
  getTierDiscount,
} from "../../../../../lib/zen-points-config"
import { sanitizeClerkId } from "../../../../../lib/log-utils"

interface CompleteGameBody {
  signature: string
  deck: GameCard[]
  nonce: string
  expires_at: string
  time_taken: number // seconds
}

interface MemoryGameMetadata {
  last_played_at?: string
  cooldown_ends_at?: string
  last_nonce?: string
  total_wins?: number
  game_started_at?: string
}

/**
 * POST /store/game/memory/complete
 * 
 * Completes a memory game and awards Zen Points if valid.
 * - Validates HMAC signature
 * - Checks expiry
 * - Verifies nonce hasn't been used
 * - Checks time limit (60 seconds)
 * - Awards +10 Zen Points on success
 * - Sets 24h cooldown
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 * 
 * Body:
 * - signature: string - the signature from game start
 * - deck: array - the original deck
 * - nonce: string - the nonce from game start
 * - expires_at: string - the expiry from game start
 * - time_taken: number - seconds taken to complete
 * 
 * Returns on success:
 * - success: true
 * - points_awarded: 10
 * - cooldown_ends_at: when next game available
 * - zen_points: updated zen points info
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
  const body = req.body as CompleteGameBody

  // Validate required fields
  if (!body.signature || !body.deck || !body.nonce || !body.expires_at || body.time_taken === undefined) {
    return res.status(400).json({
      error: "Missing required fields",
      message: "signature, deck, nonce, expires_at, and time_taken are required",
    })
  }

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

    // Verify nonce matches (prevents replay attacks)
    if (gameData.last_nonce !== body.nonce) {
      console.log(`[Memory Game] Nonce mismatch for ${sanitizeClerkId(clerkId)}: stored=${gameData.last_nonce?.substring(0,8)}... received=${body.nonce?.substring(0,8)}...`)
      return res.status(403).json({
        error: "Invalid game session",
        message: "This game session is no longer valid. Please start a new game.",
      })
    }
    
    console.log(`[Memory Game] Nonce verified for ${sanitizeClerkId(clerkId)}, time_taken: ${body.time_taken}s`)

    // Verify the game completion
    const verification = verifyGameCompletion(
      body.signature,
      body.deck,
      body.nonce,
      body.expires_at,
      body.time_taken
    )

    if (!verification.valid) {
      console.log(`[Memory Game] Verification failed for ${sanitizeClerkId(clerkId)}: ${verification.error}`)
      return res.status(403).json({
        error: "Game verification failed",
        message: verification.error,
      })
    }

    // Calculate new cooldown
    const cooldownEndsAt = getNewCooldownEnd()

    // Update Zen Points
    const currentZenPoints = metadata.zen_points || {
      current_balance: 0,
      tier: 'seed',
      discount_percent: 0,
      cycle_start_date: new Date().toISOString(),
      lifetime_points: 0,
    }

    const newBalance = (currentZenPoints.current_balance || 0) + GAME_WIN_POINTS
    const newLifetimePoints = (currentZenPoints.lifetime_points || 0) + GAME_WIN_POINTS
    const newTier = calculateTier(newBalance)
    const newDiscountPercent = getTierDiscount(newTier)

    // Update customer metadata
    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...metadata,
        zen_points: {
          ...currentZenPoints,
          current_balance: newBalance,
          tier: newTier,
          discount_percent: newDiscountPercent,
          lifetime_points: newLifetimePoints,
          last_game_award: GAME_WIN_POINTS,
          last_updated: new Date().toISOString(),
        },
        memory_game: {
          last_played_at: new Date().toISOString(),
          cooldown_ends_at: cooldownEndsAt,
          last_nonce: null, // Clear nonce to prevent replay
          total_wins: (gameData.total_wins || 0) + 1,
          last_win_time: body.time_taken,
        },
      },
    })

    console.log(`[Memory Game] Game completed by ${sanitizeClerkId(clerkId)}: +${GAME_WIN_POINTS} points, time: ${body.time_taken}s`)

    return res.status(200).json({
      success: true,
      points_awarded: GAME_WIN_POINTS,
      cooldown_ends_at: cooldownEndsAt,
      zen_points: {
        current_balance: newBalance,
        tier: newTier,
        discount_percent: newDiscountPercent,
        lifetime_points: newLifetimePoints,
      },
    })

  } catch (error: any) {
    console.error("[Memory Game] Complete error:", error.message)
    return res.status(500).json({
      error: "Failed to complete game",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

