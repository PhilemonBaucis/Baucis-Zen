import React, { memo, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useOrderStore, formatOrderNumber, formatOrderDate, getOrderStatusInfo } from '@/store/order-store';
import { Order } from '@/lib/api/client';
import { OrderCardSkeleton } from '@/components/ui/SkeletonLoader';

// Helper for consistent 2-decimal rounding
const round2 = (n: number) => Math.round(n * 100) / 100;

const OrderCard = memo(function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const { t } = useTranslation();
  const { stage, statusLabel, statusColor } = getOrderStatusInfo(order);

  // Calculate total
  const total = order.total ||
    order.items?.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 1)), 0) || 0;

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
    <Pressable
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-3 border border-gray-200 dark:border-gray-700"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View>
          <Text className="text-gray-900 dark:text-white font-bold">
            {formatOrderNumber(order)}
          </Text>
          <Text className="text-gray-500 text-sm">
            {formatOrderDate(order.created_at)}
          </Text>
        </View>

        {/* Status Badge */}
        <View className={`px-3 py-1 rounded-full ${statusBgColors[statusColor]}`}>
          <Text className={`text-sm font-medium ${statusTextColors[statusColor]}`}>
            {t(`orders.status.${statusLabel.toLowerCase()}`) || statusLabel}
          </Text>
        </View>
      </View>

      {/* Items Preview */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="cube-outline" size={18} color="#6b7280" />
        <Text className="text-gray-600 dark:text-gray-400 ml-2">
          {order.items?.length || 0} {t('orders.items') || 'items'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="flex-row items-center mb-3">
        {[1, 2, 3].map((step) => (
          <View key={step} className="flex-row items-center flex-1">
            <View
              className={`w-3 h-3 rounded-full ${
                step <= stage
                  ? 'bg-primary-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
            {step < 3 && (
              <View
                className={`flex-1 h-0.5 ${
                  step < stage
                    ? 'bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </View>
        ))}
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <Text className="text-gray-900 dark:text-white font-bold">
          €{round2(total).toFixed(2)}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-primary-600 font-medium mr-1">
            {t('orders.viewDetails') || 'View Details'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#7ca163" />
        </View>
      </View>
    </Pressable>
  );
});

function LoadingSkeleton() {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 pt-4">
      {[1, 2, 3].map((i) => (
        <View key={i} className="mx-4">
          <OrderCardSkeleton />
        </View>
      ))}
    </View>
  );
}

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { orders, isLoading, error, fetchOrders } = useOrderStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const token = await getToken();
    if (token) {
      await fetchOrders(token);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOrderPress = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  if (isLoading && orders.length === 0) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {error && (
        <View className="mx-4 mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <Text className="text-red-700 dark:text-red-300">{error}</Text>
        </View>
      )}

      {orders.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
            <Ionicons name="receipt-outline" size={40} color="#9ca3af" />
          </View>
          <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
            {t('orders.noOrders') || 'No Orders Yet'}
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            {t('orders.noOrdersDescription') || "Your order history will appear here once you've made a purchase"}
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            className="bg-primary-500 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">
              {t('orders.startShopping') || 'Start Shopping'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => handleOrderPress(item.id)} />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#7ca163"
            />
          }
        />
      )}
    </View>
  );
}
