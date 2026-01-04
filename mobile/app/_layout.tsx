import { useEffect, useState } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth, useUser } from '@clerk/clerk-expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import 'react-native-reanimated';
import { I18nextProvider } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useConfigStore } from '@/store/config-store';
import { useNotifications } from '@/hooks/useNotifications';
import i18n, { i18nPromise } from '@/i18n';

import '../global.css';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 24 * 60 * 60 * 1000, // 24 hours for offline caching
    },
  },
});

// Clerk token cache using SecureStore
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Failed to save token:', err);
    }
  },
};

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [i18nReady, setI18nReady] = useState(false);

  // Initialize i18n
  useEffect(() => {
    i18nPromise.then(() => setI18nReady(true));
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && i18nReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, i18nReady]);

  if (!loaded || !i18nReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <ClerkLoaded>
          <QueryClientProvider client={queryClient}>
            <RootLayoutNav />
          </QueryClientProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </I18nextProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();

  const { syncWithMedusa } = useAuthStore();
  const { initializeCart, cartId } = useCartStore();
  const { loadConfig } = useConfigStore();

  // Initialize push notifications
  useNotifications();

  // Initialize app state
  useEffect(() => {
    initializeCart();
    loadConfig();
  }, []);

  // Sync with Medusa when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      syncWithMedusa(user, getToken, cartId || undefined);
      // Note: Cart is associated with customer during checkout via auth headers
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // Protect routes - require auth for all non-auth routes
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      // Redirect to home after sign in
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(checkout)" options={{ headerShown: false }} />
        <Stack.Screen name="products/[handle]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="addresses" options={{ headerShown: false }} />
        <Stack.Screen name="game" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
