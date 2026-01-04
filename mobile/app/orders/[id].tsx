import { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Animated, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useOrderStore, formatOrderNumber, formatOrderDate, getOrderStatusInfo } from '@/store/order-store';
import { storeApi, Order, MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from '@/lib/api/client';

// Helper for consistent 2-decimal rounding
const round2 = (n: number) => Math.round(n * 100) / 100;

// Order Timeline Component
function OrderTimeline({ stage }: { stage: number }) {
  const { t } = useTranslation();
  const animatedValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    // Animate timeline steps
    const animations = animatedValues.map((anim, index) => {
      if (index < stage) {
        return Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
          delay: index * 200,
        });
      }
      return null;
    }).filter(Boolean);

    Animated.stagger(200, animations as Animated.CompositeAnimation[]).start();
  }, [stage]);

  const steps = [
    { id: 1, label: t('orders.status.processing') || 'Processing', icon: 'time-outline' },
    { id: 2, label: t('orders.status.shipped') || 'Shipped', icon: 'car-outline' },
    { id: 3, label: t('orders.status.delivered') || 'Delivered', icon: 'checkmark-circle-outline' },
  ];

  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-4 border border-gray-200 dark:border-gray-700">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('orders.timeline') || 'Order Timeline'}
      </Text>

      <View className="flex-row justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id <= stage;
          const isCurrent = step.id === stage;

          return (
            <View key={step.id} className="items-center flex-1">
              {/* Connection Line */}
              {index > 0 && (
                <View
                  className={`absolute left-0 right-1/2 top-5 h-0.5 ${
                    step.id <= stage ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ marginTop: -1 }}
                />
              )}
              {index < steps.length - 1 && (
                <View
                  className={`absolute left-1/2 right-0 top-5 h-0.5 ${
                    step.id < stage ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ marginTop: -1 }}
                />
              )}

              {/* Step Circle */}
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: animatedValues[index].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.2, 1],
                      }),
                    },
                  ],
                }}
              >
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center z-10 ${
                    isCompleted
                      ? 'bg-primary-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } ${isCurrent ? 'border-4 border-primary-200' : ''}`}
                >
                  <Ionicons
                    name={isCompleted ? 'checkmark' : (step.icon as any)}
                    size={18}
                    color={isCompleted ? 'white' : '#9ca3af'}
                  />
                </View>
              </Animated.View>

              {/* Label */}
              <Text
                className={`text-xs mt-2 text-center ${
                  isCompleted
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const { currentOrder, isLoadingDetail, fetchOrderDetail } = useOrderStore();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    const token = await getToken();
    if (token && id) {
      await fetchOrderDetail(id, token);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!currentOrder || !id) return;

    setDownloading(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      // Generate filename
      const firstName = currentOrder.shipping_address?.first_name || 'Customer';
      const lastName = currentOrder.shipping_address?.last_name || '';
      const filename = `Fatura - ${firstName} ${lastName}.pdf`;
      const fileUri = FileSystem.documentDirectory + filename;

      // Download invoice PDF directly using expo-file-system (avoids browser FileReader API)
      const downloadResult = await FileSystem.downloadAsync(
        `${MEDUSA_BACKEND_URL}/store/orders/${id}/invoice`,
        fileUri,
        {
          headers: {
            'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (downloadResult.status !== 200) {
        throw new Error('Failed to download invoice');
      }

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('orders.shareInvoice') || 'Share Invoice',
        });
      } else {
        Alert.alert(
          t('orders.invoiceDownloaded') || 'Invoice Downloaded',
          t('orders.invoiceSaved') || 'Invoice has been saved to your device'
        );
      }
    } catch (error: any) {
      Alert.alert(
        t('orders.error') || 'Error',
        error.message || t('orders.invoiceError') || 'Failed to download invoice'
      );
    } finally {
      setDownloading(false);
    }
  };

  if (isLoadingDetail || !currentOrder) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  const { stage, statusLabel, statusColor } = getOrderStatusInfo(currentOrder);

  // Calculate totals
  const subtotal = currentOrder.items?.reduce(
    (sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)),
    0
  ) || 0;

  const discount = currentOrder.metadata?.zen_tier_discount?.amount || 0;
  const shipping = currentOrder.metadata?.custom_shipping?.priceEUR ||
    currentOrder.shipping_total || 0;
  const total = currentOrder.total || round2(subtotal - discount + shipping);

  const statusBgColors: Record<string, string> = {
    amber: 'bg-amber-100 dark:bg-amber-900/30',
    blue: 'bg-blue-100 dark:bg-blue-900/30',
    green: 'bg-green-100 dark:bg-green-900/30',
    red: 'bg-red-100 dark:bg-red-900/30',
  };

  const statusTextColors: Record<string, string> = {
    amber: 'text-amber-700 dark:text-amber-300',
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    red: 'text-red-700 dark:text-red-300',
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Order Header */}
      <View className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {formatOrderNumber(currentOrder)}
            </Text>
            <Text className="text-gray-500">
              {formatOrderDate(currentOrder.created_at)}
            </Text>
          </View>
          <View className={`px-4 py-2 rounded-full ${statusBgColors[statusColor]}`}>
            <Text className={`font-semibold ${statusTextColors[statusColor]}`}>
              {t(`orders.status.${statusLabel.toLowerCase()}`) || statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Timeline */}
      <View className="mt-4">
        <OrderTimeline stage={stage} />
      </View>

      {/* Delivery Address */}
      {currentOrder.shipping_address && (
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-4 border border-gray-200 dark:border-gray-700">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {t('orders.deliveryAddress') || 'Delivery Address'}
          </Text>
          <View className="flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#7ca163" />
            <View className="ml-3 flex-1">
              <Text className="text-gray-900 dark:text-white font-medium">
                {currentOrder.shipping_address.first_name} {currentOrder.shipping_address.last_name}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {currentOrder.shipping_address.address_1}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {currentOrder.shipping_address.city}
                {currentOrder.shipping_address.postal_code && `, ${currentOrder.shipping_address.postal_code}`}
              </Text>
            </View>
          </View>

          {/* Delivery estimate */}
          {currentOrder.metadata?.custom_shipping?.deliveryTime && (
            <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <Ionicons name="time-outline" size={18} color="#7ca163" />
              <Text className="text-gray-600 dark:text-gray-400 ml-2">
                {t('orders.estimatedDelivery') || 'Estimated'}: {currentOrder.metadata.custom_shipping.deliveryTime}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Order Items */}
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-4 border border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('orders.items') || 'Order Items'}
        </Text>

        {currentOrder.items?.map((item, index) => (
          <View
            key={item.id || index}
            className={`flex-row items-center ${index > 0 ? 'mt-4 pt-4 border-t border-gray-100 dark:border-gray-700' : ''}`}
          >
            {/* Product Image */}
            <View className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              {item.thumbnail ? (
                <Image
                  source={{ uri: item.thumbnail }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="cube-outline" size={24} color="#9ca3af" />
                </View>
              )}
            </View>

            {/* Product Info */}
            <View className="flex-1 ml-4">
              <Text className="text-gray-900 dark:text-white font-medium" numberOfLines={2}>
                {item.title || item.product_title}
              </Text>
              <Text className="text-gray-500 text-sm">
                {t('cart.qty') || 'Qty'}: {item.quantity}
              </Text>
            </View>

            {/* Price */}
            <Text className="text-gray-900 dark:text-white font-semibold">
              €{round2((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Order Summary */}
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-4 border border-gray-200 dark:border-gray-700">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('orders.summary') || 'Order Summary'}
        </Text>

        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">
              {t('checkout.subtotal') || 'Subtotal'}
            </Text>
            <Text className="text-gray-900 dark:text-white">
              €{round2(subtotal).toFixed(2)}
            </Text>
          </View>

          {discount > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-primary-600">
                {currentOrder.metadata?.zen_tier_discount?.tier} {t('checkout.discount') || 'Discount'}
              </Text>
              <Text className="text-primary-600">
                -€{round2(discount).toFixed(2)}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">
              {t('checkout.shipping') || 'Shipping'}
            </Text>
            <Text className="text-gray-900 dark:text-white">
              €{round2(shipping).toFixed(2)}
            </Text>
          </View>

          <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              {t('checkout.total') || 'Total'}
            </Text>
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              €{round2(total).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className="px-4 pb-8">
        <Pressable
          onPress={handleDownloadInvoice}
          disabled={downloading}
          className="bg-primary-500 py-4 rounded-full items-center flex-row justify-center"
        >
          {downloading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">
                {t('orders.downloadInvoice') || 'Download Invoice'}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="border border-gray-300 dark:border-gray-600 py-4 rounded-full items-center mt-3"
        >
          <Text className="text-gray-700 dark:text-gray-300 font-semibold">
            {t('orders.backToOrders') || 'Back to Orders'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
