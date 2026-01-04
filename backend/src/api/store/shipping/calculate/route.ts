import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { 
  getShippingZone, 
  getShippingZoneById, 
  calculateWeightSurchargeALL,
  WEIGHT_SURCHARGE_ALL,
  BASE_WEIGHT_KG,
  SHIPPING_ZONES,
  isCountrySupported,
} from "../../../../lib/shipping-config"
import { convertALLtoEUR, getEURtoALLRate } from "../../../../lib/exchange-rate"

interface CalculateShippingRequest {
  city?: string;
  country: string;
  weight_kg?: number;
  cart_id?: string; // If provided, weight is calculated from cart items
}

/**
 * Calculate total weight from cart items (in kg)
 * Product weights are stored in grams on variants
 */
async function calculateCartWeight(query: any, cartId: string): Promise<number> {
  try {
    const { data: [cart] } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: { id: cartId },
    })
    
    if (!cart?.items?.length) {
      console.log("[Shipping] No items in cart, using default weight")
      return 0.1 // Minimum weight
    }
    
    let totalWeightGrams = 0
    let itemCount = 0
    
    for (const item of cart.items) {
      // Weight is stored on variant in grams
      const itemWeight = item.variant?.weight || 0
      const itemTotal = itemWeight * item.quantity
      totalWeightGrams += itemTotal
      itemCount += item.quantity
      
      console.log(`[Shipping] Item: ${item.title}, qty: ${item.quantity}, weight: ${itemWeight}g, subtotal: ${itemTotal}g`)
    }
    
    // Convert to kg, minimum 0.1kg
    const totalKg = Math.max(0.1, totalWeightGrams / 1000)
    console.log(`[Shipping] Total: ${itemCount} items, ${totalWeightGrams}g = ${totalKg}kg`)
    
    return totalKg
  } catch (error) {
    console.error("[Shipping] Failed to calculate cart weight:", error)
    return 1 // Default weight on error
  }
}

interface ShippingCalculationResult {
  available: boolean;
  zone?: string;
  zoneName?: string;
  priceEUR: number;
  priceALL?: number;
  deliveryTime: string;
  deliveryHours: number;
  weightKg: number;
  baseWeightKg: number;
  weightSurchargeALL: number;
  weightSurchargeEUR: number;
  exchangeRate: number;
  rateUpdatedAt: string;
}

/**
 * POST /store/shipping/calculate
 * 
 * Calculate shipping cost based on address and weight
 * Returns price in EUR (converted dynamically from ALL)
 * 
 * Request body:
 * {
 *   "city": "Tirana",
 *   "country": "AL",
 *   "weight_kg": 1.5
 * }
 * 
 * Response:
 * {
 *   "available": true,
 *   "zone": "tirana",
 *   "zoneName": "Tirana",
 *   "priceEUR": 2.27,
 *   "priceALL": 250,
 *   "deliveryTime": "24 hours",
 *   "deliveryHours": 24,
 *   "weightKg": 1.5,
 *   "baseWeightKg": 2,
 *   "weightSurchargeALL": 0,
 *   "weightSurchargeEUR": 0,
 *   "exchangeRate": 110.2,
 *   "rateUpdatedAt": "2025-12-21T10:00:00Z"
 * }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { city, country, weight_kg, cart_id } = req.body as CalculateShippingRequest
    
    // Validate country
    if (!country) {
      return res.status(400).json({
        error: "Country is required",
        available: false,
      })
    }
    
    // Check if country is supported
    if (!isCountrySupported(country)) {
      return res.status(200).json({
        available: false,
        message: `Shipping not available to ${country}. We currently ship to Albania (AL) and Kosovo (XK).`,
      })
    }
    
    // Get shipping zone
    const zoneId = getShippingZone(city, country)
    
    if (!zoneId) {
      return res.status(200).json({
        available: false,
        message: "Could not determine shipping zone for this address",
      })
    }
    
    const zone = getShippingZoneById(zoneId)
    
    if (!zone) {
      return res.status(200).json({
        available: false,
        message: "Shipping zone configuration not found",
      })
    }
    
    // Calculate weight: from cart if cart_id provided, else from weight_kg, else default 1kg
    let finalWeightKg = 1
    if (cart_id) {
      // Get weight from cart items (backend calculation - more secure)
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      finalWeightKg = await calculateCartWeight(query, cart_id)
      console.log(`[Shipping] Calculated weight from cart ${cart_id}: ${finalWeightKg}kg`)
    } else if (weight_kg !== undefined) {
      finalWeightKg = weight_kg
    }
    
    // Get exchange rate
    const { rate: exchangeRate, updatedAt: rateUpdatedAt } = await getEURtoALLRate()
    
    // Calculate weight surcharge
    const weightSurchargeALL = calculateWeightSurchargeALL(finalWeightKg)
    const weightSurchargeEUR = Math.round((weightSurchargeALL / exchangeRate) * 100) / 100
    
    let priceEUR: number
    let priceALL: number | undefined
    
    // Kosovo is already priced in EUR
    if (zone.priceEUR !== undefined) {
      priceEUR = zone.priceEUR + weightSurchargeEUR
      // Convert to ALL for reference
      priceALL = Math.round(zone.priceEUR * exchangeRate) + weightSurchargeALL
    } else if (zone.priceALL !== undefined) {
      // Albania zones are priced in ALL, convert to EUR
      priceALL = zone.priceALL + weightSurchargeALL
      priceEUR = Math.round((priceALL / exchangeRate) * 100) / 100
    } else {
      return res.status(500).json({
        error: "Zone has no price configured",
        available: false,
      })
    }
    
    const result: ShippingCalculationResult = {
      available: true,
      zone: zone.id,
      zoneName: zone.name,
      priceEUR,
      priceALL,
      deliveryTime: zone.deliveryText,
      deliveryHours: zone.deliveryHours,
      weightKg: finalWeightKg,
      baseWeightKg: BASE_WEIGHT_KG,
      weightSurchargeALL,
      weightSurchargeEUR,
      exchangeRate,
      rateUpdatedAt: rateUpdatedAt.toISOString(),
    }
    
    return res.status(200).json(result)
  } catch (error: any) {
    console.error("[Shipping Calculate API] Error:", error.message)
    return res.status(500).json({
      error: "Failed to calculate shipping",
      message: error.message,
      available: false,
    })
  }
}

/**
 * GET /store/shipping/calculate
 * 
 * Get all available shipping zones with current EUR prices
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Get exchange rate
    const { rate: exchangeRate, updatedAt: rateUpdatedAt } = await getEURtoALLRate()
    
    // Build zones with EUR prices
    const zones = Object.values(SHIPPING_ZONES).map(zone => {
      let priceEUR: number
      let priceALL: number | undefined
      
      if (zone.priceEUR !== undefined) {
        priceEUR = zone.priceEUR
        priceALL = Math.round(zone.priceEUR * exchangeRate)
      } else if (zone.priceALL !== undefined) {
        priceALL = zone.priceALL
        priceEUR = Math.round((zone.priceALL / exchangeRate) * 100) / 100
      } else {
        priceEUR = 0
      }
      
      return {
        id: zone.id,
        name: zone.name,
        priceEUR,
        priceALL,
        deliveryTime: zone.deliveryText,
        deliveryHours: zone.deliveryHours,
      }
    })
    
    return res.status(200).json({
      zones,
      weightSurcharge: {
        perKgALL: WEIGHT_SURCHARGE_ALL,
        perKgEUR: Math.round((WEIGHT_SURCHARGE_ALL / exchangeRate) * 100) / 100,
        baseWeightKg: BASE_WEIGHT_KG,
      },
      exchangeRate,
      rateUpdatedAt: rateUpdatedAt.toISOString(),
    })
  } catch (error: any) {
    console.error("[Shipping Calculate API] GET Error:", error.message)
    return res.status(500).json({
      error: "Failed to get shipping zones",
      message: error.message,
    })
  }
}


