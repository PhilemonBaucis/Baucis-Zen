import { View, Text, Pressable, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '@/store/auth-store';
import { useConfigStore } from '@/store/config-store';
import { TierIcons, TierName } from '@/components/icons/TierIcons';

// Match webapp's tier colors: seed (stone), sprout (emerald), blossom (pink), lotus (amber)
const TIER_COLORS: Record<TierName, { bg: string; text: string; color: string }> = {
  seed: { bg: 'bg-stone-100', text: 'text-stone-600', color: '#a8a29e' },
  sprout: { bg: 'bg-emerald-100', text: 'text-emerald-600', color: '#10b981' },
  blossom: { bg: 'bg-pink-100', text: 'text-pink-600', color: '#ec4899' },
  lotus: { bg: 'bg-amber-100', text: 'text-amber-600', color: '#f59e0b' },
};

function TierCard({ tier, isActive }: { tier: TierName; isActive: boolean }) {
  const { getTierInfo } = useConfigStore();
  const tierInfo = getTierInfo(tier);
  const colors = TIER_COLORS[tier];
  const TierIcon = TierIcons[tier];

  return (
    <View
      className={`p-4 rounded-xl mr-3 ${colors.bg} ${isActive ? 'border-2 border-white' : ''}`}
      style={{ width: 120 }}
    >
      <TierIcon size={24} color={colors.color} />
      <Text className={`font-bold mt-2 ${colors.text}`}>{tierInfo.name}</Text>
      <Text className="text-gray-600 text-xs mt-1">
        {tierInfo.min}-{tierInfo.max || '∞'} pts
      </Text>
      <Text className={`font-bold text-lg mt-1 ${colors.text}`}>{tierInfo.discount}% off</Text>
    </View>
  );
}

export default function ZenPointsScreen() {
  const { customer, getZenPoints, getZenTier } = useAuthStore();
  const { getDaysUntilReset } = useConfigStore();

  const zenPoints = getZenPoints();
  const currentTier = getZenTier();
  const daysUntilReset = zenPoints?.cycle_start_date
    ? getDaysUntilReset(zenPoints.cycle_start_date)
    : 30;

  return (
    <ScrollView className="flex-1 bg-primary-500 dark:bg-primary-700">
      {/* Points Summary */}
      <View className="bg-gradient-to-br from-primary-500 to-primary-700 m-4 p-6 rounded-2xl">
        <Text className="text-white/80 text-sm">Your Balance</Text>
        <Text className="text-white text-4xl font-bold mt-1">
          {zenPoints?.current_balance || 0} pts
        </Text>
        <View className="flex-row items-center mt-4">
          <View className={`px-3 py-1 rounded-full ${TIER_COLORS[currentTier].bg}`}>
            <Text className={`font-bold ${TIER_COLORS[currentTier].text}`}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Text>
          </View>
          <Text className="text-white/80 ml-3">{zenPoints?.discount_percent || 0}% discount</Text>
        </View>
        <Text className="text-white/60 text-xs mt-4">
          Points reset in {daysUntilReset} days
        </Text>
      </View>

      {/* Tier Progress */}
      <View className="mx-4 mb-4">
        <Text className="text-lg font-bold text-white mb-3">Tiers</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TierCard tier="seed" isActive={currentTier === 'seed'} />
          <TierCard tier="sprout" isActive={currentTier === 'sprout'} />
          <TierCard tier="blossom" isActive={currentTier === 'blossom'} />
          <TierCard tier="lotus" isActive={currentTier === 'lotus'} />
        </ScrollView>
      </View>

      {/* Daily Game */}
      <View className="mx-4 mb-4">
        <Text className="text-lg font-bold text-white mb-3">Daily Bonus</Text>
        <Pressable className="bg-white dark:bg-gray-800 p-4 rounded-xl flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center">
            <Ionicons name="game-controller-outline" size={24} color="#8b5cf6" />
          </View>
          <View className="flex-1 ml-4">
            <Text className="font-bold text-gray-900 dark:text-white">Memory Game</Text>
            <Text className="text-gray-500 text-sm">Play daily to earn +10 points</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </Pressable>
      </View>

      {/* How to Earn */}
      <View className="mx-4 mb-6">
        <Text className="text-lg font-bold text-white mb-3">How to Earn</Text>
        <View className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <View className="p-4 flex-row items-center border-b border-gray-100 dark:border-gray-700">
            <Ionicons name="cart" size={20} color="#7ca163" />
            <Text className="flex-1 ml-3 text-gray-900 dark:text-white">Shop with us</Text>
            <Text className="text-primary-600 font-bold">10 pts/€</Text>
          </View>
          <View className="p-4 flex-row items-center border-b border-gray-100 dark:border-gray-700">
            <Ionicons name="game-controller" size={20} color="#8b5cf6" />
            <Text className="flex-1 ml-3 text-gray-900 dark:text-white">Daily memory game</Text>
            <Text className="text-primary-600 font-bold">+10 pts</Text>
          </View>
          <View className="p-4 flex-row items-center">
            <Ionicons name="person-add" size={20} color="#f59e0b" />
            <Text className="flex-1 ml-3 text-gray-900 dark:text-white">Sign up bonus</Text>
            <Text className="text-primary-600 font-bold">+50 pts</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
