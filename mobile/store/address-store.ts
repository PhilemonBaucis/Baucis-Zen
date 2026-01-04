import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeApi, Address } from '@/lib/api/client';

interface AddressState {
  addresses: Address[];
  selectedAddress: Address | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAddresses: (token: string) => Promise<void>;
  createAddress: (data: Omit<Address, 'id'>, token: string) => Promise<Address | null>;
  updateAddress: (id: string, data: Partial<Address>, token: string) => Promise<Address | null>;
  deleteAddress: (id: string, token: string) => Promise<boolean>;
  setDefault: (id: string, token: string) => Promise<boolean>;
  selectAddress: (address: Address | null) => void;
  clearAddresses: () => void;
}

const MAX_ADDRESSES = 4;

export const useAddressStore = create<AddressState>()(
  persist(
    (set, get) => ({
      addresses: [],
      selectedAddress: null,
      isLoading: false,
      error: null,

      fetchAddresses: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await storeApi.addresses.list(token);
          const addresses = response.addresses || [];
          set({ addresses, isLoading: false });

          // Auto-select default address if none selected
          if (!get().selectedAddress && addresses.length > 0) {
            const defaultAddr = addresses.find((a: Address) => a.is_default_shipping) || addresses[0];
            set({ selectedAddress: defaultAddr });
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      createAddress: async (data: Omit<Address, 'id'>, token: string) => {
        const { addresses } = get();
        if (addresses.length >= MAX_ADDRESSES) {
          set({ error: `Maximum ${MAX_ADDRESSES} addresses allowed` });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          // Set as default if first address
          const isFirst = addresses.length === 0;
          const addressData = {
            ...data,
            is_default_shipping: isFirst,
          };

          const response = await storeApi.addresses.create(addressData, token);
          const newAddress = response.address;

          // Refresh addresses list
          await get().fetchAddresses(token);

          return newAddress;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      updateAddress: async (id: string, data: Partial<Address>, token: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await storeApi.addresses.update(id, data, token);
          const updatedAddress = response.address;

          // Refresh addresses list
          await get().fetchAddresses(token);

          // Update selected address if it was the one edited
          if (get().selectedAddress?.id === id) {
            set({ selectedAddress: updatedAddress });
          }

          return updatedAddress;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      deleteAddress: async (id: string, token: string) => {
        set({ isLoading: true, error: null });
        try {
          await storeApi.addresses.delete(id, token);

          // Clear selected if it was deleted
          if (get().selectedAddress?.id === id) {
            set({ selectedAddress: null });
          }

          // Refresh addresses list
          await get().fetchAddresses(token);

          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      setDefault: async (id: string, token: string) => {
        set({ isLoading: true, error: null });
        try {
          await storeApi.addresses.setDefault(id, token);

          // Refresh addresses list
          await get().fetchAddresses(token);

          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      selectAddress: (address: Address | null) => {
        set({ selectedAddress: address });
      },

      clearAddresses: () => {
        set({ addresses: [], selectedAddress: null, error: null });
      },
    }),
    {
      name: 'baucis-addresses',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedAddress: state.selectedAddress,
      }),
    }
  )
);
