import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ZEN_POINTS_CONFIG, getTiersForAPI } from "../../../lib/zen-points-config"
import { STOCK_CONFIG } from "../../../lib/stock-config"

/**
 * GET /store/config
 * 
 * Returns all frontend-needed configuration for Zen Points and Stock settings.
 * This centralizes business logic configuration so the frontend doesn't need
 * to maintain its own copies.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const config = {
      zenPoints: {
        tiers: getTiersForAPI(),
        pointsPerEuro: ZEN_POINTS_CONFIG.POINTS_PER_EURO,
        cycleDays: ZEN_POINTS_CONFIG.CYCLE_DAYS,
        signupBonus: ZEN_POINTS_CONFIG.SIGNUP_BONUS,
      },
      stock: {
        thresholds: STOCK_CONFIG.THRESHOLDS,
        leadTimes: STOCK_CONFIG.LEAD_TIMES,
      },
    }

    return res.status(200).json(config)
  } catch (error: any) {
    console.error("[Config API] Error:", error.message)
    return res.status(500).json({
      error: "Failed to retrieve configuration",
      message: error.message,
    })
  }
}

