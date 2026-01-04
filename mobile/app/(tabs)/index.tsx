import React, { memo } from 'react';
import { View, Text, FlatList, Image, Pressable, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';

import { getProducts } from '@/lib/api/products';
import { formatPrice, TransformedProduct } from '@/lib/transformers';
import { getStockStatus } from '@/lib/stock-utils';
import { ProductCardSkeleton } from '@/components/ui/SkeletonLoader';

const ProductCard = memo(function ProductCard({ product }: { product: TransformedProduct }) {
  const stockStatus = getStockStatus(product.inventoryQuantity, 1, product.allowBackorder);
  const priceText = formatPrice(product.price, product.currency);
  const accessibilityLabel = `${product.title}${product.subtitle ? `, ${product.subtitle}` : ''}, ${priceText}${!stockStatus.canPurchase ? ', sold out' : ''}`;

  return (
    <Link href={`/products/${product.handle}`} asChild>
      <Pressable
        className="flex-1 m-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Double tap to view product details"
      >
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            className="w-full aspect-square"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className="w-full aspect-square bg-gray-200 dark:bg-gray-700 items-center justify-center">
            <Text className="text-gray-400">No Image</Text>
          </View>
        )}
        <View className="p-3">
          <Text className="text-sm font-medium text-gray-900 dark:text-white" numberOfLines={2}>
            {product.title}
          </Text>
          {product.subtitle && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={1}>
              {product.subtitle}
            </Text>
          )}
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-base font-bold text-primary-600">
              {priceText}
            </Text>
            {!stockStatus.canPurchase && (
              <Text className="text-xs text-gray-500">Sold Out</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
});

function LoadingSkeleton() {
  return (
    <View className="flex-1 bg-primary-500 dark:bg-primary-700">
      <FlatList
        data={[1, 2, 3, 4, 5, 6]}
        renderItem={() => <ProductCardSkeleton />}
        keyExtractor={(item) => item.toString()}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        scrollEnabled={false}
      />
    </View>
  );
}

export default function ShopScreen() {
  const { data: products, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products', 'en'],
    queryFn: () => getProducts('en'),
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="flex-1 bg-primary-500 dark:bg-primary-700">
      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#ffffff" />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-white">No products found</Text>
          </View>
        }
      />
    </View>
  );
}
