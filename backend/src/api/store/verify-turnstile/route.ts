import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyRateLimit, getCartLimiter } from "../../../lib/rate-limiter"

interface TurnstileVerifyBody {
  token: string
}

interface TurnstileResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  "error-codes"?: string[]
  action?: string
  cdata?: string
}

/**
 * POST /store/verify-turnstile
 * 
 * Verifies a Cloudflare Turnstile token for bot protection.
 * Used for guest checkout to prevent fake order spam.
 * 
 * Rate limited: 60 requests per minute (cart operations)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const body = req.body as TurnstileVerifyBody

  if (!body.token) {
    return res.status(400).json({
      success: false,
      error: "Turnstile token is required",
    })
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY

  // In development without secret key, pass through
  if (!secretKey) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Turnstile] ⚠️ No TURNSTILE_SECRET_KEY configured - verification disabled in dev mode")
      return res.status(200).json({
        success: true,
        message: "Verification bypassed in development",
      })
    }
    
    console.error("[Turnstile] ❌ TURNSTILE_SECRET_KEY not configured in production")
    return res.status(500).json({
      success: false,
      error: "Bot verification not configured",
    })
  }

  try {
    // Get client IP for additional verification
    const ip = req.headers["x-forwarded-for"] 
      ? (Array.isArray(req.headers["x-forwarded-for"]) 
          ? req.headers["x-forwarded-for"][0] 
          : req.headers["x-forwarded-for"].split(",")[0].trim())
      : req.ip || req.socket?.remoteAddress

    const formData = new URLSearchParams()
    formData.append("secret", secretKey)
    formData.append("response", body.token)
    if (ip) {
      formData.append("remoteip", ip)
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    )

    if (!response.ok) {
      console.error("[Turnstile] ❌ API request failed:", response.status)
      return res.status(500).json({
        success: false,
        error: "Bot verification service unavailable",
      })
    }

    const data: TurnstileResponse = await response.json()

    if (!data.success) {
      console.log("[Turnstile] ❌ Verification failed:", data["error-codes"]?.join(", "))
      return res.status(403).json({
        success: false,
        error: "Bot verification failed",
        code: "TURNSTILE_FAILED",
      })
    }

    console.log("[Turnstile] ✅ Verified successfully")

    return res.status(200).json({
      success: true,
      message: "Verification successful",
    })
  } catch (error: any) {
    console.error("[Turnstile] ❌ Error:", error.message)

    return res.status(500).json({
      success: false,
      error: "Bot verification failed",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

