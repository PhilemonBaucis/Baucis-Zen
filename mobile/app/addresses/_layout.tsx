import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AddressesLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t('account.addresses') || 'Addresses',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: t('account.newAddress') || 'New Address',
          headerBackTitle: t('account.back') || 'Back',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('account.editAddress') || 'Edit Address',
          headerBackTitle: t('account.back') || 'Back',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
