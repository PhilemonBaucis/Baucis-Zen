import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  calculateTier,
  getTierDiscount,
  calculatePointsForOrder
} from "../../../../lib/zen-points-config"

/**
 * POST /store/zen-points/award
 *
 * Fallback endpoint to award Zen Points for an order.
 * Called from frontend after successful order completion if subscriber didn't trigger.
 *
 * Body: { order_id: string }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.body as { order_id: string }

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required" })
  }

  try {
    const orderModule = req.scope.resolve(Modules.ORDER)
    const customerModule = req.scope.resolve(Modules.CUSTOMER)

    console.log(`[Zen Points API] Processing award request for order ${order_id}`)

    // Get the order with summary for totals
    // Note: Order entity doesn't have "customer" relation in Medusa v2, use email to find customer
    const order = await orderModule.retrieveOrder(order_id, {
      relations: ["summary", "shipping_methods"],
    })

    if (!order) {
      console.log(`[Zen Points API] Order ${order_id} not found`)
      return res.status(404).json({ error: "Order not found" })
    }

    // Get the customer email from the order
    const customerEmail = order.email

    if (!customerEmail) {
      console.log(`[Zen Points API] No customer email found for order ${order_id}`)
      return res.status(400).json({ error: "No customer email found" })
    }

    // Find the customer by email
    const [customers] = await customerModule.listAndCountCustomers({
      email: customerEmail,
    })

    if (!customers || customers.length === 0) {
      console.log(`[Zen Points API] Customer not found for email ${customerEmail}`)
      return res.status(404).json({ error: "Customer not found" })
    }

    const customer = customers[0]

    // Check if points were already awarded for this order
    const currentMetadata = (customer.metadata as Record<string, any>) || {}
    const currentZenPoints = currentMetadata.zen_points || {
      current_balance: 0,
      tier: 'seed',
      discount_percent: 0,
      cycle_start_date: new Date().toISOString(),
      lifetime_points: 0,
    }

    // Skip if already awarded for this order
    if (currentZenPoints.last_order_id === order_id) {
      console.log(`[Zen Points API] Points already awarded for order ${order_id}`)
      return res.status(200).json({
        success: true,
        already_awarded: true,
        points_awarded: currentZenPoints.last_points_awarded || 0,
        current_balance: currentZenPoints.current_balance,
        tier: currentZenPoints.tier,
      })
    }

    // Calculate order totals
    const summary = (order as any).summary || {}
    const orderTotal = Number(summary.current_order_total) || Number((order as any).total) || 0
    const shippingTotal = Number((order as any).shipping_methods?.[0]?.amount) ||
                          Number((order as any).shipping_total) || 0
    const productsTotal = orderTotal - shippingTotal

    console.log(`[Zen Points API] Order ${order_id} totals: order=${orderTotal}€, shipping=${shippingTotal}€, products=${productsTotal}€`)

    // Award points based on ORIGINAL products total (before discount, excluding shipping)
    // Rule: 1 point per €10 spent on products
    const pointsToAward = calculatePointsForOrder(productsTotal)

    if (pointsToAward <= 0) {
      console.log(`[Zen Points API] No points to award for order ${order_id}`)
      return res.status(200).json({
        success: true,
        points_awarded: 0,
        current_balance: currentZenPoints.current_balance,
        tier: currentZenPoints.tier,
        reason: "Order total too low for points",
      })
    }

    // Update points
    const newBalance = (currentZenPoints.current_balance || 0) + pointsToAward
    const newLifetimePoints = (currentZenPoints.lifetime_points || 0) + pointsToAward
    const newTier = calculateTier(newBalance)
    const newDiscountPercent = getTierDiscount(newTier)

    // Update customer metadata
    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...currentMetadata,
        zen_points: {
          current_balance: newBalance,
          tier: newTier,
          discount_percent: newDiscountPercent,
          cycle_start_date: currentZenPoints.cycle_start_date || new Date().toISOString(),
          lifetime_points: newLifetimePoints,
          last_order_id: order_id,
          last_points_awarded: pointsToAward,
          last_updated: new Date().toISOString(),
        },
      },
    })

    console.log(`[Zen Points API] Awarded ${pointsToAward} points to ${customerEmail} for order ${order_id}`)
    console.log(`[Zen Points API] New balance: ${newBalance}, Tier: ${newTier}, Discount: ${newDiscountPercent}%`)

    return res.status(200).json({
      success: true,
      points_awarded: pointsToAward,
      current_balance: newBalance,
      tier: newTier,
      discount_percent: newDiscountPercent,
    })

  } catch (error: any) {
    console.error(`[Zen Points API] Error awarding points for order ${order_id}:`, error)
    return res.status(500).json({
      error: "Failed to award points",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
