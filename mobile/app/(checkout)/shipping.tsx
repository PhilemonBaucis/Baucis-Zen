import { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { OrderSummary } from '@/components/checkout/OrderSummary';

export default function CheckoutShippingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    shippingAddress,
    shippingOption,
    shippingLoading,
    calculateShipping,
    setStep,
    fetchAvailablePayments,
  } = useCheckoutStore();
  const { cartId, cart } = useCartStore();

  // Calculate shipping if not already done
  useEffect(() => {
    if (shippingAddress && !shippingOption && !shippingLoading) {
      calculateShipping(
        shippingAddress.country_code,
        shippingAddress.city,
        cartId || undefined
      );
    }
  }, [shippingAddress]);

  const handleContinue = async () => {
    // Fetch available payment methods
    if (cartId) {
      await fetchAvailablePayments(cartId);
    }

    setStep('payment');
    router.push('/(checkout)/payment');
  };

  const handleChangeAddress = () => {
    router.back();
  };

  if (!shippingAddress) {
    router.replace('/(checkout)/address');
    return null;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        {/* Progress Indicator */}
        <CheckoutProgress currentStep={2} />

        {/* Delivery Address Summary */}
        <View className="px-4 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('checkout.deliveryAddress') || 'Delivery Address'}
            </Text>
            <Pressable onPress={handleChangeAddress}>
              <Text className="text-primary-600 font-medium">
                {t('checkout.change') || 'Change'}
              </Text>
            </Pressable>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <View className="flex-row items-start">
              <Ionicons name="location" size={20} color="#7ca163" />
              <View className="ml-3 flex-1">
                {shippingAddress.address_name && (
                  <Text className="text-gray-900 dark:text-white font-semibold mb-1">
                    {shippingAddress.address_name}
                  </Text>
                )}
                <Text className="text-gray-700 dark:text-gray-300">
                  {shippingAddress.first_name} {shippingAddress.last_name}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {shippingAddress.address_1}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {shippingAddress.city}
                  {shippingAddress.postal_code && `, ${shippingAddress.postal_code}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Shipping Info */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('checkout.shippingMethod') || 'Shipping Method'}
          </Text>

          {shippingLoading ? (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 items-center">
              <ActivityIndicator size="large" color="#7ca163" />
              <Text className="text-gray-500 mt-2">
                {t('checkout.calculatingShipping') || 'Calculating shipping...'}
              </Text>
            </View>
          ) : shippingOption ? (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 border-2 border-primary-500">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center">
                    <Ionicons name="car-outline" size={20} color="#7ca163" />
                  </View>
                  <View className="ml-3">
                    <Text className="text-gray-900 dark:text-white font-semibold">
                      {shippingOption.zone}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {shippingOption.deliveryTime}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-gray-900 dark:text-white font-bold text-lg">
                    €{shippingOption.priceEUR.toFixed(2)}
                  </Text>
                  {shippingOption.priceALL && (
                    <Text className="text-gray-500 text-sm">
                      {shippingOption.priceALL} ALL
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <View className="flex-row items-center">
                <Ionicons name="warning-outline" size={20} color="#d97706" />
                <Text className="text-amber-700 dark:text-amber-400 ml-2">
                  {t('checkout.shippingUnavailable') || 'Shipping calculation failed. Please try again.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Order Summary */}
        <OrderSummary />

        <View className="h-32" />
      </ScrollView>

      {/* Continue Button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!shippingOption || shippingLoading}
          className={`py-4 rounded-full items-center ${
            shippingOption && !shippingLoading
              ? 'bg-primary-500'
              : 'bg-gray-300 dark:bg-gray-700'
          }`}
        >
          <Text className="text-white font-semibold text-base">
            {t('checkout.continueToPayment') || 'Continue to Payment'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
