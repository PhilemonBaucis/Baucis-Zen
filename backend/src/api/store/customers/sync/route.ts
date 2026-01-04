import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getInitialZenPoints } from "../../../../lib/zen-points-config"
import { requireClerkAuth, sendAuthError, getClientIP } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getAuthLimiter } from "../../../../lib/rate-limiter"
import { sanitizeEmail, sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

interface SyncCustomerBody {
  clerk_id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, any>  // For address updates, etc.
}

/**
 * POST /store/customers/sync
 * 
 * Syncs a Clerk user to Medusa customer.
 * This endpoint is called from the frontend when a user logs in
 * to ensure they exist in Medusa (fallback for webhook failures).
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting (20 requests per minute per IP)
  const rateLimitOk = await applyRateLimit(req, res, getAuthLimiter)
  if (!rateLimitOk) return

  const body = req.body as SyncCustomerBody

  // Validate required fields
  if (!body.clerk_id || !body.email) {
    return res.status(400).json({
      error: "clerk_id and email are required",
    })
  }

  const { clerk_id, email, first_name, last_name, phone, metadata: incomingMetadata } = body

  // STRICT: Require valid JWT token that matches the clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerk_id // Verify token belongs to this specific user
  )

  if (!authResult.authenticated) {
    console.log(`[Customer Sync] ❌ Auth failed for ${sanitizeClerkId(clerk_id)}: ${authResult.error}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Customer Sync] 📥 Sync request ${sanitizeEmail(email)} ${sanitizeClerkId(clerk_id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // First, try to find customer by Clerk ID in metadata
    const [allCustomers] = await customerModule.listAndCountCustomers({})
    let customer = allCustomers.find(
      (c) => (c.metadata as any)?.clerk_id === clerk_id
    )

    // If not found by Clerk ID, try by email
    if (!customer) {
      const [customersByEmail] = await customerModule.listAndCountCustomers({ email })
      customer = customersByEmail?.[0]
    }

    if (customer) {
      // Customer exists - update with latest info and ensure Clerk ID is set
      const currentMetadata = (customer.metadata as Record<string, any>) || {}
      
      // Merge incoming metadata with existing, preserving zen_points
      const mergedMetadata = {
        ...currentMetadata,
        ...incomingMetadata,  // Apply incoming metadata (addresses, etc.)
        clerk_id,
        zen_points: currentMetadata.zen_points || getInitialZenPoints(),
        last_sync: new Date().toISOString(),
      }
      
      await customerModule.updateCustomers(customer.id, {
        first_name: first_name || customer.first_name,
        last_name: last_name || customer.last_name,
        phone: phone || customer.phone,
        metadata: mergedMetadata,
      })

      // Set has_account to true using raw query (not available in CustomerUpdatableFields)
      try {
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
        await query.graph({
          entity: "customer",
          filters: { id: customer.id },
          fields: ["id"],
        })
        // Use the underlying service to update has_account directly
        const dbCustomer = await customerModule.retrieveCustomer(customer.id)
        if (!dbCustomer.has_account) {
          // Access the underlying repository/database for this specific field
          const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
          if (pgConnection) {
            await pgConnection.raw(
              `UPDATE customer SET has_account = true WHERE id = ?`,
              [customer.id]
            )
          }
        }
      } catch (queryErr) {
        // Non-critical error, log without sensitive data
        console.log("[Customer Sync] Could not update has_account (non-critical)")
      }

      // Fetch updated customer to return
      const updatedCustomer = await customerModule.retrieveCustomer(customer.id)

      console.log(`[Customer Sync] ✅ Updated ${sanitizeCustomerId(customer.id)}`)

      return res.status(200).json({
        success: true,
        action: "updated",
        customer: {
          id: updatedCustomer.id,
          email: updatedCustomer.email,
          first_name: updatedCustomer.first_name,
          last_name: updatedCustomer.last_name,
          phone: updatedCustomer.phone,
          metadata: updatedCustomer.metadata,
        },
      })
    }

    // Customer doesn't exist - create new one
    const newCustomer = await customerModule.createCustomers({
      email,
      first_name: first_name || undefined,
      last_name: last_name || undefined,
      phone: phone || undefined,
      metadata: {
        clerk_id,
        zen_points: getInitialZenPoints(),
        created_via: "sync_endpoint",
        last_sync: new Date().toISOString(),
      },
    })

    // Set has_account to true using raw query
    try {
      const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      if (pgConnection) {
        await pgConnection.raw(
          `UPDATE customer SET has_account = true WHERE id = ?`,
          [newCustomer.id]
        )
      }
    } catch (queryErr) {
      console.log("[Customer Sync] Could not update has_account (non-critical)")
    }

    console.log(`[Customer Sync] ✅ Created ${sanitizeCustomerId(newCustomer.id)} for ${sanitizeEmail(email)}`)

    return res.status(201).json({
      success: true,
      action: "created",
      customer: {
        id: newCustomer.id,
        email: newCustomer.email,
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        phone: newCustomer.phone,
        metadata: newCustomer.metadata,
      },
    })
  } catch (error: any) {
    console.error(`[Customer Sync] ❌ Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to sync customer",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

/**
 * GET /store/customers/sync
 * 
 * Get customer by Clerk ID or email.
 * Useful for checking if a customer already exists.
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token (when querying by clerk_id)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAuthLimiter)
  if (!rateLimitOk) return

  const clerkId = req.query.clerk_id as string
  const email = req.query.email as string

  if (!clerkId && !email) {
    return res.status(400).json({
      error: "clerk_id or email query parameter is required",
    })
  }

  // STRICT: When querying by clerk_id, require matching JWT token
  if (clerkId) {
    const authResult = await requireClerkAuth(
      req.headers.authorization as string | undefined,
      clerkId
    )

    if (!authResult.authenticated) {
      console.log(`[Customer Sync] ❌ GET auth failed for ${sanitizeClerkId(clerkId)}`)
      return sendAuthError(res, authResult)
    }
  }

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    let customer: any = undefined

    if (clerkId) {
      // Find by Clerk ID in metadata
      const [allCustomers] = await customerModule.listAndCountCustomers({})
      customer = allCustomers.find(
        (c) => (c.metadata as any)?.clerk_id === clerkId
      )
    }

    if (!customer && email) {
      // Find by email
      const [customersByEmail] = await customerModule.listAndCountCustomers({ email })
      customer = customersByEmail?.[0]
    }

    if (!customer) {
      return res.status(404).json({
        exists: false,
        message: "Customer not found",
      })
    }

    return res.status(200).json({
      exists: true,
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        metadata: customer.metadata,
      },
    })
  } catch (error: any) {
    console.error(`[Customer Sync] ❌ GET Error:`, error.message)

    return res.status(500).json({
      error: "Failed to check customer",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
