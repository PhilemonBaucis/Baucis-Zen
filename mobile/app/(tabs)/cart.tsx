import React, { memo, useCallback } from 'react';
import { View, Text, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';

import { useCartStore } from '@/store/cart-store';
import { formatPrice, TransformedCartItem } from '@/lib/transformers';

const CartItem = memo(function CartItem({ item }: { item: TransformedCartItem }) {
  const { updateItem, removeItem, isLoading } = useCartStore();
  const priceText = formatPrice(item.unitPrice, item.currency);

  return (
    <View
      className="flex-row bg-white dark:bg-gray-800 p-4 mb-2 rounded-xl"
      accessibilityRole="none"
      accessibilityLabel={`${item.title}, ${priceText}, quantity ${item.quantity}`}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          className="w-20 h-20 rounded-lg"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View className="w-20 h-20 rounded-lg bg-gray-200 items-center justify-center">
          <Ionicons name="image-outline" size={24} color="#999" />
        </View>
      )}
      <View className="flex-1 ml-4">
        <Text className="font-medium text-gray-900 dark:text-white" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="text-primary-600 font-bold mt-1">
          {priceText}
        </Text>
        <View className="flex-row items-center mt-2">
          <Pressable
            onPress={() => updateItem(item.id, item.quantity - 1)}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={`Decrease quantity of ${item.title}`}
            accessibilityHint={item.quantity <= 1 ? 'Will remove item from cart' : 'Reduces quantity by one'}
          >
            <Ionicons name="remove" size={20} color="#666" />
          </Pressable>
          <Text
            className="mx-4 font-medium text-gray-900 dark:text-white"
            accessibilityLabel={`Quantity: ${item.quantity}`}
          >
            {item.quantity}
          </Text>
          <Pressable
            onPress={() => updateItem(item.id, item.quantity + 1)}
            disabled={isLoading}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={`Increase quantity of ${item.title}`}
            accessibilityHint="Increases quantity by one"
          >
            <Ionicons name="add" size={20} color="#666" />
          </Pressable>
          <Pressable
            onPress={() => removeItem(item.id)}
            disabled={isLoading}
            className="ml-auto"
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from cart`}
            accessibilityHint="Removes this item from your cart"
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default function CartScreen() {
  const { items, subtotal, total, isLoading, itemCount } = useCartStore();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (!isSignedIn) {
      router.push('/(auth)/sign-in');
      return;
    }
    router.push('/(checkout)/address');
  };

  if (items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-primary-500 dark:bg-primary-700 px-8">
        <Ionicons name="cart-outline" size={80} color="#ffffff" />
        <Text className="text-xl font-medium text-white mt-4">Your cart is empty</Text>
        <Text className="text-white/80 text-center mt-2">Browse our products and add items to your cart</Text>
        <Link href="/(tabs)" asChild>
          <Pressable
            className="mt-6 bg-white px-6 py-3 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Start Shopping"
            accessibilityHint="Go to shop to browse products"
          >
            <Text className="text-primary-600 font-medium">Start Shopping</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-primary-500 dark:bg-primary-700">
      <FlatList
        data={items}
        renderItem={({ item }) => <CartItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListFooterComponent={
          <View className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-500">Subtotal ({itemCount} items)</Text>
              <Text className="font-medium text-gray-900 dark:text-white">{formatPrice(subtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Total</Text>
              <Text className="text-lg font-bold text-primary-600">{formatPrice(total)}</Text>
            </View>
            <Pressable
              onPress={handleCheckout}
              disabled={isLoading}
              className="bg-primary-500 py-4 rounded-xl items-center"
              accessibilityRole="button"
              accessibilityLabel={`Proceed to Checkout, total ${formatPrice(total)}`}
              accessibilityHint="Continue to enter shipping and payment details"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Proceed to Checkout</Text>
              )}
            </Pressable>
          </View>
        }
      />
    </View>
  );
}
