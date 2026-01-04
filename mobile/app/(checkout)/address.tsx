import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAddressStore } from '@/store/address-store';
import { useCheckoutStore } from '@/store/checkout-store';
import { useCartStore } from '@/store/cart-store';
import { AddressCard } from '@/components/address/AddressCard';
import { CheckoutProgress } from '@/components/checkout/CheckoutProgress';
import { Address } from '@/lib/api/client';

export default function CheckoutAddressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();

  const { addresses, isLoading, fetchAddresses } = useAddressStore();
  const { shippingAddress, setShippingAddress, setStep, calculateShipping } = useCheckoutStore();
  const { cartId } = useCartStore();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(shippingAddress);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  // Auto-select default address if none selected
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.is_default_shipping) || addresses[0];
      setSelectedAddress(defaultAddr);
    }
  }, [addresses]);

  const loadAddresses = async () => {
    const token = await getToken();
    if (token) {
      await fetchAddresses(token);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAddresses();
    setRefreshing(false);
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
  };

  const handleContinue = async () => {
    if (!selectedAddress) return;

    setShippingAddress(selectedAddress);

    // Calculate shipping based on address
    if (selectedAddress.country_code && selectedAddress.city) {
      await calculateShipping(
        selectedAddress.country_code,
        selectedAddress.city,
        cartId || undefined
      );
    }

    setStep('shipping');
    router.push('/(checkout)/shipping');
  };

  const handleAddNewAddress = () => {
    router.push('/addresses/new');
  };

  if (isLoading && addresses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7ca163" />
        }
      >
        {/* Progress Indicator */}
        <CheckoutProgress currentStep={1} />

        {/* Header */}
        <View className="px-4 py-4">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('checkout.selectAddress') || 'Select Delivery Address'}
          </Text>
          <Text className="text-gray-500 mt-1">
            {t('checkout.selectAddressSubtitle') || 'Choose where to deliver your order'}
          </Text>
        </View>

        {/* Address List */}
        {addresses.length === 0 ? (
          <View className="px-4 py-12 items-center">
            <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
              <Ionicons name="location-outline" size={40} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
              {t('account.noAddressSaved') || 'No Addresses Saved'}
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              {t('checkout.addAddressFirst') || 'Please add a delivery address to continue'}
            </Text>
            <Pressable
              onPress={handleAddNewAddress}
              className="bg-primary-500 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">
                {t('account.addAddress') || 'Add Address'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="px-4 space-y-3">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onSelect={() => handleSelectAddress(address)}
                onEdit={() => router.push(`/addresses/${address.id}`)}
                onDelete={() => {}}
                onSetDefault={() => {}}
                isSelected={selectedAddress?.id === address.id}
                selectable={true}
              />
            ))}

            {/* Add New Address Button */}
            <Pressable
              onPress={handleAddNewAddress}
              className="flex-row items-center justify-center p-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl"
            >
              <Ionicons name="add-circle-outline" size={24} color="#7ca163" />
              <Text className="text-primary-600 font-medium ml-2">
                {t('checkout.addNewAddress') || 'Add New Address'}
              </Text>
            </Pressable>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      {/* Continue Button */}
      {addresses.length > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 px-4 pt-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Pressable
            onPress={handleContinue}
            disabled={!selectedAddress}
            className={`py-4 rounded-full items-center ${
              selectedAddress ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <Text className="text-white font-semibold text-base">
              {t('checkout.continue') || 'Continue to Shipping'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
