import type { MedusaContainer } from "@medusajs/types"
import { Modules } from "@medusajs/utils"
import { ZEN_POINTS_CONFIG } from "../lib/zen-points-config"

/**
 * Scheduled job to reset Zen Points monthly
 * Runs daily at midnight to check which customers need their points reset
 */
export default async function zenPointsResetHandler(container: MedusaContainer) {
  console.log("[Zen Points Reset] Starting monthly reset check...")

  try {
    const customerModule = container.resolve(Modules.CUSTOMER)

    // Get all customers with zen_points metadata
    // We'll need to iterate through all customers and check their cycle_start_date
    let offset = 0
    const limit = 100
    let processedCount = 0
    let resetCount = 0

    while (true) {
      const [customers, count] = await customerModule.listAndCountCustomers(
        {},
        { skip: offset, take: limit }
      )

      if (customers.length === 0) break

      const now = new Date()

      for (const customer of customers) {
        const metadata = (customer.metadata as Record<string, any>) || {}
        const zenPoints = metadata.zen_points

        if (!zenPoints) continue

        processedCount++

        // Check if cycle has expired
        const cycleStartDate = zenPoints.cycle_start_date
          ? new Date(zenPoints.cycle_start_date)
          : null

        if (!cycleStartDate) continue

        const daysSinceCycleStart = Math.floor(
          (now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceCycleStart >= ZEN_POINTS_CONFIG.CYCLE_DAYS) {
          // Reset points and start new cycle
          const previousBalance = zenPoints.current_balance || 0

          await customerModule.updateCustomers(customer.id, {
            metadata: {
              ...metadata,
              zen_points: {
                current_balance: 0,
                tier: 'seed',
                discount_percent: 0,
                cycle_start_date: now.toISOString(),
                lifetime_points: zenPoints.lifetime_points || 0,
                previous_cycle_balance: previousBalance,
                previous_cycle_end: zenPoints.cycle_start_date,
                last_reset: now.toISOString(),
              },
            },
          })

          resetCount++
          console.log(
            `[Zen Points Reset] Reset ${customer.email}: ${previousBalance} points -> 0`
          )
        }
      }

      offset += limit
      if (offset >= count) break
    }

    console.log(
      `[Zen Points Reset] Completed. Processed: ${processedCount}, Reset: ${resetCount}`
    )
  } catch (error) {
    console.error("[Zen Points Reset] Error:", error)
    throw error
  }
}

// Job configuration
export const config = {
  name: "zen-points-monthly-reset",
  // Run every day at midnight
  schedule: "0 0 * * *",
}

