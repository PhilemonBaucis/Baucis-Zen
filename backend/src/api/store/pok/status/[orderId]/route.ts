import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSdkOrderStatus, isPokConfigured } from "../../../../../lib/pok-payment"

/**
 * GET /store/pok/status/:orderId
 *
 * Check the status of a POK SDK Order.
 * Used for polling to detect payment completion.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Check POK configuration
  if (!isPokConfigured()) {
    return res.status(503).json({
      success: false,
      error: "POK payments not configured",
    })
  }

  const orderId = req.params.orderId

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: "orderId is required",
    })
  }

  try {
    const sdkOrder = await getSdkOrderStatus(orderId)

    return res.status(200).json({
      success: true,
      orderId: sdkOrder.id,
      isCompleted: sdkOrder.isCompleted,
      isCanceled: sdkOrder.isCanceled,
      isRefunded: sdkOrder.isRefunded,
      transactionId: sdkOrder.transactionId,
    })
  } catch (error: any) {
    console.error("[POK Status] Error:", error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to check order status",
      details: error.message,
    })
  }
}
