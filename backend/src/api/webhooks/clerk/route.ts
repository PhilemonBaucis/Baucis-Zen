import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { Webhook } from "svix"
import { getInitialZenPoints } from "../../../lib/zen-points-config"
import { applyRateLimit, getWebhookLimiter } from "../../../lib/rate-limiter"
import { sanitizeEmail, sanitizeClerkId, sanitizeCustomerId } from "../../../lib/log-utils"

// Clerk webhook event types
interface ClerkUserEvent {
  data: {
    id: string
    email_addresses: Array<{
      id: string
      email_address: string
      verification: { status: string } | null
    }>
    primary_email_address_id: string | null
    first_name: string | null
    last_name: string | null
    phone_numbers: Array<{
      id: string
      phone_number: string
    }>
    primary_phone_number_id: string | null
    created_at: number
    updated_at: number
  }
  type: "user.created" | "user.updated" | "user.deleted"
}

/**
 * Get the primary email from Clerk user data
 */
function getPrimaryEmail(userData: ClerkUserEvent["data"]): string | null {
  if (!userData.email_addresses || userData.email_addresses.length === 0) {
    return null
  }

  // Find primary email
  if (userData.primary_email_address_id) {
    const primaryEmail = userData.email_addresses.find(
      (e) => e.id === userData.primary_email_address_id
    )
    if (primaryEmail) {
      return primaryEmail.email_address
    }
  }

  // Fallback to first verified email or first email
  const verifiedEmail = userData.email_addresses.find(
    (e) => e.verification?.status === "verified"
  )
  return verifiedEmail?.email_address || userData.email_addresses[0]?.email_address || null
}

/**
 * Get the primary phone from Clerk user data
 */
function getPrimaryPhone(userData: ClerkUserEvent["data"]): string | null {
  if (!userData.phone_numbers || userData.phone_numbers.length === 0) {
    return null
  }

  if (userData.primary_phone_number_id) {
    const primaryPhone = userData.phone_numbers.find(
      (p) => p.id === userData.primary_phone_number_id
    )
    if (primaryPhone) {
      return primaryPhone.phone_number
    }
  }

  return userData.phone_numbers[0]?.phone_number || null
}

/**
 * POST /webhooks/clerk
 * Handles Clerk webhook events for user sync
 * 
 * Rate limited: 100 requests per minute (Clerk may send bursts)
 * 
 * Security: Webhook signature verification via svix
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting (100 requests per minute by IP)
  const rateLimitOk = await applyRateLimit(req, res, getWebhookLimiter)
  if (!rateLimitOk) return

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET

  // Get the headers
  const svix_id = req.headers["svix-id"] as string
  const svix_timestamp = req.headers["svix-timestamp"] as string
  const svix_signature = req.headers["svix-signature"] as string

  // SECURITY: Require webhook secret in production
  if (!webhookSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Clerk Webhook] ❌ CLERK_WEBHOOK_SECRET not configured in production")
      return res.status(500).json({ error: "Webhook not configured" })
    }
    console.warn("[Clerk Webhook] ⚠️ No CLERK_WEBHOOK_SECRET - verification disabled (dev mode)")
  }

  // Get the raw body
  const payload = JSON.stringify(req.body)

  let event: ClerkUserEvent

  // Verify webhook signature if secret is configured
  if (webhookSecret && svix_id && svix_timestamp && svix_signature) {
    try {
      const wh = new Webhook(webhookSecret)
      event = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as ClerkUserEvent
    } catch (err: any) {
      console.error("[Clerk Webhook] ❌ Signature verification failed")
      return res.status(400).json({ error: "Invalid webhook signature" })
    }
  } else if (webhookSecret) {
    // Secret configured but headers missing
    console.error("[Clerk Webhook] ❌ Missing svix headers")
    return res.status(400).json({ error: "Missing webhook signature headers" })
  } else {
    // Development mode - no verification
    event = req.body as ClerkUserEvent
  }

  const eventType = event.type
  const userData = event.data

  console.log(`[Clerk Webhook] 📥 ${eventType} for ${sanitizeClerkId(userData.id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    switch (eventType) {
      case "user.created": {
        const email = getPrimaryEmail(userData)
        
        if (!email) {
          console.log("[Clerk Webhook] ⚠️ No email found, skipping")
          return res.status(200).json({ received: true, action: "skipped", reason: "no_email" })
        }

        // Check if customer already exists
        const [existingCustomers] = await customerModule.listAndCountCustomers({ email })
        
        if (existingCustomers && existingCustomers.length > 0) {
          // Update existing customer with Clerk ID
          await customerModule.updateCustomers(existingCustomers[0].id, {
            metadata: {
              ...(existingCustomers[0].metadata as Record<string, any> || {}),
              clerk_id: userData.id,
              zen_points: (existingCustomers[0].metadata as any)?.zen_points || getInitialZenPoints(),
            },
          })

          // Set has_account to true
          try {
            const pgConnection = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
            if (pgConnection) {
              await pgConnection.raw(
                `UPDATE customer SET has_account = true WHERE id = ?`,
                [existingCustomers[0].id]
              )
            }
          } catch (queryErr) {
            // Non-critical
          }
          
          console.log(`[Clerk Webhook] ✅ Updated existing ${sanitizeCustomerId(existingCustomers[0].id)}`)
          return res.status(200).json({ 
            received: true, 
            action: "updated_existing",
            customerId: existingCustomers[0].id 
          })
        }

        // Create new customer
        const newCustomer = await customerModule.createCustomers({
          email,
          first_name: userData.first_name || undefined,
          last_name: userData.last_name || undefined,
          phone: getPrimaryPhone(userData) || undefined,
          metadata: {
            clerk_id: userData.id,
            zen_points: getInitialZenPoints(),
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
          // Non-critical
        }

        console.log(`[Clerk Webhook] ✅ Created ${sanitizeCustomerId(newCustomer.id)}`)
        
        return res.status(200).json({ 
          received: true, 
          action: "created",
          customerId: newCustomer.id 
        })
      }

      case "user.updated": {
        const email = getPrimaryEmail(userData)
        
        if (!email) {
          console.log("[Clerk Webhook] ⚠️ No email found for update, skipping")
          return res.status(200).json({ received: true, action: "skipped", reason: "no_email" })
        }

        // Find customer by Clerk ID first, then by email
        let customer: any = undefined
        
        // Try to find by Clerk ID in metadata
        const [customersByClerkId] = await customerModule.listAndCountCustomers({})
        customer = customersByClerkId.find(
          (c) => (c.metadata as any)?.clerk_id === userData.id
        )

        // If not found by Clerk ID, try by email
        if (!customer) {
          const [customersByEmail] = await customerModule.listAndCountCustomers({ email })
          customer = customersByEmail?.[0]
        }

        if (!customer) {
          // Create the customer since it doesn't exist
          const newCustomer = await customerModule.createCustomers({
            email,
            first_name: userData.first_name || undefined,
            last_name: userData.last_name || undefined,
            phone: getPrimaryPhone(userData) || undefined,
            metadata: {
              clerk_id: userData.id,
              zen_points: getInitialZenPoints(),
            },
          })
          
          console.log(`[Clerk Webhook] ✅ Created on update ${sanitizeCustomerId(newCustomer.id)}`)
          return res.status(200).json({ 
            received: true, 
            action: "created_on_update",
            customerId: newCustomer.id 
          })
        }

        // Update existing customer
        const currentMetadata = (customer.metadata as Record<string, any>) || {}
        
        await customerModule.updateCustomers(customer.id, {
          email,
          first_name: userData.first_name || customer.first_name,
          last_name: userData.last_name || customer.last_name,
          phone: getPrimaryPhone(userData) || customer.phone,
          metadata: {
            ...currentMetadata,
            clerk_id: userData.id,
          },
        })

        console.log(`[Clerk Webhook] ✅ Updated ${sanitizeCustomerId(customer.id)}`)
        
        return res.status(200).json({ 
          received: true, 
          action: "updated",
          customerId: customer.id 
        })
      }

      case "user.deleted": {
        // Find customer by Clerk ID
        const [allCustomers] = await customerModule.listAndCountCustomers({})
        const customer = allCustomers.find(
          (c) => (c.metadata as any)?.clerk_id === userData.id
        )

        if (!customer) {
          console.log(`[Clerk Webhook] ℹ️ No customer found to delete for ${sanitizeClerkId(userData.id)}`)
          return res.status(200).json({ received: true, action: "not_found" })
        }

        // Soft delete - mark as deleted in metadata rather than hard delete
        // This preserves order history
        const currentMetadata = (customer.metadata as Record<string, any>) || {}
        
        await customerModule.updateCustomers(customer.id, {
          metadata: {
            ...currentMetadata,
            clerk_deleted: true,
            clerk_deleted_at: new Date().toISOString(),
          },
        })

        console.log(`[Clerk Webhook] ✅ Marked ${sanitizeCustomerId(customer.id)} as deleted`)
        
        return res.status(200).json({ 
          received: true, 
          action: "soft_deleted",
          customerId: customer.id 
        })
      }

      default:
        console.log(`[Clerk Webhook] ℹ️ Ignoring event type: ${eventType}`)
        return res.status(200).json({ received: true, action: "ignored" })
    }
  } catch (error: any) {
    console.error(`[Clerk Webhook] ❌ Error processing ${eventType}:`, error.message)
    
    return res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

/**
 * GET /webhooks/clerk
 * Health check endpoint
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const hasSecret = !!process.env.CLERK_WEBHOOK_SECRET
  
  res.status(200).json({
    status: "ok",
    webhook: "clerk",
    configured: hasSecret,
    message: hasSecret 
      ? "Clerk webhook is configured" 
      : "Warning: CLERK_WEBHOOK_SECRET not set",
  })
}
