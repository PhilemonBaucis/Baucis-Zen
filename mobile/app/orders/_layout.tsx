import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

export default function OrdersLayout() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('auth.myOrders') || 'My Orders',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('orders.orderDetails') || 'Order Details',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
    </Stack>
  );
}
