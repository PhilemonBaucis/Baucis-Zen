import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { storeApi } from '@/lib/api/client';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { PhoneVerification } from '@/components/checkout/PhoneVerification';

export default function CheckoutPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const {
    shippingAddress,
    shippingOption,
    paymentMethod,
    setPaymentMethod,
    availablePaymentMethods,
    isPhoneVerified,
    setIsPhoneVerified,
    tierDiscount,
    applyTierDiscount,
    setStep,
    createPokOrder,
    setCompletedOrderId,
  } = useCheckoutStore();

  const { cartId, items, subtotal, clearCart } = useCartStore();
  const { customer } = useAuthStore();

  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if COD is available (Albania only)
  const isCodAvailable = availablePaymentMethods.includes('cod') ||
    shippingAddress?.country_code === 'al';

  // Check if POK is available (Albania/Kosovo)
  const isPokAvailable = availablePaymentMethods.includes('pok') ||
    ['al', 'xk'].includes(shippingAddress?.country_code || '');

  useEffect(() => {
    // Redirect if no shipping info
    if (!shippingAddress || !shippingOption) {
      router.replace('/(checkout)/address');
    }
  }, [shippingAddress, shippingOption]);

  const handleSelectPayment = (method: 'cod' | 'pok') => {
    setPaymentMethod(method);
  };

  const handleContinue = async () => {
    if (!paymentMethod) {
      Alert.alert(
        t('checkout.selectPayment') || 'Select Payment',
        t('checkout.selectPaymentMessage') || 'Please select a payment method to continue'
      );
      return;
    }

    // Check if phone verification is required
    if (!isPhoneVerified) {
      setShowPhoneVerification(true);
      return;
    }

    await processOrder();
  };

  const processOrder = async () => {
    if (!cartId || items.length === 0) return;

    setIsProcessing(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Apply tier discount if user has one
      if (customer?.id && user?.id) {
        await applyTierDiscount(cartId, user.id, token);
      }

      // Use subtotal from store (already calculated)
      const itemsTotal = subtotal;

      const discountAmount = tierDiscount?.amount || 0;
      const shippingAmount = shippingOption?.priceEUR || 0;
      const totalAmount = itemsTotal - discountAmount + shippingAmount;

      if (paymentMethod === 'cod') {
        // Complete cart for COD
        await completeCODOrder(token, totalAmount);
      } else if (paymentMethod === 'pok') {
        // Create POK order and navigate to WebView
        const pokResult = await createPokOrder(
          cartId,
          totalAmount,
          'EUR',
          discountAmount,
          shippingAmount
        );

        if (pokResult) {
          router.push('/(checkout)/pok-webview');
        } else {
          throw new Error('Failed to create payment');
        }
      }
    } catch (error: any) {
      Alert.alert(
        t('checkout.error') || 'Error',
        error.message || t('checkout.errorMessage') || 'Something went wrong'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const completeCODOrder = async (token: string, totalAmount: number) => {
    if (!cartId || !shippingAddress) return;

    try {
      // Update cart with shipping address
      await storeApi.cart.update(cartId, {
        shipping_address: {
          first_name: shippingAddress.first_name,
          last_name: shippingAddress.last_name,
          address_1: shippingAddress.address_1,
          address_2: shippingAddress.address_2,
          city: shippingAddress.city,
          postal_code: shippingAddress.postal_code,
          country_code: shippingAddress.country_code,
          phone: shippingAddress.phone,
        },
      });

      // Complete the cart
      const result = await storeApi.cart.complete(cartId);

      if (result.order) {
        // Update order metadata with discount and shipping info
        if (tierDiscount || shippingOption) {
          await storeApi.orders.updateMetadata(
            result.order.id,
            {
              zen_tier_discount: tierDiscount || undefined,
              custom_shipping: shippingOption ? {
                priceEUR: shippingOption.priceEUR,
                zoneName: shippingOption.zone,
                deliveryTime: shippingOption.deliveryTime,
              } : undefined,
            },
            token
          );
        }

        setCompletedOrderId(result.order.id);
        clearCart();
        setStep('confirmation');
        router.replace('/(checkout)/confirmation');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to complete order');
    }
  };

  const handlePhoneVerified = () => {
    setShowPhoneVerification(false);
    setIsPhoneVerified(true);
    processOrder();
  };

  if (!shippingAddress || !shippingOption) {
    return null;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Progress Indicator */}
        <CheckoutProgress currentStep={3} />

        {/* Payment Methods */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('checkout.paymentMethod.title') || 'Choose Payment Method'}
          </Text>
          <Text className="text-gray-500 mb-4">
            {t('checkout.paymentMethod.subtitle') || 'Select how you want to pay'}
          </Text>

          <View className="space-y-3">
            {/* Cash on Delivery */}
            {isCodAvailable && (
              <Pressable
                onPress={() => handleSelectPayment('cod')}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 ${
                  paymentMethod === 'cod'
                    ? 'border-primary-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${
                      paymentMethod === 'cod' ? 'bg-primary-100' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Ionicons
                        name="cash-outline"
                        size={24}
                        color={paymentMethod === 'cod' ? '#7ca163' : '#6b7280'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {t('checkout.paymentMethod.cod.title') || 'Cash on Delivery'}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {t('checkout.paymentMethod.cod.subtitle') || 'Pay when you receive'}
                      </Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    paymentMethod === 'cod'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </View>
              </Pressable>
            )}

            {/* POK Pay */}
            {isPokAvailable && (
              <Pressable
                onPress={() => handleSelectPayment('pok')}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 border-2 ${
                  paymentMethod === 'pok'
                    ? 'border-primary-500'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className={`w-12 h-12 rounded-full items-center justify-center ${
                      paymentMethod === 'pok' ? 'bg-primary-100' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Ionicons
                        name="card-outline"
                        size={24}
                        color={paymentMethod === 'pok' ? '#7ca163' : '#6b7280'}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-gray-900 dark:text-white font-semibold">
                        {t('checkout.paymentMethod.digital.title') || 'Pay Online'}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {t('checkout.paymentMethod.digital.subtitle') || 'Visa, Mastercard via POK'}
                      </Text>
                    </View>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    paymentMethod === 'pok'
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'pok' && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                </View>

                {/* POK Security Badge */}
                <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <Ionicons name="shield-checkmark-outline" size={16} color="#7ca163" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {t('checkout.paymentMethod.digital.securedBy') || 'Secured by POK - Bank of Albania'}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Order Summary */}
        <OrderSummary showDiscount={true} />

        <View className="h-32" />
      </ScrollView>

      {/* Phone Verification Modal */}
      <PhoneVerification
        visible={showPhoneVerification}
        onClose={() => setShowPhoneVerification(false)}
        onVerified={handlePhoneVerified}
        defaultPhone={shippingAddress?.phone || ''}
      />

      {/* Continue Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!paymentMethod || isProcessing}
          className={`py-4 rounded-full items-center flex-row justify-center ${
            paymentMethod && !isProcessing
              ? 'bg-primary-500'
              : 'bg-gray-300 dark:bg-gray-700'
          }`}
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-semibold text-base">
                {paymentMethod === 'pok'
                  ? (t('checkout.paymentMethod.digital.confirmButton') || 'Continue with Card Payment')
                  : (t('checkout.paymentMethod.cod.selectButton') || 'Confirm Cash on Delivery')}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
