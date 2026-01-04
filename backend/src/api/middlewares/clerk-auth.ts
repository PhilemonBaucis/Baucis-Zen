import { verifyToken } from "@clerk/backend"
import { MedusaRequest } from "@medusajs/framework/http"

interface ClerkTokenPayload {
  sub: string // Clerk user ID
  sid: string // Session ID
  iat: number // Issued at
  exp: number // Expiration
  nbf: number // Not before
  azp?: string // Authorized party (origin)
}

/**
 * Verify a Clerk session token from the Authorization header
 * 
 * @param authHeader - The Authorization header value (e.g., "Bearer xxx")
 * @returns The decoded token payload if valid, null otherwise
 */
export async function verifyClerkToken(
  authHeader: string | undefined
): Promise<ClerkTokenPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.split(" ")[1]

  if (!token) {
    return null
  }

  const secretKey = process.env.CLERK_SECRET_KEY

  if (!secretKey) {
    console.error("[Clerk Auth] ❌ CLERK_SECRET_KEY environment variable is not set")
    return null
  }

  try {
    const payload = await verifyToken(token, {
      secretKey,
    })

    return payload as ClerkTokenPayload
  } catch (error: any) {
    // Don't log detailed errors in production for security
    if (process.env.NODE_ENV === "development") {
      console.error("[Clerk Auth] Token verification failed:", error.message)
    }
    return null
  }
}

/**
 * Extract Clerk user ID from the Authorization header
 * Returns null if token is invalid or missing
 * 
 * @param authHeader - The Authorization header value
 * @returns The Clerk user ID (sub claim) if valid, null otherwise
 */
export async function getClerkUserId(
  authHeader: string | undefined
): Promise<string | null> {
  const payload = await verifyClerkToken(authHeader)
  return payload?.sub || null
}

/**
 * Authentication result types
 */
export type AuthSuccess = {
  authenticated: true
  clerkId: string
}

export type AuthFailure = {
  authenticated: false
  error: string
  status: 401 | 403
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Require valid Clerk JWT authentication
 * 
 * Use this for endpoints that MUST have a valid authenticated user.
 * Unlike getClerkUserId which returns null, this provides detailed errors.
 * 
 * @param authHeader - The Authorization header value
 * @param expectedClerkId - Optional: verify the token belongs to this specific user
 * @returns AuthResult with either { authenticated: true, clerkId } or { authenticated: false, error, status }
 */
export async function requireClerkAuth(
  authHeader: string | undefined,
  expectedClerkId?: string
): Promise<AuthResult> {
  // Check for Authorization header
  if (!authHeader) {
    return {
      authenticated: false,
      error: "Authorization header required",
      status: 401,
    }
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      authenticated: false,
      error: "Invalid authorization format. Expected: Bearer <token>",
      status: 401,
    }
  }

  // Verify the token
  const clerkId = await getClerkUserId(authHeader)

  if (!clerkId) {
    return {
      authenticated: false,
      error: "Invalid or expired authentication token",
      status: 401,
    }
  }

  // If an expected clerk ID is provided, verify it matches
  if (expectedClerkId && clerkId !== expectedClerkId) {
    return {
      authenticated: false,
      error: "Token does not match the requested user",
      status: 403,
    }
  }

  return {
    authenticated: true,
    clerkId,
  }
}

/**
 * Extract client IP from request for rate limiting
 * Checks common proxy headers and falls back to connection IP
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
 * Helper to send auth error response
 * Use with requireClerkAuth result
 */
export function sendAuthError(
  res: any, // MedusaResponse type
  authResult: AuthFailure
): void {
  res.status(authResult.status).json({
    error: authResult.error,
  })
}
