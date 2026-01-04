import type { SubscriberConfig, SubscriberArgs } from "@medusajs/framework"
import { Modules } from "@medusajs/utils"
import {
  ZEN_POINTS_CONFIG,
  calculateTier,
  getTierDiscount,
  calculatePointsForOrder
} from "../lib/zen-points-config"

// Log when subscriber is loaded (for debugging)
console.log("[Zen Points] Subscriber loaded and registered for order.placed event")

/**
 * Subscriber to award Zen Points when an order is placed
 */
export default async function zenPointsAwardHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id

  try {
    // Get the order service to retrieve order details
    const orderModule = container.resolve(Modules.ORDER)
    const customerModule = container.resolve(Modules.CUSTOMER)

    console.log(`[Zen Points] Processing order.placed event for order ${orderId}`)

    // Get the order with summary for totals
    // Note: Order entity doesn't have "customer" relation in Medusa v2, use email to find customer
    const order = await orderModule.retrieveOrder(orderId, {
      relations: ["summary", "shipping_methods"],
    })

    if (!order) {
      console.log(`[Zen Points] Order ${orderId} not found`)
      return
    }

    // Get the customer email from the order
    const customerEmail = order.email

    if (!customerEmail) {
      console.log(`[Zen Points] No customer email found for order ${orderId}`)
      return
    }

    // Find the customer by email
    const [customers] = await customerModule.listAndCountCustomers({
      email: customerEmail,
    })

    if (!customers || customers.length === 0) {
      console.log(`[Zen Points] Customer not found for email ${customerEmail}`)
      return
    }

    const customer = customers[0]

    // Get current Zen Points data to determine tier discount
    const currentMetadata = (customer.metadata as Record<string, any>) || {}
    const currentZenPoints = currentMetadata.zen_points || {
      current_balance: 0,
      tier: 'seed',
      discount_percent: 0,
      cycle_start_date: new Date().toISOString(),
      lifetime_points: 0,
    }

    // Calculate order totals
    // Medusa v2: totals are in order.summary
    const summary = (order as any).summary || {}
    const orderTotal = Number(summary.current_order_total) || Number((order as any).total) || 0
    const shippingTotal = Number((order as any).shipping_methods?.[0]?.amount) ||
                          Number((order as any).shipping_total) || 0
    const productsTotal = orderTotal - shippingTotal

    console.log(`[Zen Points] Order ${orderId} totals: order=${orderTotal}€, shipping=${shippingTotal}€, products=${productsTotal}€`)

    // Award points based on ORIGINAL products total (before discount, excluding shipping)
    // Rule: 1 point per €10 spent on products
    const pointsToAward = calculatePointsForOrder(productsTotal)

    if (pointsToAward <= 0) {
      console.log(`[Zen Points] No points to award for order ${orderId} (products: ${productsTotal}€)`)
      return
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
          last_order_id: orderId,
          last_points_awarded: pointsToAward,
          last_updated: new Date().toISOString(),
        },
      },
    })

    console.log(`[Zen Points] Awarded ${pointsToAward} points to ${customerEmail} for order ${orderId}`)
    console.log(`[Zen Points] New balance: ${newBalance}, Tier: ${newTier}, Discount: ${newDiscountPercent}%`)

  } catch (error) {
    console.error(`[Zen Points] Error awarding points for order ${orderId}:`, error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}

