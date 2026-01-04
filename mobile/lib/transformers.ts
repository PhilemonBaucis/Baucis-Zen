/**
 * Transform Medusa product data into clean UI objects.
 * Handles the complexity of Medusa's nested data structure.
 * Supports multi-language translations via product metadata.
 */

export interface TransformedProduct {
  id: string;
  variantId: string | undefined;
  title: string;
  subtitle: string | null;
  handle: string;
  description: string | null;
  originalTitle: string;
  originalSubtitle: string | null;
  originalDescription: string | null;
  image: string | undefined;
  images: string[];
  price: number; // In cents
  currency: string;
  isSoldOut: boolean;
  inventoryQuantity: number | undefined;
  allowBackorder: boolean;
  hasTranslations: boolean;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  originCountry: string | null;
  material: string | null;
}

export interface TransformedCartItem {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  description: string | null;
  image: string | undefined;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: string;
}

export function transformProduct(product: any, locale: string = 'en'): TransformedProduct {
  const variant = product.variants?.[0];
  const priceObj = variant?.calculated_price;

  // Get translations from metadata if available
  const translations = product.metadata?.translations || {};

  // Use translated title/subtitle/description if available, fallback to default
  const title = translations.title?.[locale] || product.title;
  const subtitle = translations.subtitle?.[locale] || product.subtitle;
  const description = translations.description?.[locale] || product.description;

  // Get all image URLs
  const images: string[] = product.images?.map((img: any) => img.url) || [];
  if (product.thumbnail && !images.includes(product.thumbnail)) {
    images.unshift(product.thumbnail);
  }

  return {
    id: product.id,
    variantId: variant?.id,
    title,
    subtitle,
    handle: product.handle,
    description,
    originalTitle: product.title,
    originalSubtitle: product.subtitle,
    originalDescription: product.description,
    image: product.thumbnail || product.images?.[0]?.url,
    images: images.length > 0 ? images : [product.thumbnail].filter(Boolean),
    price: priceObj?.calculated_amount || 0,
    currency: priceObj?.currency_code || 'EUR',
    isSoldOut: !variant || variant.inventory_quantity === 0,
    inventoryQuantity: variant?.inventory_quantity,
    allowBackorder: variant?.allow_backorder || false,
    hasTranslations: !!translations.title && Object.keys(translations.title).length > 1,
    weight: product.weight,
    length: product.length,
    width: product.width,
    height: product.height,
    originCountry: product.origin_country,
    material: product.material,
  };
}

export function transformCartItem(item: any): TransformedCartItem {
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
  };
}

/**
 * Format price from cents to display string
 */
export function formatPrice(amountInCents: number, currency: string = 'EUR'): string {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}
