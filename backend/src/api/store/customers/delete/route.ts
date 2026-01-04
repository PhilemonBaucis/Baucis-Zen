import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getSensitiveOpLimiter } from "../../../../lib/rate-limiter"
import { sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

interface DeleteAccountBody {
  reason: string
  reasonLabel?: string
}

/**
 * POST /store/customers/delete
 * 
 * Soft-delete a customer account:
 * - Anonymizes email and personal data
 * - Stores deletion reason in metadata
 * - Preserves order history for admin reference
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 * 
 * Rate limited: 5 requests per hour (strictest limit for destructive operation)
 * 
 * Note: The Clerk user deletion must be handled by the frontend
 * since it requires the Clerk SDK.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply strict rate limiting (5 requests per hour)
  const rateLimitOk = await applyRateLimit(req, res, getSensitiveOpLimiter)
  if (!rateLimitOk) return

  const body = req.body as DeleteAccountBody

  // Validate required fields
  if (!body.reason) {
    return res.status(400).json({
      error: "reason is required",
    })
  }

  const { reason, reasonLabel } = body

  // STRICT: Require valid JWT token (no expected clerk_id - we get it from token)
  const authResult = await requireClerkAuth(req.headers.authorization as string | undefined)

  if (!authResult.authenticated) {
    console.log("[Account Delete] ❌ Auth failed")
    return sendAuthError(res, authResult)
  }

  const verifiedClerkId = authResult.clerkId

  console.log(`[Account Delete] 📥 Request from ${sanitizeClerkId(verifiedClerkId)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by verified Clerk ID
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    const customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === verifiedClerkId
    )

    if (!customer) {
      console.log(`[Account Delete] ⚠️ No customer found for ${sanitizeClerkId(verifiedClerkId)}`)
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    const currentMetadata = (customer.metadata as Record<string, any>) || {}
    const originalEmail = customer.email

    // Soft delete: anonymize data but keep record for order history
    await customerModule.updateCustomers(customer.id, {
      email: `deleted_${Date.now()}_${customer.id}@deleted.bauciszen.com`,
      first_name: "Deleted",
      last_name: "User",
      phone: "",
      metadata: {
        ...currentMetadata,
        account_deleted: true,
        deletion_reason: reason,
        deletion_reason_label: reasonLabel || reason,
        deleted_at: new Date().toISOString(),
        // Note: We don't log the original email for privacy
        clerk_id: verifiedClerkId,
      },
    })

    console.log(`[Account Delete] ✅ Soft-deleted ${sanitizeCustomerId(customer.id)}`)

    return res.status(200).json({
      success: true,
      message: "Customer account deleted successfully",
      customerId: customer.id,
    })
  } catch (error: any) {
    console.error(`[Account Delete] ❌ Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to delete customer account",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
