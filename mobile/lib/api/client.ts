// Direct API client (Medusa JS SDK doesn't work with React Native)

const MEDUSA_BACKEND_URL = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const REGION_ID = process.env.EXPO_PUBLIC_MEDUSA_REGION_ID || '';

// Security: Require HTTPS in production, allow HTTP only in development
if (!MEDUSA_BACKEND_URL) {
  throw new Error('EXPO_PUBLIC_MEDUSA_BACKEND_URL environment variable is required');
}
if (!__DEV__ && !MEDUSA_BACKEND_URL.startsWith('https://')) {
  throw new Error('MEDUSA_BACKEND_URL must use HTTPS in production');
}

// Base fetch with common headers
async function medusaFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${MEDUSA_BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Types
export interface Address {
  id?: string;
  address_name?: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  postal_code?: string;
  country_code: string;
  phone?: string;
  is_default_shipping?: boolean;
  metadata?: Record<string, any>;
}

export interface ShippingOption {
  zone: string;
  priceEUR: number;
  priceALL?: number;
  deliveryTime: string;
}

export interface Order {
  id: string;
  display_id: number;
  status: string;
  fulfillment_status?: string;
  items: any[];
  total: number;
  subtotal: number;
  shipping_total: number;
  discount_total?: number;
  shipping_address?: Address;
  billing_address?: Address;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TierDiscount {
  tier: string;
  percent: number;
  amount: number;
}

// Store API (replaces Medusa SDK)
export const storeApi = {
  // Products
  products: {
    list: async (params: { region_id?: string; limit?: number; fields?: string } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.region_id) searchParams.set('region_id', params.region_id);
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.fields) searchParams.set('fields', params.fields);

      return medusaFetch(`/store/products?${searchParams.toString()}`);
    },

    retrieve: async (id: string, params: { region_id?: string; fields?: string } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.region_id) searchParams.set('region_id', params.region_id);
      if (params.fields) searchParams.set('fields', params.fields);

      return medusaFetch(`/store/products/${id}?${searchParams.toString()}`);
    },

    listByHandle: async (handle: string, params: { region_id?: string; fields?: string } = {}) => {
      const searchParams = new URLSearchParams();
      searchParams.set('handle', handle);
      if (params.region_id) searchParams.set('region_id', params.region_id);
      if (params.fields) searchParams.set('fields', params.fields);

      return medusaFetch(`/store/products?${searchParams.toString()}`);
    },
  },

  // Cart
  cart: {
    create: async (data: { region_id: string }) => {
      return medusaFetch('/store/carts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    retrieve: async (id: string) => {
      return medusaFetch(`/store/carts/${id}`);
    },

    update: async (id: string, data: any) => {
      return medusaFetch(`/store/carts/${id}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    createLineItem: async (cartId: string, data: { variant_id: string; quantity: number }) => {
      return medusaFetch(`/store/carts/${cartId}/line-items`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateLineItem: async (cartId: string, lineItemId: string, data: { quantity: number }) => {
      return medusaFetch(`/store/carts/${cartId}/line-items/${lineItemId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    deleteLineItem: async (cartId: string, lineItemId: string) => {
      return medusaFetch(`/store/carts/${cartId}/line-items/${lineItemId}`, {
        method: 'DELETE',
      });
    },

    // Apply tier discount before checkout
    applyTierDiscount: async (cartId: string, clerkId: string, token: string) => {
      return medusaFetch(
        '/store/cart/apply-tier-discount',
        {
          method: 'POST',
          body: JSON.stringify({ cart_id: cartId, clerk_id: clerkId }),
        },
        token
      );
    },

    // Complete cart to create order
    complete: async (cartId: string) => {
      return medusaFetch(`/store/carts/${cartId}/complete`, {
        method: 'POST',
      });
    },

    // Add shipping method
    addShippingMethod: async (cartId: string, shippingOptionId: string) => {
      return medusaFetch(`/store/carts/${cartId}/shipping-methods`, {
        method: 'POST',
        body: JSON.stringify({ option_id: shippingOptionId }),
      });
    },
  },

  // Addresses
  addresses: {
    list: async (token: string) => {
      return medusaFetch('/store/customers/addresses', {}, token);
    },

    create: async (data: Address, token: string) => {
      return medusaFetch(
        '/store/customers/addresses',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      );
    },

    update: async (addressId: string, data: Partial<Address>, token: string) => {
      return medusaFetch(
        `/store/customers/addresses/${addressId}`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      );
    },

    delete: async (addressId: string, token: string) => {
      return medusaFetch(
        `/store/customers/addresses/${addressId}`,
        {
          method: 'DELETE',
        },
        token
      );
    },

    setDefault: async (addressId: string, token: string) => {
      return medusaFetch(
        `/store/customers/addresses/${addressId}`,
        {
          method: 'POST',
          body: JSON.stringify({ is_default_shipping: true }),
        },
        token
      );
    },
  },

  // Orders
  orders: {
    list: async (token: string, limit = 50) => {
      return medusaFetch(`/store/customers/orders?limit=${limit}`, {}, token);
    },

    get: async (orderId: string, token: string) => {
      return medusaFetch(`/store/orders/${orderId}`, {}, token);
    },

    // Get invoice PDF as blob
    getInvoice: async (orderId: string, token: string): Promise<Blob> => {
      const response = await fetch(`${MEDUSA_BACKEND_URL}/store/orders/${orderId}/invoice`, {
        headers: {
          'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }

      return response.blob();
    },

    // Update order metadata (discount, shipping)
    updateMetadata: async (
      orderId: string,
      metadata: { zen_tier_discount?: TierDiscount; custom_shipping?: ShippingOption },
      token: string
    ) => {
      return medusaFetch(
        `/store/orders/${orderId}/metadata`,
        {
          method: 'PATCH',
          body: JSON.stringify(metadata),
        },
        token
      );
    },
  },

  // Shipping
  shipping: {
    calculate: async (data: { country_code: string; city?: string; cart_id?: string }) => {
      return medusaFetch('/store/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getOptions: async (cartId: string) => {
      return medusaFetch(`/store/shipping-options?cart_id=${cartId}`);
    },
  },

  // Payment
  payment: {
    getAvailable: async (cartId: string) => {
      return medusaFetch(`/store/payment/available?cart_id=${cartId}`);
    },

    // Initialize payment for cart
    initPaymentSession: async (cartId: string, providerId: string) => {
      return medusaFetch(`/store/carts/${cartId}/payment-sessions`, {
        method: 'POST',
        body: JSON.stringify({ provider_id: providerId }),
      });
    },
  },

  // POK Pay
  pok: {
    createOrder: async (data: {
      cart_id: string;
      amount: number;
      currency: string;
      discount_amount?: number;
      shipping_amount?: number;
    }) => {
      return medusaFetch('/store/pok/create-order', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    getStatus: async (pokOrderId: string) => {
      return medusaFetch(`/store/pok/status/${pokOrderId}`);
    },

    confirm: async (pokOrderId: string, cartId: string) => {
      return medusaFetch('/store/pok/confirm', {
        method: 'POST',
        body: JSON.stringify({ pok_order_id: pokOrderId, cart_id: cartId }),
      });
    },
  },

  // Phone Verification
  phone: {
    sendCode: async (phone: string, token: string) => {
      return medusaFetch(
        '/store/verify-phone/send',
        {
          method: 'POST',
          body: JSON.stringify({ phone }),
        },
        token
      );
    },

    verifyCode: async (phone: string, code: string, token: string) => {
      return medusaFetch(
        '/store/verify-phone/check',
        {
          method: 'POST',
          body: JSON.stringify({ phone, code }),
        },
        token
      );
    },
  },

  // Memory Game
  game: {
    start: async (token: string) => {
      return medusaFetch(
        '/store/game/memory/start',
        {
          method: 'POST',
        },
        token
      );
    },

    complete: async (
      signature: string,
      deck: Array<{ id: string; type: string; pairId: string }>,
      nonce: string,
      expiresAt: string,
      timeTaken: number,
      token: string
    ) => {
      return medusaFetch(
        '/store/game/memory/complete',
        {
          method: 'POST',
          body: JSON.stringify({
            signature,
            deck,
            nonce,
            expires_at: expiresAt,
            time_taken: timeTaken,
          }),
        },
        token
      );
    },

    getStatus: async (token: string) => {
      return medusaFetch('/store/game/memory/status', {}, token);
    },
  },

  // Customer
  customer: {
    get: async (token: string) => {
      return medusaFetch('/store/customers/me', {}, token);
    },

    sync: async (clerkId: string, token: string) => {
      return medusaFetch(
        '/store/customers/sync',
        {
          method: 'POST',
          body: JSON.stringify({ clerk_id: clerkId }),
        },
        token
      );
    },

    updatePushToken: async (pushToken: string, token: string) => {
      return medusaFetch(
        '/store/customers/push-token',
        {
          method: 'POST',
          body: JSON.stringify({ push_token: pushToken }),
        },
        token
      );
    },

    updateMetadata: async (metadata: Record<string, any>, token: string) => {
      return medusaFetch(
        '/store/customers/me',
        {
          method: 'POST',
          body: JSON.stringify({ metadata }),
        },
        token
      );
    },
  },

  // Config
  config: {
    get: async () => {
      return medusaFetch('/store/config');
    },
  },
};

// Authenticated fetch helper for custom endpoints
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {},
  getToken?: () => Promise<string | null>
) {
  let token: string | null = null;
  if (getToken) {
    token = await getToken();
  }
  return medusaFetch(endpoint, options, token);
}

export { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, REGION_ID };
