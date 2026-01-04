import { sdk } from './config';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

/**
 * Checkout utility functions for Baucis Zen
 */

/**
 * Calculate shipping cost via our custom shipping API
 * Uses Ultra C.E.P contract rates and real-time exchange rates
 * Weight is calculated automatically from cart items in the backend
 * 
 * @param {string} city - Destination city
 * @param {string} country - ISO country code (AL, XK)
 * @param {string} cartId - Cart ID (weight calculated from cart items in backend)
 * @returns {Promise<Object>} Shipping calculation result
 */
export async function calculateShipping(city, country, cartId) {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/shipping/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY || '',
      },
      body: JSON.stringify({
        city,
        country: country?.toUpperCase() || 'AL',
        cart_id: cartId, // Backend calculates weight from cart items
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Shipping Calculate] API error:', data);
      return {
        available: false,
        error: data.message || 'Failed to calculate shipping',
      };
    }
    
    return data;
  } catch (error) {
    console.error('[Shipping Calculate] Network error:', error);
    return {
      available: false,
      error: 'Unable to calculate shipping. Please try again.',
    };
  }
}

/**
 * Get all shipping zones with current prices
 * @returns {Promise<Object>} All shipping zones
 */
export async function getShippingZones() {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/shipping/calculate`, {
      method: 'GET',
      headers: {
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY || '',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch shipping zones');
    }
    
    return await response.json();
  } catch (error) {
    console.error('[Shipping Zones] Error:', error);
    return { zones: [], error: error.message };
  }
}

/**
 * Get all available regions from Medusa
 */
export async function getRegions() {
  try {
    const { regions } = await sdk.store.region.list();
    return regions || [];
  } catch (error) {
    console.error('Failed to get regions:', error);
    return [];
  }
}

/**
 * Find region ID for a given country code
 */
export async function getRegionForCountry(countryCode) {
  try {
    const regions = await getRegions();
    // Find region that includes this country
    for (const region of regions) {
      const countries = region.countries || [];
      if (countries.some(c => c.iso_2?.toLowerCase() === countryCode?.toLowerCase())) {
        return region.id;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to find region for country:', error);
    return null;
  }
}

/**
 * Update cart region if country changes
 */
export async function updateCartRegion(cartId, countryCode) {
  try {
    const regionId = await getRegionForCountry(countryCode);
    if (regionId) {
      const { cart } = await sdk.store.cart.update(cartId, {
        region_id: regionId,
      });
      return cart;
    }
    return null;
  } catch (error) {
    // Silently handle - custom shipping calculation will work regardless
    console.log('[Checkout] Could not update cart region:', error.message);
    return null;
  }
}

/**
 * Set shipping address on cart
 * Automatically updates cart region if country changes
 */
export async function setShippingAddress(cartId, address) {
  try {
    // First, update cart region if needed for the selected country
    const countryCode = address.countryCode?.toLowerCase() || 'al';
    await updateCartRegion(cartId, countryCode);
    
    // Then set the shipping address
    const { cart } = await sdk.store.cart.update(cartId, {
      shipping_address: {
        first_name: address.firstName,
        last_name: address.lastName,
        address_1: address.address1,
        address_2: address.address2 || '',
        city: address.city,
        country_code: countryCode,
        province: address.province || '',
        postal_code: address.postalCode || '',
        phone: address.phone,
      },
      email: address.email,
    });
    return cart;
  } catch (error) {
    // If region mismatch still occurs, log but don't fail
    // Custom shipping calculation handles this
    if (error.message?.includes('not within region')) {
      console.log('[Checkout] Region mismatch, using custom shipping');
      return null;
    }
    console.error('Failed to set shipping address:', error);
    throw error;
  }
}

/**
 * Set billing address (same as shipping by default)
 */
export async function setBillingAddress(cartId, address) {
  try {
    const { cart } = await sdk.store.cart.update(cartId, {
      billing_address: {
        first_name: address.firstName,
        last_name: address.lastName,
        address_1: address.address1,
        address_2: address.address2 || '',
        city: address.city,
        country_code: address.countryCode?.toLowerCase() || 'al',
        province: address.province || '',
        postal_code: address.postalCode || '',
        phone: address.phone,
      },
    });
    return cart;
  } catch (error) {
    // If region mismatch, log but don't fail
    if (error.message?.includes('not within region')) {
      console.log('[Checkout] Billing region mismatch, continuing');
      return null;
    }
    console.error('Failed to set billing address:', error);
    throw error;
  }
}

/**
 * Get available shipping options for the cart
 */
export async function getShippingOptions(cartId) {
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    });
    return shipping_options || [];
  } catch (error) {
    // Silently handle - this can fail for countries not configured in Medusa regions
    // We use custom shipping calculation instead
    return [];
  }
}

/**
 * Set shipping method on cart
 */
export async function setShippingMethod(cartId, shippingOptionId) {
  try {
    const { cart } = await sdk.store.cart.addShippingMethod(cartId, {
      option_id: shippingOptionId,
    });
    return cart;
  } catch (error) {
    console.error('Failed to set shipping method:', error);
    throw error;
  }
}

/**
 * Get available payment providers
 */
export async function getPaymentProviders(regionId) {
  try {
    const { payment_providers } = await sdk.store.payment.listPaymentProviders({
      region_id: regionId,
    });
    return payment_providers || [];
  } catch (error) {
    console.error('Failed to get payment providers:', error);
    return [];
  }
}

/**
 * Initialize payment session
 * For COD (pp_system_default), we use the system default payment provider
 * 
 * NOTE: The Medusa SDK's initiatePaymentSession expects the ENTIRE cart object,
 * not just the cart ID. It uses cart.payment_collection?.id to check for existing
 * payment collection, and cart.id to create one if needed.
 */
export async function initializePaymentSession(cart, providerId) {
  if (!cart?.id) {
    throw new Error('Cart object with ID is required');
  }
  
  try {
    // For COD, try to initialize with system default
    // Pass the entire cart object as required by Medusa SDK
    const { payment_collection } = await sdk.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId,
    });
    return payment_collection;
  } catch (error) {
    console.error('Failed to initialize payment session:', error);
    
    // For COD orders, if payment session fails, we can still try to complete
    // This handles cases where payment collection isn't required
    if (providerId === 'pp_system_default') {
      console.log('COD payment session init failed, will try direct completion');
      return null; // Allow continuation for COD
    }
    
    throw error;
  }
}

/**
 * Complete the order (checkout)
 */
export async function completeOrder(cartId) {
  try {
    const { type, order, cart, error } = await sdk.store.cart.complete(cartId);

    if (type === 'order' && order) {
      // Clear cart from localStorage on successful order
      // Remove both cart ID and expiry keys
      if (typeof window !== 'undefined') {
        localStorage.removeItem('baucis_cart_id');
        localStorage.removeItem('baucis_cart_expiry');
      }
      return { success: true, order };
    }

    return { success: false, error: error || 'Failed to complete order', cart };
  } catch (error) {
    console.error('Failed to complete order:', error);
    throw error;
  }
}

/**
 * Retrieve cart with full details
 */
export async function getCartWithDetails(cartId) {
  try {
    const { cart } = await sdk.store.cart.retrieve(cartId, {
      fields: '+items,+items.variant,+items.variant.product,+shipping_address,+billing_address,+shipping_methods,+payment_collection',
    });
    return cart;
  } catch (error) {
    console.error('Failed to retrieve cart:', error);
    throw error;
  }
}

/**
 * Format price from cents
 */
export function formatPrice(amount, currency = 'EUR') {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'EUR',
  }).format(amount);
}
