import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface ProductCardSkeletonProps {
  style?: ViewStyle;
}

export function ProductCardSkeleton({ style }: ProductCardSkeletonProps) {
  return (
    <View style={[styles.productCard, style]} className="flex-1 m-2 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      <SkeletonLoader height={150} borderRadius={0} />
      <View className="p-3">
        <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="50%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="40%" height={20} />
      </View>
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3">
      <View className="flex-row justify-between mb-3">
        <SkeletonLoader width={120} height={16} />
        <SkeletonLoader width={80} height={24} borderRadius={12} />
      </View>
      <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="40%" height={14} style={{ marginBottom: 12 }} />
      <View className="flex-row justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <SkeletonLoader width={100} height={14} />
        <SkeletonLoader width={60} height={18} />
      </View>
    </View>
  );
}

export function CartItemSkeleton() {
  return (
    <View className="flex-row bg-white dark:bg-gray-800 p-4 mb-2 rounded-xl">
      <SkeletonLoader width={80} height={80} borderRadius={8} />
      <View className="flex-1 ml-4">
        <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="40%" height={18} style={{ marginBottom: 12 }} />
        <View className="flex-row items-center">
          <SkeletonLoader width={32} height={32} borderRadius={16} />
          <SkeletonLoader width={40} height={20} style={{ marginHorizontal: 16 }} />
          <SkeletonLoader width={32} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  productCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
