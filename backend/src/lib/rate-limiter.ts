/**
 * Redis-based Rate Limiting Infrastructure
 * Provides distributed rate limiting for API endpoints
 */

import Redis from "ioredis"
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Redis connection (lazy initialization)
let redisClient: Redis | null = null

function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL
    
    if (!redisUrl) {
      console.warn("[Rate Limiter] ⚠️ REDIS_URL not configured - rate limiting disabled")
      throw new Error("REDIS_URL not configured")
    }
    
    redisClient = new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null // Stop retrying after 3 attempts
        return Math.min(times * 100, 3000)
      },
    })
    
    redisClient.on("error", (err) => {
      console.error("[Rate Limiter] Redis error:", err.message)
    })
    
    redisClient.on("connect", () => {
      console.log("[Rate Limiter] ✅ Connected to Redis")
    })
  }
  
  return redisClient
}

// Rate limiter instances (lazy initialization)
let _authLimiter: RateLimiterRedis | null = null
let _sensitiveOpLimiter: RateLimiterRedis | null = null
let _addressLimiter: RateLimiterRedis | null = null
let _cartLimiter: RateLimiterRedis | null = null
let _webhookLimiter: RateLimiterRedis | null = null
let _gameLimiter: RateLimiterRedis | null = null
let _chatLimiter: RateLimiterRedis | null = null
let _phoneVerifyLimiter: RateLimiterRedis | null = null

/**
 * Auth operations limiter: 20 requests per minute
 * Used for: customer sync, login operations
 */
export function getAuthLimiter(): RateLimiterRedis {
  if (!_authLimiter) {
    _authLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:auth",
      points: 20,        // 20 requests
      duration: 60,      // per 60 seconds
      blockDuration: 60, // block for 1 minute if exceeded
    })
  }
  return _authLimiter
}

/**
 * Sensitive operations limiter: 5 requests per hour
 * Used for: account deletion
 */
export function getSensitiveOpLimiter(): RateLimiterRedis {
  if (!_sensitiveOpLimiter) {
    _sensitiveOpLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:sensitive",
      points: 5,           // 5 requests
      duration: 3600,      // per hour
      blockDuration: 3600, // block for 1 hour if exceeded
    })
  }
  return _sensitiveOpLimiter
}

/**
 * Address operations limiter: 30 requests per minute
 * Used for: address CRUD operations
 */
export function getAddressLimiter(): RateLimiterRedis {
  if (!_addressLimiter) {
    _addressLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:address",
      points: 30,        // 30 requests
      duration: 60,      // per minute
      blockDuration: 60, // block for 1 minute if exceeded
    })
  }
  return _addressLimiter
}

/**
 * Cart operations limiter: 60 requests per minute
 * Used for: cart merge, cart operations
 */
export function getCartLimiter(): RateLimiterRedis {
  if (!_cartLimiter) {
    _cartLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:cart",
      points: 60,        // 60 requests
      duration: 60,      // per minute
      blockDuration: 30, // block for 30 seconds if exceeded
    })
  }
  return _cartLimiter
}

/**
 * Webhook limiter: 100 requests per minute
 * Used for: Clerk webhooks (they can send bursts)
 */
export function getWebhookLimiter(): RateLimiterRedis {
  if (!_webhookLimiter) {
    _webhookLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:webhook",
      points: 100,       // 100 requests
      duration: 60,      // per minute
      blockDuration: 60, // block for 1 minute if exceeded
    })
  }
  return _webhookLimiter
}

/**
 * Game limiter: 30 requests per minute
 * Used for: Memory game operations (status, start, complete)
 */
export function getGameLimiter(): RateLimiterRedis {
  if (!_gameLimiter) {
    _gameLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:game",
      points: 30,        // 30 requests
      duration: 60,      // per minute
      blockDuration: 60, // block for 1 minute if exceeded
    })
  }
  return _gameLimiter
}

/**
 * Chat limiter: 20 requests per minute per user
 * Used for: AI support chat messages
 */
export function getChatLimiter(): RateLimiterRedis {
  if (!_chatLimiter) {
    _chatLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:chat",
      points: 20,        // 20 messages
      duration: 60,      // per minute
      blockDuration: 60, // block for 1 minute if exceeded
    })
  }
  return _chatLimiter
}

/**
 * Phone verification limiter: 5 requests per 10 minutes per phone number
 * Used for: SMS verification (prevent SMS bombing)
 */
export function getPhoneVerifyLimiter(): RateLimiterRedis {
  if (!_phoneVerifyLimiter) {
    _phoneVerifyLimiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "rl:phone",
      points: 5,          // 5 SMS requests
      duration: 600,      // per 10 minutes
      blockDuration: 600, // block for 10 minutes if exceeded
    })
  }
  return _phoneVerifyLimiter
}

/**
 * Extract client IP from request for rate limiting
 */
export function getClientIP(req: MedusaRequest): string {
  // Check common proxy headers
  const forwarded = req.headers["x-forwarded-for"]
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded
    return ips.split(",")[0].trim()
  }
  
  const realIP = req.headers["x-real-ip"]
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP
  }
  
  // Fallback to connection IP
  return req.ip || req.socket?.remoteAddress || "unknown"
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining?: number
  resetMs?: number
  error?: string
}

/**
 * Check rate limit for a given limiter and key
 * Returns { allowed: true } if request is allowed
 * Returns { allowed: false, remaining, resetMs } if rate limited
 */
export async function checkRateLimit(
  getLimiter: () => RateLimiterRedis,
  key: string
): Promise<RateLimitResult> {
  try {
    const limiter = getLimiter()
    const result = await limiter.consume(key)
    
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetMs: result.msBeforeNext,
    }
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetMs: error.msBeforeNext,
        error: "Rate limit exceeded",
      }
    }
    
    // Redis error - fail open (allow request but log)
    console.error("[Rate Limiter] Error checking rate limit:", error)
    return { allowed: true }
  }
}

/**
 * Apply rate limit and send 429 response if exceeded
 * Returns true if request should proceed, false if blocked
 */
export async function applyRateLimit(
  req: MedusaRequest,
  res: MedusaResponse,
  getLimiter: () => RateLimiterRedis,
  keyOverride?: string
): Promise<boolean> {
  const key = keyOverride || getClientIP(req)
  const result = await checkRateLimit(getLimiter, key)
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetMs || 60000) / 1000)
    
    res.set("Retry-After", String(retryAfter))
    res.set("X-RateLimit-Remaining", "0")
    res.set("X-RateLimit-Reset", String(Date.now() + (result.resetMs || 60000)))
    
    res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    })
    
    return false
  }
  
  // Set rate limit headers for successful requests
  if (result.remaining !== undefined) {
    res.set("X-RateLimit-Remaining", String(result.remaining))
  }
  
  return true
}

/**
 * Gracefully close Redis connection (for testing/shutdown)
 */
export async function closeRateLimiter(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    _authLimiter = null
    _sensitiveOpLimiter = null
    _addressLimiter = null
    _cartLimiter = null
    _webhookLimiter = null
    _gameLimiter = null
    _chatLimiter = null
    _phoneVerifyLimiter = null
  }
}

// ============================================================================
// DAILY PURCHASE LIMIT TRACKING
// Limits each user to 10 units per product per day
// ============================================================================

/** Maximum units per product per user per day */
export const DAILY_PURCHASE_LIMIT = 10

/** TTL for purchase tracking keys (48 hours to handle timezone edge cases) */
const PURCHASE_TRACKING_TTL = 48 * 60 * 60 // 48 hours in seconds

/**
 * Get today's date key in UTC (YYYY-MM-DD format)
 */
function getTodayKey(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Build Redis key for purchase tracking
 * Format: purchase:{userId}:{variantId}:{YYYY-MM-DD}
 */
function buildPurchaseKey(userId: string, variantId: string): string {
  return `purchase:${userId}:${variantId}:${getTodayKey()}`
}

/**
 * Purchase limit check result
 */
export interface PurchaseLimitResult {
  allowed: boolean
  currentlyPurchased: number
  remaining: number
  limit: number
  error?: string
}

/**
 * Get the number of units purchased today for a specific user and product
 * @param userId - User identifier (clerk_id for logged-in, cart_id for guests)
 * @param variantId - Product variant ID
 * @returns Number of units purchased today (0 if none)
 */
export async function getPurchasedToday(
  userId: string,
  variantId: string
): Promise<number> {
  try {
    const redis = getRedisClient()
    const key = buildPurchaseKey(userId, variantId)
    const value = await redis.get(key)
    return value ? parseInt(value, 10) : 0
  } catch (error) {
    console.error("[Purchase Limit] Error getting purchase count:", error)
    // Fail open - return 0 so user isn't blocked if Redis is down
    return 0
  }
}

/**
 * Check if a user can purchase the requested quantity
 * @param userId - User identifier (clerk_id for logged-in, cart_id for guests)
 * @param variantId - Product variant ID
 * @param requestedQuantity - Number of units user wants to add
 * @returns PurchaseLimitResult with allowed status and remaining quota
 */
export async function checkPurchaseLimit(
  userId: string,
  variantId: string,
  requestedQuantity: number
): Promise<PurchaseLimitResult> {
  try {
    const currentlyPurchased = await getPurchasedToday(userId, variantId)
    const remaining = Math.max(0, DAILY_PURCHASE_LIMIT - currentlyPurchased)
    const allowed = requestedQuantity <= remaining

    return {
      allowed,
      currentlyPurchased,
      remaining,
      limit: DAILY_PURCHASE_LIMIT,
    }
  } catch (error) {
    console.error("[Purchase Limit] Error checking limit:", error)
    // Fail open - allow purchase if Redis is down
    return {
      allowed: true,
      currentlyPurchased: 0,
      remaining: DAILY_PURCHASE_LIMIT,
      limit: DAILY_PURCHASE_LIMIT,
      error: "Could not verify limit - allowing purchase",
    }
  }
}

/**
 * Track a purchase by incrementing the daily counter
 * @param userId - User identifier (clerk_id for logged-in, cart_id for guests)
 * @param variantId - Product variant ID
 * @param quantity - Number of units purchased
 * @returns New total for today
 */
export async function trackPurchase(
  userId: string,
  variantId: string,
  quantity: number
): Promise<{ success: boolean; newTotal: number; error?: string }> {
  try {
    const redis = getRedisClient()
    const key = buildPurchaseKey(userId, variantId)
    
    // Increment by quantity and set TTL
    const newTotal = await redis.incrby(key, quantity)
    await redis.expire(key, PURCHASE_TRACKING_TTL)
    
    console.log(`[Purchase Limit] Tracked ${quantity} units for ${userId.substring(0, 8)}... variant ${variantId.substring(0, 8)}... (total today: ${newTotal})`)
    
    return { success: true, newTotal }
  } catch (error) {
    console.error("[Purchase Limit] Error tracking purchase:", error)
    return { 
      success: false, 
      newTotal: 0, 
      error: "Failed to track purchase" 
    }
  }
}

/**
 * Reduce the purchase count (used when items are removed from cart)
 * @param userId - User identifier
 * @param variantId - Product variant ID
 * @param quantity - Number of units to subtract
 * @returns New total for today
 */
export async function untrackPurchase(
  userId: string,
  variantId: string,
  quantity: number
): Promise<{ success: boolean; newTotal: number }> {
  try {
    const redis = getRedisClient()
    const key = buildPurchaseKey(userId, variantId)
    
    // Decrement by quantity (but don't go below 0)
    const current = await redis.get(key)
    const currentValue = current ? parseInt(current, 10) : 0
    const newTotal = Math.max(0, currentValue - quantity)
    
    if (newTotal > 0) {
      await redis.set(key, newTotal.toString())
      await redis.expire(key, PURCHASE_TRACKING_TTL)
    } else {
      await redis.del(key)
    }
    
    return { success: true, newTotal }
  } catch (error) {
    console.error("[Purchase Limit] Error untracking purchase:", error)
    return { success: false, newTotal: 0 }
  }
}
