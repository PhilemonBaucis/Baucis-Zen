import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';

export default function CheckoutLayout() {
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
        name="address"
        options={{
          title: t('checkout.shippingAddress') || 'Shipping Address',
          headerBackTitle: t('cart.title') || 'Cart',
        }}
      />
      <Stack.Screen
        name="shipping"
        options={{
          title: t('checkout.shipping') || 'Shipping',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          title: t('checkout.paymentMethod.title') || 'Payment',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="pok-webview"
        options={{
          title: t('checkout.paymentMethod.digital.title') || 'Card Payment',
          headerBackTitle: t('account.back') || 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="confirmation"
        options={{
          title: t('checkout.orderConfirmed') || 'Order Confirmed',
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
