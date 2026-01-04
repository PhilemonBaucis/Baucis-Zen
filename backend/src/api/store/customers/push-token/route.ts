import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError, getClerkUserId } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getAuthLimiter } from "../../../../lib/rate-limiter"
import { sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

interface PushTokenBody {
  push_token: string
}

/**
 * POST /store/customers/push-token
 *
 * Updates the customer's push notification token.
 * Used by mobile apps to enable push notifications.
 *
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAuthLimiter)
  if (!rateLimitOk) return

  const body = req.body as PushTokenBody

  // Validate required fields
  if (!body.push_token) {
    return res.status(400).json({
      error: "push_token is required",
    })
  }

  const { push_token } = body

  // Verify Clerk auth and get clerk_id from token
  const clerkId = await getClerkUserId(req.headers.authorization as string | undefined)

  if (!clerkId) {
    console.log(`[Push Token] ❌ No valid Clerk token provided`)
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid Clerk JWT token required",
    })
  }

  // Verify the token is valid
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerkId
  )

  if (!authResult.authenticated) {
    console.log(`[Push Token] ❌ Auth failed for ${sanitizeClerkId(clerkId)}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Push Token] 📥 Update request for ${sanitizeClerkId(clerkId)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    const customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === clerkId
    )

    if (!customer) {
      console.log(`[Push Token] ❌ Customer not found for ${sanitizeClerkId(clerkId)}`)
      return res.status(404).json({
        error: "Customer not found",
        message: "No customer associated with this Clerk account",
      })
    }

    // Update customer metadata with push token
    const currentMetadata = (customer.metadata as Record<string, any>) || {}

    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...currentMetadata,
        push_token,
        push_token_updated_at: new Date().toISOString(),
      },
    })

    console.log(`[Push Token] ✅ Updated for ${sanitizeCustomerId(customer.id)}`)

    return res.status(200).json({
      success: true,
      message: "Push token updated successfully",
    })
  } catch (error: any) {
    console.error(`[Push Token] ❌ Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to update push token",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

/**
 * DELETE /store/customers/push-token
 *
 * Removes the customer's push notification token.
 * Used when user signs out or disables notifications.
 *
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAuthLimiter)
  if (!rateLimitOk) return

  // Get clerk_id from token
  const clerkId = await getClerkUserId(req.headers.authorization as string | undefined)

  if (!clerkId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid Clerk JWT token required",
    })
  }

  // Verify the token
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerkId
  )

  if (!authResult.authenticated) {
    return sendAuthError(res, authResult)
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
      })
    }

    // Remove push token from metadata
    const currentMetadata = (customer.metadata as Record<string, any>) || {}
    const { push_token, push_token_updated_at, ...restMetadata } = currentMetadata

    await customerModule.updateCustomers(customer.id, {
      metadata: restMetadata,
    })

    console.log(`[Push Token] 🗑️ Removed for ${sanitizeCustomerId(customer.id)}`)

    return res.status(200).json({
      success: true,
      message: "Push token removed successfully",
    })
  } catch (error: any) {
    console.error(`[Push Token] ❌ Delete Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to remove push token",
    })
  }
}
