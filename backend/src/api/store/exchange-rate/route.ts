import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getExchangeRateInfo, refreshExchangeRate } from "../../../lib/exchange-rate"

/**
 * GET /store/exchange-rate
 * 
 * Returns current EUR to ALL exchange rate
 * Rate is cached for 2 hours
 * 
 * Response:
 * {
 *   "base": "EUR",
 *   "target": "ALL",
 *   "rate": 110.5,
 *   "updatedAt": "2025-12-21T10:00:00Z",
 *   "fromCache": true
 * }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const rateInfo = await getExchangeRateInfo()
    
    return res.status(200).json(rateInfo)
  } catch (error: any) {
    console.error("[Exchange Rate API] Error:", error.message)
    return res.status(500).json({
      error: "Failed to fetch exchange rate",
      message: error.message,
    })
  }
}

/**
 * POST /store/exchange-rate
 * 
 * Force refresh the exchange rate cache
 * Useful for admin operations
 * 
 * Response:
 * {
 *   "success": true,
 *   "rate": 110.5,
 *   "updatedAt": "2025-12-21T10:00:00Z"
 * }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { rate, updatedAt } = await refreshExchangeRate()
    
    return res.status(200).json({
      success: true,
      base: "EUR",
      target: "ALL",
      rate,
      updatedAt: updatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("[Exchange Rate API] Refresh error:", error.message)
    return res.status(500).json({
      error: "Failed to refresh exchange rate",
      message: error.message,
    })
  }
}





