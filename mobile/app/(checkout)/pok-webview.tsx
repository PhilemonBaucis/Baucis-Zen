import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import { storeApi } from '@/lib/api/client';

export default function PokWebViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();

  const {
    pokOrderId,
    pokConfirmUrl,
    shippingAddress,
    shippingOption,
    tierDiscount,
    checkPokStatus,
    setCompletedOrderId,
    setStep,
    resetCheckout,
  } = useCheckoutStore();

  const { cartId, clearCart } = useCartStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!pokConfirmUrl || !pokOrderId) {
      router.replace('/(checkout)/payment');
      return;
    }

    // Start polling for payment status
    startPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pokConfirmUrl, pokOrderId]);

  const startPolling = () => {
    if (!pokOrderId) return;

    setIsPolling(true);
    pollingRef.current = setInterval(async () => {
      const status = await checkPokStatus(pokOrderId);

      if (status === 'completed' || status === 'paid') {
        // Payment successful
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        await completeOrder();
      } else if (status === 'failed' || status === 'cancelled') {
        // Payment failed
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setError(t('checkout.paymentFailed') || 'Payment failed. Please try again.');
      }
    }, 2000); // Poll every 2 seconds
  };

  const completeOrder = async () => {
    if (!cartId || !shippingAddress) return;

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

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
      setError(error.message || 'Failed to complete order');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      t('checkout.cancelPayment') || 'Cancel Payment',
      t('checkout.cancelPaymentMessage') || 'Are you sure you want to cancel this payment?',
      [
        { text: t('account.cancel') || 'No', style: 'cancel' },
        {
          text: t('checkout.yes') || 'Yes',
          style: 'destructive',
          onPress: () => {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
            }
            router.back();
          },
        },
      ]
    );
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    webViewRef.current?.reload();
    startPolling();
  };

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center p-6">
        <View className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
          <Ionicons name="close-circle-outline" size={48} color="#ef4444" />
        </View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
          {t('checkout.paymentError') || 'Payment Error'}
        </Text>
        <Text className="text-gray-500 text-center mb-6">
          {error}
        </Text>
        <View className="flex-row space-x-3">
          <Pressable
            onPress={handleRetry}
            className="bg-primary-500 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">
              {t('checkout.tryAgain') || 'Try Again'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="border border-gray-300 dark:border-gray-600 px-6 py-3 rounded-full"
          >
            <Text className="text-gray-700 dark:text-gray-300 font-semibold">
              {t('account.cancel') || 'Cancel'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!pokConfirmUrl) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 bg-white dark:bg-gray-900 z-10 items-center justify-center">
          <ActivityIndicator size="large" color="#7ca163" />
          <Text className="text-gray-600 dark:text-gray-400 mt-3">
            {t('checkout.loadingPayment') || 'Loading payment page...'}
          </Text>
        </View>
      )}

      {/* Polling Indicator */}
      {isPolling && !isLoading && (
        <View className="absolute top-4 left-4 right-4 z-20 bg-primary-50 dark:bg-primary-900/30 rounded-xl px-4 py-3 flex-row items-center">
          <ActivityIndicator size="small" color="#7ca163" />
          <Text className="text-primary-700 dark:text-primary-300 ml-2 flex-1">
            {t('checkout.waitingForPayment') || 'Waiting for payment confirmation...'}
          </Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: pokConfirmUrl }}
        style={{ flex: 1, marginTop: isPolling && !isLoading ? 60 : 0 }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(t('checkout.webviewError') || 'Failed to load payment page');
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        sharedCookiesEnabled={true}
      />

      {/* Cancel Button */}
      <View className="absolute bottom-4 left-4 right-4">
        <Pressable
          onPress={handleCancel}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full py-3 items-center shadow-lg"
        >
          <Text className="text-gray-700 dark:text-gray-300 font-medium">
            {t('checkout.cancelAndReturn') || 'Cancel & Return'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
