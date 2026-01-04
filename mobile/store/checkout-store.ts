import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Address, ShippingOption, TierDiscount, storeApi } from '@/lib/api/client';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'confirmation';
type PaymentMethod = 'cod' | 'pok' | null;

interface CheckoutState {
  // Step tracking
  step: CheckoutStep;

  // Address
  shippingAddress: Address | null;
  billingAddress: Address | null;
  useShippingAsBilling: boolean;

  // Shipping
  shippingOption: ShippingOption | null;
  shippingLoading: boolean;

  // Payment
  paymentMethod: PaymentMethod;
  availablePaymentMethods: string[];
  isPhoneVerified: boolean;
  verifiedPhone: string | null;

  // POK Pay
  pokOrderId: string | null;
  pokConfirmUrl: string | null;

  // Discounts
  tierDiscount: TierDiscount | null;

  // Order result
  completedOrderId: string | null;

  // Actions
  setStep: (step: CheckoutStep) => void;
  setShippingAddress: (address: Address | null) => void;
  setBillingAddress: (address: Address | null) => void;
  setUseShippingAsBilling: (value: boolean) => void;
  setShippingOption: (option: ShippingOption | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setIsPhoneVerified: (verified: boolean, phone?: string) => void;
  setTierDiscount: (discount: TierDiscount | null) => void;
  setPokOrderData: (orderId: string | null, confirmUrl: string | null) => void;
  setCompletedOrderId: (orderId: string | null) => void;
  setAvailablePaymentMethods: (methods: string[]) => void;

  // API actions
  calculateShipping: (countryCode: string, city: string, cartId?: string) => Promise<void>;
  fetchAvailablePayments: (cartId: string) => Promise<void>;
  sendPhoneVerification: (phone: string, token: string) => Promise<boolean>;
  verifyPhoneCode: (phone: string, code: string, token: string) => Promise<boolean>;
  applyTierDiscount: (cartId: string, clerkId: string, token: string) => Promise<TierDiscount | null>;
  createPokOrder: (cartId: string, amount: number, currency: string, discountAmount?: number, shippingAmount?: number) => Promise<{ orderId: string; confirmUrl: string } | null>;
  checkPokStatus: (pokOrderId: string) => Promise<string>;

  // Reset
  resetCheckout: () => void;
}

const initialState = {
  step: 'address' as CheckoutStep,
  shippingAddress: null,
  billingAddress: null,
  useShippingAsBilling: true,
  shippingOption: null,
  shippingLoading: false,
  paymentMethod: null,
  availablePaymentMethods: [],
  isPhoneVerified: false,
  verifiedPhone: null,
  tierDiscount: null,
  pokOrderId: null,
  pokConfirmUrl: null,
  completedOrderId: null,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStep: (step) => set({ step }),

      setShippingAddress: (address) => set({ shippingAddress: address }),

      setBillingAddress: (address) => set({ billingAddress: address }),

      setUseShippingAsBilling: (value) => set({ useShippingAsBilling: value }),

      setShippingOption: (option) => set({ shippingOption: option }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),

      setIsPhoneVerified: (verified, phone) => set({
        isPhoneVerified: verified,
        verifiedPhone: verified ? phone : null,
      }),

      setTierDiscount: (discount) => set({ tierDiscount: discount }),

      setPokOrderData: (orderId, confirmUrl) => set({
        pokOrderId: orderId,
        pokConfirmUrl: confirmUrl,
      }),

      setCompletedOrderId: (orderId) => set({ completedOrderId: orderId }),

      setAvailablePaymentMethods: (methods) => set({ availablePaymentMethods: methods }),

      calculateShipping: async (countryCode, city, cartId) => {
        set({ shippingLoading: true });
        try {
          const response = await storeApi.shipping.calculate({
            country_code: countryCode,
            city,
            cart_id: cartId,
          });

          if (response.shipping) {
            set({
              shippingOption: {
                zone: response.shipping.zone,
                priceEUR: response.shipping.priceEUR,
                priceALL: response.shipping.priceALL,
                deliveryTime: response.shipping.deliveryTime,
              },
            });
          }
        } catch (error) {
          if (__DEV__) console.error('Failed to calculate shipping:', error);
        } finally {
          set({ shippingLoading: false });
        }
      },

      fetchAvailablePayments: async (cartId) => {
        try {
          const response = await storeApi.payment.getAvailable(cartId);
          const methods = response.available_methods || ['cod', 'pok']; // Default fallback
          set({ availablePaymentMethods: methods });
        } catch (error) {
          if (__DEV__) console.error('Failed to fetch payment methods:', error);
          // Fallback to both methods
          set({ availablePaymentMethods: ['cod', 'pok'] });
        }
      },

      sendPhoneVerification: async (phone, token) => {
        try {
          await storeApi.phone.sendCode(phone, token);
          return true;
        } catch (error) {
          if (__DEV__) console.error('Failed to send verification code:', error);
          return false;
        }
      },

      verifyPhoneCode: async (phone, code, token) => {
        try {
          const response = await storeApi.phone.verifyCode(phone, code, token);
          if (response.verified) {
            set({ isPhoneVerified: true, verifiedPhone: phone });
            return true;
          }
          return false;
        } catch (error) {
          if (__DEV__) console.error('Failed to verify code:', error);
          return false;
        }
      },

      applyTierDiscount: async (cartId, clerkId, token) => {
        try {
          const response = await storeApi.cart.applyTierDiscount(cartId, clerkId, token);
          if (response.discount) {
            const discount: TierDiscount = {
              tier: response.discount.tier,
              percent: response.discount.percent,
              amount: response.discount.amount,
            };
            set({ tierDiscount: discount });
            return discount;
          }
          return null;
        } catch (error) {
          if (__DEV__) console.error('Failed to apply tier discount:', error);
          return null;
        }
      },

      createPokOrder: async (cartId, amount, currency, discountAmount, shippingAmount) => {
        try {
          const response = await storeApi.pok.createOrder({
            cart_id: cartId,
            amount,
            currency,
            discount_amount: discountAmount,
            shipping_amount: shippingAmount,
          });

          if (response.orderId && response.confirmUrl) {
            set({
              pokOrderId: response.orderId,
              pokConfirmUrl: response.confirmUrl,
            });
            return {
              orderId: response.orderId,
              confirmUrl: response.confirmUrl,
            };
          }
          return null;
        } catch (error) {
          if (__DEV__) console.error('Failed to create POK order:', error);
          return null;
        }
      },

      checkPokStatus: async (pokOrderId) => {
        try {
          const response = await storeApi.pok.getStatus(pokOrderId);
          return response.status || 'pending';
        } catch (error) {
          if (__DEV__) console.error('Failed to check POK status:', error);
          return 'error';
        }
      },

      resetCheckout: () => set(initialState),
    }),
    {
      name: 'baucis-checkout',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPhoneVerified: state.isPhoneVerified,
        verifiedPhone: state.verifiedPhone,
      }),
    }
  )
);
