import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAddressStore } from '@/store/address-store';
import { AddressPickerFallback } from '@/components/address/AddressPickerFallback';
import { Address } from '@/lib/api/client';

// Supported shipping countries
const SUPPORTED_COUNTRIES = ['al', 'xk', 'mk'];

interface Coordinates {
  lat: number;
  lng: number;
}

interface AddressData {
  streetAddress: string;
  city: string;
  postalCode: string;
  countryCode: string;
  coordinates: Coordinates;
}

export default function EditAddressScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { addresses, updateAddress, isLoading } = useAddressStore();

  const [formData, setFormData] = useState<Partial<Address> & { coordinates?: Coordinates }>({
    address_name: '',
    first_name: '',
    last_name: '',
    address_1: '',
    address_2: '',
    city: '',
    postal_code: '',
    country_code: 'al',
    phone: '',
    coordinates: undefined,
  });
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing address
  useEffect(() => {
    const address = addresses.find(a => a.id === id);
    if (address) {
      setFormData({
        address_name: address.address_name || '',
        first_name: address.first_name || '',
        last_name: address.last_name || '',
        address_1: address.address_1 || '',
        address_2: address.address_2 || '',
        city: address.city || '',
        postal_code: address.postal_code || '',
        country_code: address.country_code || 'al',
        phone: address.phone || '',
        coordinates: address.metadata?.coordinates,
      });
    }
    setInitialLoading(false);
  }, [id, addresses]);

  const handleMapAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address_1: addressData.streetAddress,
      city: addressData.city,
      postal_code: addressData.postalCode,
      country_code: addressData.countryCode,
      coordinates: addressData.coordinates,
    }));
    setError(null);
  };

  const handleCountryChange = (countryCode: string) => {
    setFormData(prev => ({
      ...prev,
      country_code: countryCode,
      city: '',
      address_1: '',
      postal_code: '',
      coordinates: undefined,
    }));
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Validate location
    if (!formData.city || !formData.coordinates) {
      setError(t('account.selectLocationOnMap') || 'Please select your location on the map');
      return;
    }

    // Validate country is supported
    if (!SUPPORTED_COUNTRIES.includes(formData.country_code || '')) {
      setError(t('account.shippingRestriction') || 'We currently only ship to Albania, Kosovo, and North Macedonia');
      return;
    }

    // Validate required fields
    if (!formData.first_name || !formData.last_name) {
      setError(t('account.requiredFields') || 'Please fill in all required fields');
      return;
    }

    setError(null);

    const token = await getToken();
    if (!token) {
      Alert.alert('Error', 'Please sign in to save addresses');
      return;
    }

    // Prepare address data with coordinates in metadata
    const { coordinates, ...addressFields } = formData;
    const addressData: Partial<Address> = {
      ...addressFields,
      metadata: coordinates ? { coordinates } : undefined,
    };

    const result = await updateAddress(id, addressData, token);
    if (result) {
      router.back();
    }
  };

  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  const inputClass = "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white";
  const labelClass = "text-gray-700 dark:text-gray-300 text-sm mb-1.5 font-medium";

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4 space-y-4">
          {/* Address Name */}
          <View>
            <Text className={labelClass}>
              {t('account.addressName') || 'Address Label'} ({t('account.optional') || 'optional'})
            </Text>
            <TextInput
              className={inputClass}
              placeholder={t('account.addressNamePlaceholder') || 'Home, Office, etc.'}
              placeholderTextColor="#9ca3af"
              value={formData.address_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address_name: text }))}
            />
          </View>

          {/* Names */}
          <View className="flex-row space-x-3">
            <View className="flex-1">
              <Text className={labelClass}>
                {t('account.firstName') || 'First Name'} *
              </Text>
              <TextInput
                className={inputClass}
                placeholder={t('account.firstName') || 'First Name'}
                placeholderTextColor="#9ca3af"
                value={formData.first_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, first_name: text }))}
              />
            </View>
            <View className="flex-1">
              <Text className={labelClass}>
                {t('account.lastName') || 'Last Name'} *
              </Text>
              <TextInput
                className={inputClass}
                placeholder={t('account.lastName') || 'Last Name'}
                placeholderTextColor="#9ca3af"
                value={formData.last_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, last_name: text }))}
              />
            </View>
          </View>

          {/* Map Picker */}
          <View>
            <Text className={`${labelClass} ${formData.city && formData.coordinates ? '' : 'text-red-500'}`}>
              {t('account.pinYourLocation') || 'Find your exact location'} *
            </Text>
            <AddressPickerFallback
              coordinates={formData.coordinates}
              selectedCountry={formData.country_code || 'al'}
              onCountryChange={handleCountryChange}
              onAddressSelect={handleMapAddressSelect}
              translations={{
                useMyLocation: t('account.useMyLocation') || 'Use my location',
                locating: t('account.locating') || 'Finding your location...',
                searchAddress: t('account.searchAddress') || 'Search for your address',
                dragPinHint: t('account.dragPinHint') || 'Drag the pin or tap to adjust',
              }}
            />
          </View>

          {/* Selected Address Display */}
          {formData.city && formData.coordinates && (
            <View className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-200 dark:border-primary-800">
              <View className="flex-row items-start">
                <Ionicons name="location" size={20} color="#7ca163" />
                <View className="ml-2 flex-1">
                  <Text className="text-gray-900 dark:text-white font-medium">
                    {formData.address_1 || formData.city}
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">
                    {formData.city}
                    {formData.postal_code && `, ${formData.postal_code}`}
                    {formData.country_code && ` (${formData.country_code.toUpperCase()})`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Phone (optional) */}
          <View>
            <Text className={labelClass}>
              {t('account.phone') || 'Phone'} ({t('account.optional') || 'optional'})
            </Text>
            <TextInput
              className={inputClass}
              placeholder="+355 69 123 4567"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <View className="flex-row items-center">
                <Ionicons name="warning-outline" size={20} color="#d97706" />
                <Text className="text-amber-700 dark:text-amber-400 ml-2 flex-1">{error}</Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading || !formData.city || !formData.coordinates}
            className={`py-4 rounded-full items-center ${
              isLoading || !formData.city || !formData.coordinates
                ? 'bg-gray-300 dark:bg-gray-700'
                : 'bg-primary-500'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t('account.saveChanges') || 'Save Changes'}
              </Text>
            )}
          </Pressable>

          {/* Cancel Button */}
          <Pressable
            onPress={() => router.back()}
            className="py-3 items-center"
          >
            <Text className="text-gray-600 dark:text-gray-400 font-medium">
              {t('account.cancel') || 'Cancel'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
