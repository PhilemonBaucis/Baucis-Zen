import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeApi, REGION_ID } from '../lib/api/client';
import { transformCartItem, TransformedCartItem } from '../lib/transformers';

interface CartState {
  cartId: string | null;
  items: TransformedCartItem[];
  subtotal: number;
  total: number;
  itemCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  initializeCart: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      subtotal: 0,
      total: 0,
      itemCount: 0,
      isLoading: false,
      error: null,

      initializeCart: async () => {
        const { cartId } = get();

        if (cartId) {
          // Try to load existing cart
          try {
            await get().refreshCart();
            return;
          } catch (error) {
            // Cart expired or invalid, create new one
            if (__DEV__) console.log('Existing cart invalid, creating new one');
          }
        }

        // Create new cart
        set({ isLoading: true, error: null });
        try {
          const { cart } = await storeApi.cart.create({
            region_id: REGION_ID,
          });

          set({
            cartId: cart.id,
            items: [],
            subtotal: 0,
            total: 0,
            itemCount: 0,
            isLoading: false,
          });
        } catch (error) {
          if (__DEV__) console.error('Failed to create cart:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create cart',
            isLoading: false,
          });
        }
      },

      addItem: async (variantId, quantity = 1) => {
        const { cartId } = get();
        if (!cartId) {
          await get().initializeCart();
        }

        const currentCartId = get().cartId;
        if (!currentCartId) return;

        set({ isLoading: true, error: null });
        try {
          await storeApi.cart.createLineItem(currentCartId, {
            variant_id: variantId,
            quantity,
          });

          await get().refreshCart();
        } catch (error) {
          if (__DEV__) console.error('Failed to add item:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to add item',
            isLoading: false,
          });
        }
      },

      updateItem: async (lineItemId, quantity) => {
        const { cartId } = get();
        if (!cartId) return;

        set({ isLoading: true, error: null });
        try {
          if (quantity <= 0) {
            await get().removeItem(lineItemId);
            return;
          }

          await storeApi.cart.updateLineItem(cartId, lineItemId, {
            quantity,
          });

          await get().refreshCart();
        } catch (error) {
          if (__DEV__) console.error('Failed to update item:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to update item',
            isLoading: false,
          });
        }
      },

      removeItem: async (lineItemId) => {
        const { cartId } = get();
        if (!cartId) return;

        set({ isLoading: true, error: null });
        try {
          await storeApi.cart.deleteLineItem(cartId, lineItemId);
          await get().refreshCart();
        } catch (error) {
          if (__DEV__) console.error('Failed to remove item:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to remove item',
            isLoading: false,
          });
        }
      },

      clearCart: () => {
        set({
          cartId: null,
          items: [],
          subtotal: 0,
          total: 0,
          itemCount: 0,
          error: null,
        });
      },

      refreshCart: async () => {
        const { cartId } = get();
        if (!cartId) return;

        try {
          const { cart } = await storeApi.cart.retrieve(cartId);

          const items = (cart.items || []).map(transformCartItem);
          const itemCount = items.reduce((sum: number, item: TransformedCartItem) => sum + item.quantity, 0);

          set({
            items,
            subtotal: cart.subtotal || 0,
            total: cart.total || 0,
            itemCount,
            isLoading: false,
          });
        } catch (error) {
          if (__DEV__) console.error('Failed to refresh cart:', error);
          // Cart might be expired
          set({
            cartId: null,
            items: [],
            subtotal: 0,
            total: 0,
            itemCount: 0,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'baucis-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        cartId: state.cartId,
      }),
    }
  )
);
