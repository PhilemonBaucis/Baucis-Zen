import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';

// Format order number like web: BZ-YYYY-XXXXX
const formatOrderNumber = (orderId: string) => {
  // If we have display_id, use that format
  const year = new Date().getFullYear();
  const displayId = orderId.slice(-5).padStart(5, '0');
  return `BZ-${year}-${displayId}`;
};

export default function CheckoutConfirmationScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const {
    completedOrderId,
    shippingAddress,
    shippingOption,
    paymentMethod,
    tierDiscount,
    resetCheckout,
  } = useCheckoutStore();

  const { subtotal } = useCartStore();
  const { customer } = useAuthStore();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Success animation
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleViewOrders = () => {
    resetCheckout();
    router.replace('/orders');
  };

  const handleContinueShopping = () => {
    resetCheckout();
    router.replace('/(tabs)');
  };

  // Calculate potential Zen Points earned (1 point per €10 spent on subtotal)
  // Note: Actual points are awarded by the backend subscriber
  const potentialPoints = subtotal > 0 ? Math.floor(subtotal / 10) : 0;

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-4 py-8 items-center">
        {/* Success Animation */}
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mb-6"
        >
          <Ionicons name="checkmark-circle" size={64} color="#7ca163" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }} className="items-center w-full">
          {/* Success Message */}
          <Text className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('checkout.orderConfirmed') || 'Order Confirmed!'}
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            {t('checkout.thankYou') || 'Thank you for your order'}
          </Text>

          {/* Order Number */}
          {completedOrderId && (
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full mb-4 border border-gray-200 dark:border-gray-700">
              <Text className="text-gray-500 text-sm text-center">
                {t('checkout.orderNumber') || 'Order Number'}
              </Text>
              <Text className="text-xl font-bold text-primary-600 text-center mt-1">
                {formatOrderNumber(completedOrderId)}
              </Text>
            </View>
          )}

          {/* Zen Points Earned */}
          {potentialPoints > 0 && (
            <View className="bg-gradient-to-r from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl p-4 w-full mb-4 border border-primary-200 dark:border-primary-800">
              <View className="flex-row items-center justify-center">
                <Ionicons name="leaf" size={24} color="#7ca163" />
                <Text className="text-primary-700 dark:text-primary-300 font-semibold ml-2 text-lg">
                  +{potentialPoints} {t('auth.zenPoints') || 'Zen Points'}
                </Text>
              </View>
              <Text className="text-primary-600 dark:text-primary-400 text-sm text-center mt-1">
                {t('checkout.pointsEarned') || 'Points earned from this order'}
              </Text>
            </View>
          )}

          {/* Tier Discount Applied */}
          {tierDiscount && tierDiscount.amount > 0 && (
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 w-full mb-4 border border-amber-200 dark:border-amber-800">
              <View className="flex-row items-center justify-center">
                <Ionicons name="pricetag" size={20} color="#d97706" />
                <Text className="text-amber-700 dark:text-amber-300 font-medium ml-2">
                  {tierDiscount.tier} {t('checkout.discount') || 'Discount'}: -{tierDiscount.percent}%
                </Text>
              </View>
              <Text className="text-amber-600 dark:text-amber-400 text-sm text-center mt-1">
                {t('checkout.youSaved') || 'You saved'} €{tierDiscount.amount.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Delivery Info */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full mb-4 border border-gray-200 dark:border-gray-700">
            <Text className="text-gray-500 text-sm mb-2">
              {t('checkout.deliveryTo') || 'Delivering to'}
            </Text>
            {shippingAddress && (
              <View className="flex-row items-start">
                <Ionicons name="location-outline" size={20} color="#6b7280" />
                <View className="ml-2 flex-1">
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {shippingAddress.first_name} {shippingAddress.last_name}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {shippingAddress.address_1}, {shippingAddress.city}
                  </Text>
                </View>
              </View>
            )}

            {shippingOption && (
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Ionicons name="time-outline" size={18} color="#7ca163" />
                <Text className="text-gray-600 dark:text-gray-400 ml-2">
                  {t('checkout.estimatedDelivery') || 'Estimated delivery'}: {shippingOption.deliveryTime}
                </Text>
              </View>
            )}
          </View>

          {/* Payment Method */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full mb-6 border border-gray-200 dark:border-gray-700">
            <Text className="text-gray-500 text-sm mb-2">
              {t('checkout.paymentMethod.title') || 'Payment Method'}
            </Text>
            <View className="flex-row items-center">
              <Ionicons
                name={paymentMethod === 'cod' ? 'cash-outline' : 'card-outline'}
                size={20}
                color="#7ca163"
              />
              <Text className="text-gray-900 dark:text-white font-medium ml-2">
                {paymentMethod === 'cod'
                  ? (t('checkout.paymentMethod.cod.title') || 'Cash on Delivery')
                  : (t('checkout.paymentMethod.digital.title') || 'Card Payment')}
              </Text>
            </View>
          </View>

          {/* Email Confirmation Note */}
          <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-3 w-full mb-6">
            <Ionicons name="mail-outline" size={20} color="#3b82f6" />
            <Text className="text-blue-700 dark:text-blue-300 text-sm ml-2 flex-1">
              {t('checkout.emailConfirmation') || 'A confirmation email has been sent to your inbox'}
            </Text>
          </View>

          {/* Action Buttons */}
          <Pressable
            onPress={handleViewOrders}
            className="bg-primary-500 py-4 rounded-full w-full items-center mb-3"
          >
            <Text className="text-white font-semibold text-base">
              {t('checkout.viewOrders') || 'View My Orders'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleContinueShopping}
            className="border border-gray-300 dark:border-gray-600 py-4 rounded-full w-full items-center"
          >
            <Text className="text-gray-700 dark:text-gray-300 font-semibold text-base">
              {t('checkout.continueShopping') || 'Continue Shopping'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
