import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAddressStore } from '@/store/address-store';
import { AddressCard } from '@/components/address/AddressCard';

const MAX_ADDRESSES = 4;

export default function AddressesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const { addresses, isLoading, error, fetchAddresses, deleteAddress, setDefault } = useAddressStore();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAddresses();
  }, []);

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

  const handleAddNew = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      Alert.alert(
        t('account.maxAddressesReached') || 'Maximum Addresses',
        t('account.maxAddressesMessage') || `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add a new one.`
      );
      return;
    }
    router.push('/addresses/new');
  };

  const handleEdit = (addressId: string) => {
    router.push(`/addresses/${addressId}`);
  };

  const handleDelete = async (addressId: string) => {
    Alert.alert(
      t('account.deleteAddress') || 'Delete Address',
      t('account.confirmDelete') || 'Are you sure you want to delete this address?',
      [
        { text: t('account.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('account.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(addressId);
            const token = await getToken();
            if (token) {
              await deleteAddress(addressId, token);
            }
            setDeletingId(null);
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    const token = await getToken();
    if (token) {
      await setDefault(addressId, token);
    }
  };

  if (isLoading && addresses.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7ca163" />
      }
    >
      {/* Header with Add Button */}
      <View className="flex-row items-center justify-between px-4 py-4">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={24} color="#7ca163" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
            {t('account.savedAddresses') || 'Saved Addresses'}
          </Text>
        </View>

        {addresses.length < MAX_ADDRESSES ? (
          <Pressable
            onPress={handleAddNew}
            className="flex-row items-center bg-primary-500 px-4 py-2 rounded-full"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-medium ml-1">
              {t('account.addAddress') || 'Add'}
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center bg-amber-100 px-3 py-2 rounded-full">
            <Ionicons name="warning-outline" size={16} color="#d97706" />
            <Text className="text-amber-700 text-sm ml-1">
              {t('account.maxReached') || `Max ${MAX_ADDRESSES}`}
            </Text>
          </View>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View className="mx-4 mb-4 p-4 bg-red-100 rounded-xl">
          <Text className="text-red-700 text-center">{error}</Text>
        </View>
      )}

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <View className="px-4 py-12 items-center">
          <View className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
            <Ionicons name="location-outline" size={40} color="#9ca3af" />
          </View>
          <Text className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
            {t('account.noAddressSaved') || 'No Addresses Saved'}
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            {t('account.addAddressHint') || 'Add your first delivery address to get started'}
          </Text>
          <Pressable
            onPress={handleAddNew}
            className="bg-primary-500 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">
              {t('account.addFirstAddress') || 'Add Address'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="px-4 space-y-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => handleEdit(address.id!)}
              onDelete={() => handleDelete(address.id!)}
              onSetDefault={() => handleSetDefault(address.id!)}
              isDeleting={deletingId === address.id}
            />
          ))}
        </View>
      )}

      {/* Info text */}
      {addresses.length > 0 && (
        <View className="px-4 py-6">
          <Text className="text-gray-500 text-sm text-center">
            {t('account.addressLimit') || `You can save up to ${MAX_ADDRESSES} addresses`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
