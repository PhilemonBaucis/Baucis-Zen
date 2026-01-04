import { ComponentProps } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { Link, useRouter, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { LanguageSelector } from '@/components/settings/LanguageSelector';

function MenuItem({
  icon,
  title,
  subtitle,
  href,
  onPress,
  danger,
}: {
  icon: IoniconsName;
  title: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
}) {
  const accessibilityLabel = subtitle ? `${title}, ${subtitle}` : title;
  const accessibilityHint = href ? 'Double tap to open' : onPress ? 'Double tap to activate' : undefined;

  const Content = (
    <View className="flex-row items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
      <View className={`w-10 h-10 rounded-full ${danger ? 'bg-red-100' : 'bg-gray-100 dark:bg-gray-700'} items-center justify-center`}>
        <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#666'} />
      </View>
      <View className="flex-1 ml-3">
        <Text className={`font-medium ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{title}</Text>
        {subtitle && <Text className="text-gray-500 text-sm">{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        >
          {Content}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {Content}
    </Pressable>
  );
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const { customer, clearCustomer } = useAuthStore();
  const { clearCart } = useCartStore();

  const handleSignOut = () => {
    Alert.alert(t('account.signOut'), t('account.signOutConfirm') || 'Are you sure you want to sign out?', [
      { text: t('account.cancel'), style: 'cancel' },
      {
        text: t('account.signOut'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          clearCustomer();
          clearCart();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-primary-500 dark:bg-primary-700">
      {/* Profile Header */}
      <Link href="/account/edit" asChild>
        <Pressable
          className="bg-white dark:bg-gray-800 p-6 items-center"
          accessibilityRole="button"
          accessibilityLabel={t('account.editProfile') || 'Edit Profile'}
          accessibilityHint="Tap to edit your profile"
        >
          <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center">
            <Text className="text-3xl font-bold text-primary-600">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="text-xl font-bold text-gray-900 dark:text-white mt-3">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-gray-500">{user?.emailAddresses[0]?.emailAddress}</Text>
          {customer?.metadata?.zen_points && (
            <View className="mt-2 px-3 py-1 bg-primary-100 rounded-full">
              <Text className="text-primary-600 font-medium">
                {customer.metadata.zen_points.current_balance} {t('auth.zenPoints')}
              </Text>
            </View>
          )}
          <Text className="text-xs text-primary-500 mt-2">
            {t('account.tapToEdit') || 'Tap to edit profile'}
          </Text>
        </Pressable>
      </Link>

      {/* Orders Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('account.orders')}</Text>
        <MenuItem icon="receipt-outline" title={t('auth.myOrders')} subtitle={t('account.viewAll') || 'View your past orders'} href="/orders" />
      </View>

      {/* Account Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('account.title')}</Text>
        <MenuItem icon="location-outline" title={t('account.addresses')} subtitle={t('account.addAddressHint') || 'Manage delivery addresses'} href="/addresses" />
        <MenuItem icon="card-outline" title={t('account.paymentMethod') || 'Payment Methods'} subtitle={t('account.manage') || 'Manage payment options'} />
        <MenuItem icon="notifications-outline" title={t('account.notifications') || 'Notifications'} subtitle={t('account.manage') || 'Manage push notifications'} />
      </View>

      {/* Settings Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('account.settings') || 'Settings'}</Text>
        <View className="px-4 py-2">
          <LanguageSelector />
        </View>
      </View>

      {/* Play Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('game.title') || 'Daily Game'}</Text>
        <MenuItem
          icon="leaf"
          title={t('game.title') || 'Zen Memory Game'}
          subtitle={t('game.winReward') || 'Win to earn +10 Zen Points!'}
          href="/game/memory"
        />
      </View>

      {/* Support Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('account.support') || 'Support'}</Text>
        <MenuItem icon="help-circle-outline" title={t('account.needHelp') || 'Help Center'} />
        <MenuItem icon="chatbubble-outline" title={t('footer.contact')} />
      </View>

      {/* Legal Section */}
      <View className="mt-4">
        <Text className="px-4 py-2 text-sm font-medium text-white/80 uppercase">{t('legal.title') || 'Legal'}</Text>
        <MenuItem
          icon="document-text-outline"
          title={t('legal.privacyPolicy') || 'Privacy Policy'}
          href="/legal/privacy-policy"
        />
        <MenuItem
          icon="shield-checkmark-outline"
          title={t('legal.termsOfService') || 'Terms of Service'}
          href="/legal/terms-of-service"
        />
        <MenuItem
          icon="arrow-undo-outline"
          title={t('legal.withdrawal') || 'Withdrawal Rights'}
          href="/legal/withdrawal"
        />
        <MenuItem
          icon="information-circle-outline"
          title={t('legal.imprint') || 'Imprint'}
          href="/legal/imprint"
        />
        <MenuItem
          icon="repeat-outline"
          title={t('legal.returns') || 'Returns Policy'}
          href="/legal/returns"
        />
        <MenuItem
          icon="airplane-outline"
          title={t('legal.shipping') || 'Shipping Info'}
          href="/legal/shipping"
        />
      </View>

      {/* Sign Out */}
      <View className="mt-4 mb-8">
        <MenuItem icon="log-out-outline" title={t('account.signOut')} onPress={handleSignOut} danger />
      </View>
    </ScrollView>
  );
}
