import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { MemoryGame } from '@/components/game/MemoryGame';

export default function MemoryGameScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('game.title') || 'Memory Game',
          }}
        />
        <View className="flex-1 bg-primary-500 dark:bg-primary-700 items-center justify-center px-8">
          <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
            <Ionicons name="leaf" size={40} color="#ffffff" />
          </View>
          <Text className="text-xl font-bold text-white text-center mb-2">
            {t('game.signInToPlay') || 'Sign In to Play'}
          </Text>
          <Text className="text-white/80 text-center mb-6">
            {t('game.signInDescription') || 'Sign in to play the daily Zen Memory Game and earn Zen Points!'}
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            className="bg-white px-6 py-3 rounded-full"
          >
            <Text className="text-primary-600 font-semibold">
              {t('auth.login') || 'Sign In'}
            </Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('game.title') || 'Zen Memory Game',
          headerBackTitle: t('account.back') || 'Back',
        }}
      />
      <ScrollView className="flex-1 bg-primary-500 dark:bg-primary-700">
        {/* Header */}
        <View className="px-4 py-6 items-center">
          <Text className="text-white/80 text-sm tracking-widest uppercase mb-2">
            {t('game.dailyChallenge') || 'Daily Challenge'}
          </Text>
          <Text className="text-2xl font-bold text-white text-center mb-2">
            {t('game.title') || 'Zen Memory Game'}
          </Text>
          <Text className="text-white/70 text-center">
            {t('game.subtitle') || 'Test your memory, earn Zen Points'}
          </Text>
          <View className="w-16 h-1 bg-white/30 mx-auto mt-4 rounded-full" />
        </View>

        {/* Game Container */}
        <View className="px-4 pb-8">
          <MemoryGame />
        </View>

        {/* Instructions */}
        <View className="px-4 pb-8">
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {t('game.howToPlay') || 'How to Play'}
            </Text>

            <View className="space-y-3">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary-600 font-bold">1</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('game.step1') || 'Tap cards to flip them and reveal the Zen symbols'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary-600 font-bold">2</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('game.step2') || 'Find all 9 matching pairs before time runs out'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mr-3">
                  <Text className="text-primary-600 font-bold">3</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('game.step3') || 'Win to earn +10 Zen Points! Play once every 24 hours'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
