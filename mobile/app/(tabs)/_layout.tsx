import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, Text, Image } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useCartStore } from '@/store/cart-store';

// Logo header component
function LogoHeader() {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ height: 28, width: 120 }}
      resizeMode="contain"
      accessibilityLabel="Baucis Zen"
    />
  );
}

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

function CartBadge() {
  const { itemCount } = useCartStore();

  if (itemCount === 0) return null;

  return (
    <View
      className="absolute -top-1 -right-2 bg-primary-500 rounded-full min-w-[18px] h-[18px] items-center justify-center"
      accessibilityLabel={`${itemCount} items in cart`}
    >
      <Text className="text-white text-xs font-bold">{itemCount > 9 ? '9+' : itemCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#c5d0b8' : '#4a5e3b',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#5a7448' : '#7ca163',
          borderTopColor: colorScheme === 'dark' ? '#4a5e3b' : '#6a8a55',
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#5a7448' : '#7ca163',
        },
        headerTintColor: '#ffffff',
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
          headerTitle: () => <LogoHeader />,
          tabBarAccessibilityLabel: 'Shop tab, browse products',
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <View>
              <TabBarIcon name="cart-outline" color={color} />
              <CartBadge />
            </View>
          ),
          tabBarAccessibilityLabel: 'Shopping cart tab',
        }}
      />
      <Tabs.Screen
        name="zen-points"
        options={{
          title: 'Zen Points',
          tabBarIcon: ({ color }) => <TabBarIcon name="leaf-outline" color={color} />,
          tabBarAccessibilityLabel: 'Zen Points tab, view loyalty rewards',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
          tabBarAccessibilityLabel: 'Account tab, manage profile and settings',
        }}
      />
    </Tabs>
  );
}
