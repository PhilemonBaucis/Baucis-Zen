import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getAddressLimiter } from "../../../../lib/rate-limiter"
import { sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

// Maximum number of addresses per customer
const MAX_ADDRESSES = 4

interface AddressBody {
  clerk_id: string  // For authentication
  address: {
    id?: string  // For updates
    address_name?: string  // Label like "Home", "Office", etc.
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    postal_code?: string
    country_code: string
    phone?: string
    is_default_shipping?: boolean
    is_default_billing?: boolean
    company?: string
    province?: string
    metadata?: {
      coordinates?: { lat: number; lng: number }
    }
  }
}

interface DeleteAddressBody {
  clerk_id: string
  address_id: string
}

/**
 * Find customer by Clerk ID
 */
async function findCustomerByClerkId(customerModule: any, clerkId: string) {
  const [allCustomers] = await customerModule.listAndCountCustomers({})
  return allCustomers.find((c) => (c.metadata as any)?.clerk_id === clerkId)
}

/**
 * POST /store/customers/addresses
 * Create a new address for a customer
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting (30 requests per minute)
  const rateLimitOk = await applyRateLimit(req, res, getAddressLimiter)
  if (!rateLimitOk) return

  const body = req.body as AddressBody

  if (!body.clerk_id || !body.address) {
    return res.status(400).json({
      error: "clerk_id and address are required",
    })
  }

  const { clerk_id, address } = body

  // STRICT: Require valid JWT token that matches the clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerk_id
  )

  if (!authResult.authenticated) {
    console.log(`[Addresses] ❌ POST auth failed for ${sanitizeClerkId(clerk_id)}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Addresses] 📥 Create request from ${sanitizeClerkId(clerk_id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const customer = await findCustomerByClerkId(customerModule, clerk_id)

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    // Check current address count - max 4 allowed
    const existingAddresses = await customerModule.listCustomerAddresses({
      customer_id: customer.id,
    })

    if (existingAddresses.length >= MAX_ADDRESSES) {
      return res.status(400).json({
        error: `Maximum ${MAX_ADDRESSES} addresses allowed`,
        message: "Please delete an existing address before adding a new one",
      })
    }

    // Create the address using Medusa's native address system
    const newAddress = await customerModule.createCustomerAddresses({
      customer_id: customer.id,
      address_name: address.address_name || undefined,
      first_name: address.first_name,
      last_name: address.last_name,
      address_1: address.address_1,
      address_2: address.address_2 || undefined,
      city: address.city,
      postal_code: address.postal_code || undefined,
      country_code: address.country_code,
      phone: address.phone || undefined,
      is_default_shipping: address.is_default_shipping || false,
      is_default_billing: address.is_default_billing || false,
      company: address.company || undefined,
      province: address.province || undefined,
      metadata: address.metadata || undefined,
    })

    console.log(`[Addresses] ✅ Created address for ${sanitizeCustomerId(customer.id)}`)

    // Get all addresses to return
    const addresses = await customerModule.listCustomerAddresses({
      customer_id: customer.id,
    })

    return res.status(201).json({
      success: true,
      action: "created",
      address: newAddress,
      addresses,
    })
  } catch (error: any) {
    console.error(`[Addresses] ❌ POST Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to create address",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

/**
 * GET /store/customers/addresses
 * Get all addresses for a customer
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAddressLimiter)
  if (!rateLimitOk) return

  const clerkId = req.query.clerk_id as string

  if (!clerkId) {
    return res.status(400).json({
      error: "clerk_id query parameter is required",
    })
  }

  // STRICT: Require valid JWT token that matches the clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerkId
  )

  if (!authResult.authenticated) {
    console.log(`[Addresses] ❌ GET auth failed for ${sanitizeClerkId(clerkId)}`)
    return sendAuthError(res, authResult)
  }

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const customer = await findCustomerByClerkId(customerModule, clerkId)

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        addresses: [],
      })
    }

    // Get all addresses
    const addresses = await customerModule.listCustomerAddresses({
      customer_id: customer.id,
    })

    return res.status(200).json({
      success: true,
      addresses,
    })
  } catch (error: any) {
    console.error(`[Addresses] ❌ GET Error:`, error.message)

    return res.status(500).json({
      error: "Failed to get addresses",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

/**
 * PUT /store/customers/addresses
 * Update an existing address
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAddressLimiter)
  if (!rateLimitOk) return

  const body = req.body as AddressBody

  if (!body.clerk_id || !body.address || !body.address.id) {
    return res.status(400).json({
      error: "clerk_id and address with id are required",
    })
  }

  const { clerk_id, address } = body
  const addressId = address.id as string

  // STRICT: Require valid JWT token that matches the clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerk_id
  )

  if (!authResult.authenticated) {
    console.log(`[Addresses] ❌ PUT auth failed for ${sanitizeClerkId(clerk_id)}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Addresses] 📥 Update request from ${sanitizeClerkId(clerk_id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const customer = await findCustomerByClerkId(customerModule, clerk_id)

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    // If setting as default, first unset all other defaults
    if (address.is_default_shipping || address.is_default_billing) {
      const existingAddresses = await customerModule.listCustomerAddresses({
        customer_id: customer.id,
      })
      
      // Unset default on all other addresses
      for (const addr of existingAddresses) {
        if (addr.id !== addressId && (addr.is_default_shipping || addr.is_default_billing)) {
          await customerModule.updateCustomerAddresses(addr.id, {
            is_default_shipping: false,
            is_default_billing: false,
          })
        }
      }
    }

    // Update the address
    const updatedAddress = await customerModule.updateCustomerAddresses(addressId, {
      address_name: address.address_name || undefined,
      first_name: address.first_name,
      last_name: address.last_name,
      address_1: address.address_1,
      address_2: address.address_2 || undefined,
      city: address.city,
      postal_code: address.postal_code || undefined,
      country_code: address.country_code,
      phone: address.phone || undefined,
      is_default_shipping: address.is_default_shipping || false,
      is_default_billing: address.is_default_billing || false,
      company: address.company || undefined,
      province: address.province || undefined,
      metadata: address.metadata || undefined,
    })

    console.log(`[Addresses] ✅ Updated address for ${sanitizeCustomerId(customer.id)}`)

    // Get all addresses to return
    const addresses = await customerModule.listCustomerAddresses({
      customer_id: customer.id,
    })

    return res.status(200).json({
      success: true,
      action: "updated",
      address: updatedAddress,
      addresses,
    })
  } catch (error: any) {
    console.error(`[Addresses] ❌ PUT Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to update address",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}

/**
 * DELETE /store/customers/addresses
 * Delete an address
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting
  const rateLimitOk = await applyRateLimit(req, res, getAddressLimiter)
  if (!rateLimitOk) return

  const body = req.body as DeleteAddressBody

  if (!body.clerk_id || !body.address_id) {
    return res.status(400).json({
      error: "clerk_id and address_id are required",
    })
  }

  const { clerk_id, address_id } = body

  // STRICT: Require valid JWT token that matches the clerk_id
  const authResult = await requireClerkAuth(
    req.headers.authorization as string | undefined,
    clerk_id
  )

  if (!authResult.authenticated) {
    console.log(`[Addresses] ❌ DELETE auth failed for ${sanitizeClerkId(clerk_id)}`)
    return sendAuthError(res, authResult)
  }

  console.log(`[Addresses] 📥 Delete request from ${sanitizeClerkId(clerk_id)}`)

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Find customer by Clerk ID
    const customer = await findCustomerByClerkId(customerModule, clerk_id)

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    // Delete the address
    await customerModule.deleteCustomerAddresses(address_id)

    console.log(`[Addresses] ✅ Deleted address for ${sanitizeCustomerId(customer.id)}`)

    // Get remaining addresses
    const addresses = await customerModule.listCustomerAddresses({
      customer_id: customer.id,
    })

    return res.status(200).json({
      success: true,
      action: "deleted",
      addresses,
    })
  } catch (error: any) {
    console.error(`[Addresses] ❌ DELETE Error:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to delete address",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
