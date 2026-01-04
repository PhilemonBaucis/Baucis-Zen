import { storeApi, REGION_ID } from './client';
import { transformProduct, type TransformedProduct } from '../transformers';

export async function getProducts(locale: string = 'en'): Promise<TransformedProduct[]> {
  try {
    const { products } = await storeApi.products.list({
      fields: '+images,+variants.calculated_price,+variants.inventory_quantity,+metadata',
      limit: 50,
      region_id: REGION_ID,
    });

    return (products || []).map((product: any) => transformProduct(product, locale));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function getProductByHandle(handle: string, locale: string = 'en'): Promise<TransformedProduct | null> {
  try {
    const { products } = await storeApi.products.listByHandle(handle, {
      fields: '+images,+variants.calculated_price,+variants.inventory_quantity,+metadata',
      region_id: REGION_ID,
    });

    if (!products || products.length === 0) return null;
    return transformProduct(products[0], locale);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function getProductById(id: string, locale: string = 'en'): Promise<TransformedProduct | null> {
  try {
    const { product } = await storeApi.products.retrieve(id, {
      fields: '+images,+variants.calculated_price,+variants.inventory_quantity,+metadata',
      region_id: REGION_ID,
    });

    return transformProduct(product, locale);
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}
