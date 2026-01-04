import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

interface UpdateOrderMetadataBody {
  zen_tier_discount?: {
    tier: string
    percent: number
    amount: number
  }
  custom_shipping?: {
    priceEUR: number
    zoneName: string
    deliveryTime: string
  }
}

/**
 * PATCH /store/orders/:id/metadata
 *
 * Updates order metadata for storing Zen tier discount and custom shipping info.
 * This is called after order completion to transfer data from cart/checkout.
 *
 * Since Medusa v2 doesn't automatically transfer cart metadata to order,
 * we need this endpoint to persist the information.
 *
 * Accepts either or both:
 * - zen_tier_discount: Zen Points tier discount applied at checkout
 * - custom_shipping: Calculated shipping with exchange rate (EUR price)
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = req.body as UpdateOrderMetadataBody

  if (!id) {
    return res.status(400).json({
      success: false,
      error: "Order ID is required",
    })
  }

  // Require at least one field to update
  if (!body.zen_tier_discount && !body.custom_shipping) {
    return res.status(400).json({
      success: false,
      error: "At least one of zen_tier_discount or custom_shipping is required",
    })
  }

  try {
    const orderModule = req.scope.resolve(Modules.ORDER)

    // Retrieve current order to get existing metadata
    const order = await orderModule.retrieveOrder(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      })
    }

    // Merge new metadata with existing
    const currentMetadata = (order.metadata as Record<string, any>) || {}
    const updatedMetadata = {
      ...currentMetadata,
      ...(body.zen_tier_discount && { zen_tier_discount: body.zen_tier_discount }),
      ...(body.custom_shipping && { custom_shipping: body.custom_shipping }),
    }

    // Update the order metadata
    await orderModule.updateOrders([{
      id,
      metadata: updatedMetadata,
    }])

    const updates: string[] = []
    if (body.zen_tier_discount) updates.push('zen_tier_discount')
    if (body.custom_shipping) updates.push('custom_shipping')
    console.log(`[Order Metadata] Updated order ${id} with: ${updates.join(', ')}`)

    return res.status(200).json({
      success: true,
      order_id: id,
      ...(body.zen_tier_discount && { zen_tier_discount: body.zen_tier_discount }),
      ...(body.custom_shipping && { custom_shipping: body.custom_shipping }),
    })

  } catch (error: any) {
    console.error(`[Order Metadata] ❌ Error updating order ${id}:`, error.message)

    return res.status(500).json({
      success: false,
      error: "Failed to update order metadata",
      message: process.env.NODE_ENV === "development" ? error.message : "Internal server error",
    })
  }
}
