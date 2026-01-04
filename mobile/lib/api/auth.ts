import { authenticatedFetch, MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from './client';

export interface Customer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  has_account: boolean;
  metadata: {
    clerk_id?: string;
    zen_points?: {
      current_balance: number;
      tier: 'seed' | 'sprout' | 'blossom' | 'lotus';
      discount_percent: number;
      cycle_start_date: string;
      lifetime_points: number;
      signup_bonus_applied: boolean;
    };
    active_cart_id?: string;
  };
}

export interface SyncCustomerParams {
  clerk_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  cartId?: string;
}

export async function syncCustomerWithMedusa(
  params: SyncCustomerParams,
  getToken: () => Promise<string | null>
): Promise<{ success: boolean; customer: Customer; action: 'created' | 'updated' }> {
  const token = await getToken();

  const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      clerk_id: params.clerk_id,
      email: params.email,
      first_name: params.first_name || null,
      last_name: params.last_name || null,
      phone: params.phone || null,
      ...(params.cartId ? { cartId: params.cartId } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Sync failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getCustomerByClerkId(
  clerkId: string,
  getToken: () => Promise<string | null>
): Promise<{ exists: boolean; customer: Customer | null }> {
  const token = await getToken();

  const response = await fetch(`${MEDUSA_BACKEND_URL}/store/customers/sync?clerk_id=${clerkId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { exists: false, customer: null };
    }
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}
