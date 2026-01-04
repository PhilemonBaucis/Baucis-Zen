import { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { getProductByHandle } from '@/lib/api/products';
import { formatPrice } from '@/lib/transformers';
import { getStockStatus } from '@/lib/stock-utils';
import { useCartStore } from '@/store/cart-store';

const { width } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const { addItem, isLoading: cartLoading } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', handle],
    queryFn: () => getProductByHandle(handle, 'en'),
    enabled: !!handle,
  });

  const handleAddToCart = async () => {
    if (!product?.variantId) return;
    await addItem(product.variantId, quantity);
    router.push('/(tabs)/cart');
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-8">
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text className="text-xl font-medium text-gray-900 dark:text-white mt-4">Product Not Found</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-primary-600">← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const stockStatus = getStockStatus(product.inventoryQuantity, quantity, product.allowBackorder);

  return (
    <>
      <Stack.Screen options={{ title: product.title }} />
      <ScrollView className="flex-1 bg-white dark:bg-gray-900">
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}
          scrollEventThrottle={16}
        >
          {product.images.length > 0 ? (
            product.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={{ width, height: width }}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={{ width, height: width }} className="bg-gray-200 items-center justify-center">
              <Ionicons name="image-outline" size={60} color="#999" />
            </View>
          )}
        </ScrollView>

        {/* Image Indicators */}
        {product.images.length > 1 && (
          <View className="flex-row justify-center py-3">
            {product.images.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index === currentImageIndex ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </View>
        )}

        {/* Product Info */}
        <View className="px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{product.title}</Text>
          {product.subtitle && (
            <Text className="text-gray-500 mt-1">{product.subtitle}</Text>
          )}

          {/* Price */}
          <Text className="text-3xl font-bold text-primary-600 mt-4">
            {formatPrice(product.price, product.currency)}
          </Text>

          {/* Stock Status */}
          <View className={`flex-row items-center mt-3 px-3 py-2 rounded-lg ${stockStatus.bgColor}`}>
            <View className={`w-2 h-2 rounded-full ${stockStatus.dotColor}`} />
            <Text className={`ml-2 font-medium ${stockStatus.textColor}`}>
              {stockStatus.key === 'inStock' && 'In Stock'}
              {stockStatus.key === 'lowStock' && 'Low Stock'}
              {stockStatus.key === 'onlyXLeft' && `Only ${stockStatus.quantity} left`}
              {stockStatus.key === 'preOrder' && 'Pre-Order'}
              {stockStatus.key === 'madeToOrder' && 'Made to Order'}
              {stockStatus.key === 'soldOut' && 'Sold Out'}
            </Text>
          </View>

          {/* Quantity Selector */}
          {stockStatus.canPurchase && (
            <View className="flex-row items-center mt-6">
              <Text className="text-gray-700 dark:text-gray-300 font-medium mr-4">Quantity:</Text>
              <Pressable
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Ionicons name="remove" size={20} color="#666" />
              </Pressable>
              <Text className="mx-4 text-lg font-bold text-gray-900 dark:text-white">{quantity}</Text>
              <Pressable
                onPress={() => {
                  const max = stockStatus.maxPurchasable || 10;
                  setQuantity(Math.min(max, quantity + 1));
                }}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <Ionicons name="add" size={20} color="#666" />
              </Pressable>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View className="mt-6">
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">Description</Text>
              <Text className="text-gray-600 dark:text-gray-400 leading-6">{product.description}</Text>
            </View>
          )}

          {/* Product Details */}
          <View className="mt-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Details</Text>
            <View className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
              {product.material && (
                <View className="flex-row justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-gray-500">Material</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">{product.material}</Text>
                </View>
              )}
              {product.originCountry && (
                <View className="flex-row justify-between p-3 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-gray-500">Origin</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">{product.originCountry}</Text>
                </View>
              )}
              {product.weight && (
                <View className="flex-row justify-between p-3">
                  <Text className="text-gray-500">Weight</Text>
                  <Text className="text-gray-900 dark:text-white font-medium">{product.weight}g</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View className="px-4 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <Pressable
          onPress={handleAddToCart}
          disabled={!stockStatus.canPurchase || cartLoading}
          className={`py-4 rounded-xl items-center flex-row justify-center ${
            !stockStatus.canPurchase ? 'bg-gray-300' : 'bg-primary-500'
          }`}
        >
          {cartLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color="white" />
              <Text className="text-white font-bold ml-2">
                {stockStatus.canPurchase ? 'Add to Cart' : 'Sold Out'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </>
  );
}
