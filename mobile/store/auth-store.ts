import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer, syncCustomerWithMedusa, getCustomerByClerkId } from '../lib/api/auth';

interface AuthState {
  customer: Customer | null;
  isLoading: boolean;
  syncError: string | null;
  lastSyncAt: number | null;

  // Actions
  setCustomer: (customer: Customer | null) => void;
  syncWithMedusa: (
    clerkUser: {
      id: string;
      emailAddresses: { emailAddress: string }[];
      firstName: string | null;
      lastName: string | null;
    },
    getToken: () => Promise<string | null>,
    cartId?: string
  ) => Promise<void>;
  clearCustomer: () => void;

  // Computed helpers
  getZenPoints: () => Customer['metadata']['zen_points'] | null;
  getZenTier: () => 'seed' | 'sprout' | 'blossom' | 'lotus';
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      isLoading: false,
      syncError: null,
      lastSyncAt: null,

      setCustomer: (customer) => set({ customer }),

      syncWithMedusa: async (clerkUser, getToken, cartId) => {
        set({ isLoading: true, syncError: null });

        try {
          const result = await syncCustomerWithMedusa(
            {
              clerk_id: clerkUser.id,
              email: clerkUser.emailAddresses[0]?.emailAddress || '',
              first_name: clerkUser.firstName || undefined,
              last_name: clerkUser.lastName || undefined,
              cartId,
            },
            getToken
          );

          set({
            customer: result.customer,
            isLoading: false,
            lastSyncAt: Date.now(),
          });
        } catch (error) {
          if (__DEV__) console.error('Failed to sync customer:', error);
          set({
            syncError: error instanceof Error ? error.message : 'Sync failed',
            isLoading: false,
          });
        }
      },

      clearCustomer: () => set({ customer: null, syncError: null, lastSyncAt: null }),

      getZenPoints: () => {
        const customer = get().customer;
        return customer?.metadata?.zen_points || null;
      },

      getZenTier: () => {
        const zenPoints = get().getZenPoints();
        return zenPoints?.tier || 'seed';
      },
    }),
    {
      name: 'baucis-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        customer: state.customer,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
