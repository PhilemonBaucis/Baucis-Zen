/**
 * Transform Medusa product data into clean UI objects.
 * Handles the complexity of Medusa's nested data structure.
 * Supports multi-language translations via product metadata.
 * 
 * @param {Object} product - Raw Medusa product object
 * @param {string} locale - Language code (en, de, fr, it, es, tr, el, sq)
 * @returns {Object} Simplified product object for UI consumption
 */
export function transformProduct(product, locale = 'en') {
  const variant = product.variants?.[0]
  const priceObj = variant?.calculated_price
  
  // Get translations from metadata if available
  const translations = product.metadata?.translations || {}
  
  // Use translated title/subtitle/description if available, fallback to default
  const title = translations.title?.[locale] || product.title
  const subtitle = translations.subtitle?.[locale] || product.subtitle
  const description = translations.description?.[locale] || product.description
  
  // Get all image URLs
  const images = product.images?.map(img => img.url) || []
  if (product.thumbnail && !images.includes(product.thumbnail)) {
    images.unshift(product.thumbnail)
  }
  
  return {
    id: product.id,
    variantId: variant?.id, // Needed for cart functionality
    title,
    subtitle,
    handle: product.handle,
    description,
    // Also include original title/subtitle/description for fallback scenarios
    originalTitle: product.title,
    originalSubtitle: product.subtitle,
    originalDescription: product.description,
    // Medusa puts the main image in 'thumbnail', or the first image in 'images'
    image: product.thumbnail || product.images?.[0]?.url,
    images: images.length > 0 ? images : [product.thumbnail].filter(Boolean),
    // Store raw integer (cents) - format at display time
    price: priceObj?.calculated_amount || 0,
    currency: priceObj?.currency_code || 'EUR',
    isSoldOut: !variant || variant.inventory_quantity === 0,
    // Inventory info for stock validation
    inventoryQuantity: variant?.inventory_quantity,
    allowBackorder: variant?.allow_backorder || false,
    // Include available translations info for debugging
    hasTranslations: !!translations.title && Object.keys(translations.title).length > 1,
    // Product specifications
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    originCountry: product.origin_country,
    material: product.material,
  }
}

/**
 * Transform a Medusa cart item for UI display
 * Note: Cart items don't have translations - they use the title at time of adding
 */
export function transformCartItem(item) {
  return {
    id: item.id,
    variantId: item.variant_id,
    productId: item.product_id,
    title: item.title || item.variant?.product?.title,
    description: item.description || item.variant?.product?.description,
    image: item.thumbnail || item.variant?.product?.thumbnail,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.total,
    currency: item.variant?.calculated_price?.currency_code || 'EUR',
  }
}
