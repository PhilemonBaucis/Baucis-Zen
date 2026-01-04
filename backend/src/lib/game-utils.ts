/**
 * Memory Game Utilities
 * HMAC signature generation/verification and deck management
 */

import crypto from "crypto"

// 9 Zen-themed card types for the memory game (6x3 grid = 18 cards = 9 pairs)
export const ZEN_CARD_TYPES = [
  "lotus",      // Lotus flower
  "bamboo",     // Bamboo stalks
  "tea",        // Tea cup
  "yinyang",    // Yin-yang symbol
  "wave",       // Ocean wave
  "mountain",   // Mountain/zen garden
  "moon",       // Crescent moon
  "leaf",       // Ginkgo leaf
  "bonsai",     // Bonsai tree
] as const

export type ZenCardType = typeof ZEN_CARD_TYPES[number]

export interface GameCard {
  id: string
  pairId: string
  type: ZenCardType
}

export interface GameDeck {
  cards: GameCard[]
  nonce: string
  expiresAt: string
}

export interface SignedDeck {
  deck: GameCard[]
  signature: string
  expires_at: string
  nonce: string
}

/**
 * Get the secret key for HMAC operations
 * Reuses COOKIE_SECRET to avoid adding new env vars
 */
function getSecret(): string {
  const secret = process.env.COOKIE_SECRET
  if (!secret) {
    throw new Error("COOKIE_SECRET not configured")
  }
  return secret
}

/**
 * Generate a cryptographic nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Generate HMAC-SHA256 signature for game data
 */
export function generateSignature(data: object): string {
  const secret = getSecret()
  const payload = JSON.stringify(data)
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
}

/**
 * Verify HMAC-SHA256 signature
 */
export function verifySignature(data: object, signature: string): boolean {
  const expectedSignature = generateSignature(data)
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generate a shuffled deck of 18 cards (9 pairs)
 */
export function generateDeck(): GameCard[] {
  const cards: GameCard[] = []
  
  // Create pairs for each card type
  ZEN_CARD_TYPES.forEach((type, index) => {
    const pairId = `pair_${index}`
    
    // First card of the pair
    cards.push({
      id: `card_${index}_a`,
      pairId,
      type,
    })
    
    // Second card of the pair
    cards.push({
      id: `card_${index}_b`,
      pairId,
      type,
    })
  })
  
  // Shuffle the deck
  return shuffleArray(cards)
}

/**
 * Create a signed deck for the game
 * @param expiryMinutes How long the deck is valid (default 5 minutes)
 */
export function createSignedDeck(expiryMinutes: number = 5): SignedDeck {
  const deck = generateDeck()
  const nonce = generateNonce()
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
  
  // Create signature payload
  const signaturePayload = {
    deck: deck.map(c => ({ id: c.id, pairId: c.pairId, type: c.type })),
    nonce,
    exp: expiresAt,
  }
  
  const signature = generateSignature(signaturePayload)
  
  return {
    deck,
    signature,
    expires_at: expiresAt,
    nonce,
  }
}

/**
 * Verify a completed game
 * @param signature The signature from the game start
 * @param deck The original deck
 * @param nonce The nonce from the game start
 * @param expiresAt The expiry time from the game start
 * @param timeTakenSeconds How long the player took
 */
export function verifyGameCompletion(
  signature: string,
  deck: GameCard[],
  nonce: string,
  expiresAt: string,
  timeTakenSeconds: number
): { valid: boolean; error?: string } {
  // Check if game expired
  if (new Date(expiresAt) < new Date()) {
    return { valid: false, error: "Game session expired" }
  }
  
  // Check time limit (60 seconds)
  if (timeTakenSeconds > 60) {
    return { valid: false, error: "Time limit exceeded (60 seconds)" }
  }
  
  // Verify signature
  const signaturePayload = {
    deck: deck.map(c => ({ id: c.id, pairId: c.pairId, type: c.type })),
    nonce,
    exp: expiresAt,
  }
  
  try {
    if (!verifySignature(signaturePayload, signature)) {
      return { valid: false, error: "Invalid game signature" }
    }
  } catch (e) {
    return { valid: false, error: "Signature verification failed" }
  }
  
  return { valid: true }
}

/**
 * Check if cooldown has passed (24 hours)
 */
export function checkCooldown(cooldownEndsAt: string | null | undefined): {
  canPlay: boolean
  cooldownEndsAt: string | null
  remainingMs: number
} {
  if (!cooldownEndsAt) {
    return { canPlay: true, cooldownEndsAt: null, remainingMs: 0 }
  }
  
  const cooldownEnd = new Date(cooldownEndsAt)
  const now = new Date()
  
  if (cooldownEnd <= now) {
    return { canPlay: true, cooldownEndsAt: null, remainingMs: 0 }
  }
  
  return {
    canPlay: false,
    cooldownEndsAt: cooldownEnd.toISOString(),
    remainingMs: cooldownEnd.getTime() - now.getTime(),
  }
}

/**
 * Calculate new cooldown end time (24 hours from now)
 */
export function getNewCooldownEnd(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Game points awarded on win
 */
export const GAME_WIN_POINTS = 10

