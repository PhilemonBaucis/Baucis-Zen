import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AccountLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen
        name="edit"
        options={{
          title: t('account.editProfile') || 'Edit Profile',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
    </Stack>
  );
}
