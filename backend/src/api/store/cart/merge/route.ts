import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { requireClerkAuth, sendAuthError } from "../../../middlewares/clerk-auth"
import { applyRateLimit, getCartLimiter } from "../../../../lib/rate-limiter"
import { sanitizeCartId, sanitizeClerkId, sanitizeCustomerId } from "../../../../lib/log-utils"

interface MergeCartBody {
  guest_cart_id: string
  customer_cart_id: string
}

/**
 * POST /store/cart/merge
 * 
 * Atomically merges a guest cart into a customer cart.
 * - Items from guest cart are added to customer cart
 * - If item already exists, quantities are combined
 * - Guest cart is deleted after successful merge
 * 
 * REQUIRES: Authorization header with valid Clerk JWT token
 * The authenticated user must own the customer_cart_id
 * 
 * This ensures cart merging happens server-side with proper atomicity
 * and authorization, rather than multiple frontend API calls.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Apply rate limiting (60 requests per minute per IP)
  const rateLimitOk = await applyRateLimit(req, res, getCartLimiter)
  if (!rateLimitOk) return

  const body = req.body as MergeCartBody

  if (!body.guest_cart_id || !body.customer_cart_id) {
    return res.status(400).json({
      error: "guest_cart_id and customer_cart_id are required",
    })
  }

  const { guest_cart_id, customer_cart_id } = body

  // Prevent merging cart into itself
  if (guest_cart_id === customer_cart_id) {
    return res.status(400).json({
      error: "Cannot merge cart into itself",
    })
  }

  // STRICT: Require valid JWT authentication
  const authResult = await requireClerkAuth(req.headers.authorization as string | undefined)
  
  if (!authResult.authenticated) {
    console.log(`[Cart Merge] ❌ Auth failed: ${authResult.error}`)
    return sendAuthError(res, authResult)
  }

  const verifiedClerkId = authResult.clerkId

  console.log(`[Cart Merge] 📥 Request from ${sanitizeClerkId(verifiedClerkId)}: merge ${sanitizeCartId(guest_cart_id)} into ${sanitizeCartId(customer_cart_id)}`)

  try {
    const cartModule = req.scope.resolve(Modules.CART)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Retrieve both carts with items
    let guestCart, customerCart
    
    try {
      [guestCart, customerCart] = await Promise.all([
        cartModule.retrieveCart(guest_cart_id, {
          relations: ["items", "items.variant"],
        }),
        cartModule.retrieveCart(customer_cart_id, {
          relations: ["items", "items.variant"],
        }),
      ])
    } catch (retrieveError: any) {
      console.error("[Cart Merge] Failed to retrieve carts")
      return res.status(404).json({
        error: "One or both carts not found",
      })
    }

    if (!guestCart || !customerCart) {
      return res.status(404).json({
        error: "One or both carts not found",
      })
    }

    // AUTHORIZATION: Verify the authenticated user owns the customer cart
    // Check 1: Cart has a customer_id that matches a customer with this clerk_id
    // Check 2: Cart metadata has matching clerk_id
    let isAuthorized = false

    // Check cart metadata for clerk_id
    const cartClerkId = (customerCart.metadata as any)?.clerk_id
    if (cartClerkId && cartClerkId === verifiedClerkId) {
      isAuthorized = true
    }

    // Check if cart is associated with a customer that has this clerk_id
    if (!isAuthorized && customerCart.customer_id) {
      try {
        const customer = await customerModule.retrieveCustomer(customerCart.customer_id)
        const customerClerkId = (customer.metadata as any)?.clerk_id
        if (customerClerkId && customerClerkId === verifiedClerkId) {
          isAuthorized = true
        }
      } catch (e) {
        // Customer not found - cart may not be linked yet
      }
    }

    // For carts that aren't linked to a customer yet, check if the user
    // owns any customer account that previously used this cart
    if (!isAuthorized) {
      const [allCustomers] = await customerModule.listAndCountCustomers({})
      const userCustomer = allCustomers.find(
        (c) => (c.metadata as any)?.clerk_id === verifiedClerkId
      )
      
      if (userCustomer) {
        // Check if this cart is in the customer's active_cart_id
        const activeCartId = (userCustomer.metadata as any)?.active_cart_id
        if (activeCartId && activeCartId === customer_cart_id) {
          isAuthorized = true
        }
      }
    }

    if (!isAuthorized) {
      console.log(`[Cart Merge] ❌ Unauthorized: user ${sanitizeClerkId(verifiedClerkId)} does not own cart ${sanitizeCartId(customer_cart_id)}`)
      return res.status(403).json({
        error: "Forbidden: You do not own this cart",
      })
    }

    const guestItems = guestCart.items || []
    const customerItems = customerCart.items || []

    // If guest cart is empty, nothing to merge
    if (guestItems.length === 0) {
      console.log("[Cart Merge] Guest cart is empty, nothing to merge")
      return res.status(200).json({
        success: true,
        action: "no_merge_needed",
        message: "Guest cart is empty",
        cart: {
          id: customerCart.id,
          items: customerItems,
        },
      })
    }

    // Track merge operations
    const mergeLog: Array<{
      variantId: string
      action: "added" | "updated"
      quantity: number
    }> = []

    // Merge each guest item into customer cart
    for (const guestItem of guestItems) {
      const variantId = guestItem.variant_id

      // Check if item already exists in customer cart
      const existingItem = customerItems.find(
        (item: any) => item.variant_id === variantId
      )

      if (existingItem) {
        // Update quantity - combine both
        const newQuantity = existingItem.quantity + guestItem.quantity
        
        await cartModule.updateLineItems(existingItem.id, {
          quantity: newQuantity,
        })

        mergeLog.push({
          variantId,
          action: "updated",
          quantity: newQuantity,
        })
      } else {
        // Add new item to customer cart
        await cartModule.addLineItems(customer_cart_id, [{
          variant_id: variantId,
          quantity: guestItem.quantity,
          title: guestItem.title,
          unit_price: guestItem.unit_price,
          thumbnail: guestItem.thumbnail,
        }])

        mergeLog.push({
          variantId,
          action: "added",
          quantity: guestItem.quantity,
        })
      }
    }

    // Delete guest cart after successful merge
    try {
      await cartModule.deleteCarts([guest_cart_id])
    } catch (deleteError: any) {
      // Non-critical - log but don't fail
      console.warn("[Cart Merge] Failed to delete guest cart (non-critical)")
    }

    // Retrieve the updated customer cart
    const mergedCart = await cartModule.retrieveCart(customer_cart_id, {
      relations: ["items", "items.variant", "items.product"],
    })

    console.log(`[Cart Merge] ✅ Merged ${guestItems.length} items for ${sanitizeClerkId(verifiedClerkId)}`)

    return res.status(200).json({
      success: true,
      action: "merged",
      mergeLog,
      itemsMerged: guestItems.length,
      cart: {
        id: mergedCart.id,
        items: mergedCart.items,
        item_count: (mergedCart.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0),
      },
    })
  } catch (error: any) {
    console.error("[Cart Merge] ❌ Error:", error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to merge carts",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
