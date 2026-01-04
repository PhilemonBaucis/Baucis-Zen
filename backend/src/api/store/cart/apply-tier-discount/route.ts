import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { calculateTier, getTierDiscount } from "../../../../lib/zen-points-config"

interface ApplyTierDiscountBody {
  cart_id: string
  customer_id?: string
  clerk_id?: string
}

/**
 * POST /store/cart/apply-tier-discount
 *
 * Applies the customer's Zen Points tier discount to the cart.
 * Must be called BEFORE cart.complete() to ensure discount is saved to order.
 *
 * Accepts either customer_id (Medusa ID) or clerk_id for lookup.
 *
 * Tier Discounts:
 * - Seed (0-99 pts): 0%
 * - Sprout (100-249 pts): 5%
 * - Blossom (250-499 pts): 10%
 * - Lotus (500+ pts): 15%
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as ApplyTierDiscountBody

  console.log(`[Tier Discount] 📥 Request received:`, {
    cart_id: body.cart_id,
    customer_id: body.customer_id,
    clerk_id: body.clerk_id,
  })

  if (!body.cart_id) {
    console.log(`[Tier Discount] ❌ Missing cart_id`)
    return res.status(400).json({
      error: "cart_id is required",
    })
  }

  if (!body.customer_id && !body.clerk_id) {
    console.log(`[Tier Discount] ❌ Missing customer_id and clerk_id`)
    return res.status(400).json({
      error: "customer_id or clerk_id is required",
    })
  }

  const { cart_id, customer_id, clerk_id } = body

  try {
    const cartModule = req.scope.resolve(Modules.CART)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    // Fetch customer - by Medusa ID or by clerk_id in metadata
    let customer: any = null

    // First try direct lookup if customer_id looks like a Medusa ID
    if (customer_id && !customer_id.startsWith('clerk_')) {
      try {
        customer = await customerModule.retrieveCustomer(customer_id)
      } catch (e) {
        // Not found by direct ID, will try clerk_id lookup
      }
    }

    // If not found, lookup by clerk_id in metadata
    if (!customer) {
      const lookupClerkId = clerk_id || (customer_id?.startsWith('clerk_') ? customer_id.replace('clerk_', '') : null)

      if (lookupClerkId) {
        try {
          const [customers] = await customerModule.listAndCountCustomers({})
          customer = customers.find((c: any) =>
            (c.metadata as any)?.clerk_id === lookupClerkId
          )
        } catch (e) {
          console.error(`[Tier Discount] Error searching customers:`, e)
        }
      }
    }

    if (!customer) {
      console.error(`[Tier Discount] Customer not found: customer_id=${customer_id}, clerk_id=${clerk_id}`)
      return res.status(404).json({
        error: "Customer not found",
      })
    }

    console.log(`[Tier Discount] Found customer ${customer.id}`)

    // Get zen points and calculate tier
    const zenPoints = (customer.metadata as any)?.zen_points || {}
    const currentBalance = Number(zenPoints.current_balance) || 0
    const tier = calculateTier(currentBalance)
    const discountPercent = getTierDiscount(tier)

    console.log(`[Tier Discount] Customer has ${currentBalance} pts, tier: ${tier}, discount: ${discountPercent}%`)

    // If no discount, return early
    if (discountPercent === 0) {
      console.log(`[Tier Discount] No discount for tier ${tier}`)
      return res.status(200).json({
        success: true,
        applied: false,
        tier,
        discount_percent: 0,
        message: "No discount for current tier",
      })
    }

    // Retrieve cart with items
    let cart
    try {
      cart = await cartModule.retrieveCart(cart_id, {
        relations: ["items"],
      })
    } catch (e) {
      console.error(`[Tier Discount] Cart ${cart_id} not found`)
      return res.status(404).json({
        error: "Cart not found",
      })
    }

    const items = cart.items || []
    if (items.length === 0) {
      return res.status(200).json({
        success: true,
        applied: false,
        tier,
        discount_percent: discountPercent,
        message: "Cart is empty",
      })
    }

    // Calculate total discount amount
    const itemsSubtotal = items.reduce(
      (sum: number, item: any) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1),
      0
    )
    const discountAmount = itemsSubtotal * (discountPercent / 100)

    console.log(`[Tier Discount] Items subtotal: €${itemsSubtotal}, discount: €${discountAmount}`)

    // Store discount in cart metadata
    // Medusa v2.1.3+ auto-transfers cart.metadata to order.metadata during completeCart
    try {
      await cartModule.updateCarts([{
        id: cart_id,
        metadata: {
          ...(cart.metadata || {}),
          zen_tier_discount: {
            tier,
            percent: discountPercent,
            amount: discountAmount,
            original_subtotal: itemsSubtotal,
            discounted_subtotal: itemsSubtotal - discountAmount,
            applied_at: new Date().toISOString(),
          },
        },
      }])

      // Verify the update worked by re-fetching the cart
      const updatedCart = await cartModule.retrieveCart(cart_id)
      const savedDiscount = (updatedCart as any).metadata?.zen_tier_discount
      if (savedDiscount?.amount) {
        console.log(`[Tier Discount] ✅ Verified discount saved: ${savedDiscount.tier} - €${savedDiscount.amount}`)
      } else {
        console.warn(`[Tier Discount] ⚠️ Discount not found after save - metadata may not have persisted`)
      }
    } catch (metaError: any) {
      console.error(`[Tier Discount] ❌ Failed to store metadata:`, metaError.message)
      return res.status(500).json({
        success: false,
        error: "Failed to apply discount to cart",
      })
    }

    return res.status(200).json({
      success: true,
      applied: true,
      tier,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      items_subtotal: itemsSubtotal,
      discounted_subtotal: itemsSubtotal - discountAmount,
    })

  } catch (error: any) {
    console.error("[Tier Discount] ❌ Error:", error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to apply tier discount",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
