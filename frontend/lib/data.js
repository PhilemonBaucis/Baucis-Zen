import { sdk } from "./config"
import { transformProduct } from "./transformers"

// Region ID from environment variable
const REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID

/**
 * Fetch all products from Medusa with locale-aware translations
 * @param {string} regionId - Medusa region ID for pricing (defaults to env variable)
 * @param {string} locale - Language code for translations (en, de, fr, it, es, tr, el, sq)
 * @returns {Promise<Array>} Array of transformed product objects
 */
export async function getProducts(regionId = REGION_ID, locale = 'en') {
  try {
    const params = {
      // Include metadata to get translations, and inventory info for stock validation
      fields: "+images,+variants.calculated_price,+variants.inventory_quantity,+variants.allow_backorder,+thumbnail,+metadata",
      limit: 50
    }
    
    // Add region_id for pricing if available
    if (regionId) {
      params.region_id = regionId
    }
    
    const { products } = await sdk.store.product.list(params)
    
    // Transform data with locale for translations
    return products.map(product => transformProduct(product, locale))
  } catch (error) {
    console.error("Medusa Fetch Error:", error)
    return []
  }
}

/**
 * Fetch a single product by handle with locale-aware translations
 * @param {string} handle - Product URL handle
 * @param {string} regionId - Medusa region ID for pricing
 * @param {string} locale - Language code for translations
 * @returns {Promise<Object|null>} Transformed product object or null if not found
 */
export async function getProductByHandle(handle, regionId = REGION_ID, locale = 'en') {
  try {
    const params = {
      handle,
      // Include metadata to get translations, and inventory info for stock validation
      fields: "+images,+variants.calculated_price,+variants.inventory_quantity,+variants.allow_backorder,+thumbnail,+metadata",
      limit: 1
    }
    
    // Add region_id for pricing if available
    if (regionId) {
      params.region_id = regionId
    }
    
    const { products } = await sdk.store.product.list(params)
    
    if (!products.length) return null
    return transformProduct(products[0], locale)
  } catch (error) {
    console.error("Medusa Product Error:", error)
    return null
  }
}
