import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../../middlewares/clerk-auth"
import { applyRateLimit, getGameLimiter } from "../../../../../lib/rate-limiter"
import { 
  createSignedDeck, 
  checkCooldown,
  getNewCooldownEnd,
} from "../../../../../lib/game-utils"
import { sanitizeClerkId } from "../../../../../lib/log-utils"

interface MemoryGameMetadata {
  last_played_at?: string
  cooldown_ends_at?: string
  last_nonce?: string
  total_wins?: number
}

/**
 * POST /store/game/memory/start
 * 
 * Starts a new memory game session.
 * - Checks 24h cooldown
 * - Generates shuffled deck server-side
 * - Creates HMAC signature for anti-tamper
 * - Stores nonce in customer metadata
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 * 
 * Returns:
 * - deck: array of cards with {id, pairId, type}
 * - signature: HMAC signature for verification
 * - expires_at: when the game session expires (5 minutes)
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

    // Check cooldown
    const cooldownStatus = checkCooldown(gameData.cooldown_ends_at)

    if (!cooldownStatus.canPlay) {
      console.log(`[Memory Game] Cooldown active for ${sanitizeClerkId(clerkId)}, ends at ${cooldownStatus.cooldownEndsAt}`)
      return res.status(429).json({
        error: "Cooldown active",
        message: "You can only play once every 24 hours",
        cooldown_ends_at: cooldownStatus.cooldownEndsAt,
        remaining_ms: cooldownStatus.remainingMs,
      })
    }

    // Generate signed deck (5 minute expiry)
    const signedDeck = createSignedDeck(5)
    
    // Set cooldown immediately when game starts (one game per 24h, win or lose)
    const cooldownEndsAt = getNewCooldownEnd()

    // Store the nonce and set cooldown in customer metadata
    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...metadata,
        memory_game: {
          ...gameData,
          last_nonce: signedDeck.nonce,
          game_started_at: new Date().toISOString(),
          cooldown_ends_at: cooldownEndsAt,
        },
      },
    })

    console.log(`[Memory Game] Game started for ${sanitizeClerkId(clerkId)}, expires at ${signedDeck.expires_at}`)

    return res.status(200).json({
      deck: signedDeck.deck,
      signature: signedDeck.signature,
      expires_at: signedDeck.expires_at,
      nonce: signedDeck.nonce,
      cooldown_ends_at: cooldownEndsAt,
    })

  } catch (error: any) {
    console.error("[Memory Game] Start error:", error.message)
    return res.status(500).json({
      error: "Failed to start game",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

