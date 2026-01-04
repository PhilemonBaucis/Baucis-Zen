import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/components/useColorScheme';

export default function LegalLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#5a7448' : '#7ca163',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Stack.Screen
        name="privacy-policy"
        options={{
          title: t('legal.privacyPolicy') || 'Privacy Policy',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{
          title: t('legal.termsOfService') || 'Terms of Service',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="withdrawal"
        options={{
          title: t('legal.withdrawal') || 'Withdrawal Rights',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="imprint"
        options={{
          title: t('legal.imprint') || 'Imprint',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="returns"
        options={{
          title: t('legal.returns') || 'Returns Policy',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="shipping"
        options={{
          title: t('legal.shipping') || 'Shipping Info',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
    </Stack>
  );
}
