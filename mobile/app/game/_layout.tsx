import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/components/useColorScheme';

export default function GameLayout() {
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
        name="memory"
        options={{
          title: t('game.title') || 'Zen Memory Game',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
    </Stack>
  );
}
