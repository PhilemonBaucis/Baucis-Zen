import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

// Default center (Albania)
const DEFAULT_CENTER = {
  lat: 41.3275,
  lng: 19.8187,
};

// Supported shipping countries
const SUPPORTED_COUNTRIES = [
  { code: 'al', name: 'Albania', center: { lat: 41.3275, lng: 19.8187 }, zoom: 7 },
  { code: 'xk', name: 'Kosovo', center: { lat: 42.6026, lng: 20.9030 }, zoom: 9 },
  { code: 'mk', name: 'North Macedonia', center: { lat: 41.5124, lng: 21.7465 }, zoom: 8 },
];

interface Coordinates {
  lat: number;
  lng: number;
}

interface AddressData {
  streetAddress: string;
  fullAddress: string;
  city: string;
  postalCode: string;
  countryCode: string;
  coordinates: Coordinates;
}

interface MapboxSuggestion {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
  place_type?: string[];
}

interface AddressPickerFallbackProps {
  coordinates?: Coordinates;
  selectedCountry?: string;
  onCountryChange?: (code: string) => void;
  onAddressSelect?: (data: AddressData) => void;
  translations?: {
    useMyLocation?: string;
    locating?: string;
    searchAddress?: string;
    dragPinHint?: string;
  };
}

export function AddressPickerFallback({
  coordinates,
  selectedCountry = 'al',
  onCountryChange,
  onAddressSelect,
  translations = {},
}: AddressPickerFallbackProps) {
  const t = {
    useMyLocation: translations.useMyLocation || 'Use my location',
    locating: translations.locating || 'Finding your location...',
    searchAddress: translations.searchAddress || 'Search for your address',
    dragPinHint: translations.dragPinHint || 'Select an address from search results',
  };

  const [countryCode, setCountryCode] = useState(selectedCountry);
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Location state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Country selector
  const [showCountryModal, setShowCountryModal] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);

  // Extract address components from geocoding feature
  const extractAddressComponents = (feature: MapboxSuggestion): AddressData => {
    const context = feature.context || [];

    let city = '';
    let postalCode = '';
    let extractedCountryCode = countryCode;

    for (const ctx of context) {
      if (ctx.id?.startsWith('place.') || ctx.id?.startsWith('locality.')) {
        city = ctx.text;
      }
      if (ctx.id?.startsWith('postcode.')) {
        postalCode = ctx.text;
      }
      if (ctx.id?.startsWith('country.')) {
        extractedCountryCode = ctx.short_code?.toLowerCase() || countryCode;
      }
    }

    if (!city && (feature.place_type?.includes('place') || feature.place_type?.includes('locality'))) {
      city = feature.text;
    }

    return {
      streetAddress: feature.text || feature.place_name?.split(',')[0] || '',
      fullAddress: feature.place_name || '',
      city,
      postalCode,
      countryCode: extractedCountryCode,
      coordinates: {
        lng: feature.center[0],
        lat: feature.center[1],
      },
    };
  };

  // Search addresses
  const searchAddresses = useCallback(async (query: string) => {
    if (!MAPBOX_TOKEN || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      const center = currentCountry?.center || DEFAULT_CENTER;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `country=${countryCode}&` +
        `limit=6&` +
        `types=address,poi,place,locality,neighborhood&` +
        `language=en&` +
        `proximity=${center.lng},${center.lat}`;

      const response = await fetch(url);
      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [countryCode, currentCountry]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: MapboxSuggestion) => {
    const addressData = extractAddressComponents(suggestion);
    setSelectedAddress(addressData);
    setSearchQuery(addressData.streetAddress);
    setSuggestions([]);
    setShowSuggestions(false);
    onAddressSelect?.(addressData);
  };

  // Reverse geocode
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!MAPBOX_TOKEN) return;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `types=address,poi,place,locality&` +
        `limit=1&` +
        `language=en`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0] as MapboxSuggestion;
        const addressData = extractAddressComponents(feature);
        addressData.coordinates = { lat, lng };

        setSelectedAddress(addressData);
        setSearchQuery(addressData.streetAddress || '');

        // Update country if different
        if (addressData.countryCode && addressData.countryCode !== countryCode) {
          const countryExists = SUPPORTED_COUNTRIES.find(c => c.code === addressData.countryCode);
          if (countryExists) {
            setCountryCode(addressData.countryCode);
            onCountryChange?.(addressData.countryCode);
          }
        }

        onAddressSelect?.(addressData);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Use device location
  const handleUseMyLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setTimeout(() => setLocationError(null), 3000);
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      setLocationError('Could not get location');
      setTimeout(() => setLocationError(null), 3000);
    } finally {
      setIsLocating(false);
    }
  };

  // Handle country selection
  const handleCountrySelect = (code: string) => {
    setCountryCode(code);
    onCountryChange?.(code);
    setSearchQuery('');
    setSuggestions([]);
    setSelectedAddress(null);
    setShowCountryModal(false);
  };

  if (!MAPBOX_TOKEN) {
    return (
      <View className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center">
        <Text className="text-gray-500">Address search not available</Text>
      </View>
    );
  }

  return (
    <View className="space-y-3">
      {/* Country Selector */}
      <Pressable
        onPress={() => setShowCountryModal(true)}
        className="flex-row items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
      >
        <View className="flex-row items-center">
          <Image
            source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
            style={{ width: 24, height: 18 }}
            className="rounded-sm"
          />
          <Text className="text-gray-900 dark:text-white ml-3">{currentCountry?.name}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color="#9ca3af" />
      </Pressable>

      {/* Country Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Country
              </Text>
              <Pressable onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </Pressable>
            </View>
            {SUPPORTED_COUNTRIES.map((country) => (
              <Pressable
                key={country.code}
                onPress={() => handleCountrySelect(country.code)}
                className={`flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 ${
                  country.code === countryCode ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <View className="flex-row items-center">
                  <Image
                    source={{ uri: `https://flagcdn.com/w40/${country.code}.png` }}
                    style={{ width: 24, height: 18 }}
                    className="rounded-sm"
                  />
                  <Text className="text-gray-900 dark:text-white ml-3">{country.name}</Text>
                </View>
                {country.code === countryCode && (
                  <Ionicons name="checkmark-circle" size={24} color="#7ca163" />
                )}
              </Pressable>
            ))}
            <View className="h-8" />
          </View>
        </View>
      </Modal>

      {/* Search Input */}
      <View className="relative z-10">
        <View className="flex-row items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          {isSearching ? (
            <ActivityIndicator size="small" color="#7ca163" />
          ) : (
            <Ionicons name="search" size={20} color="#9ca3af" />
          )}
          <TextInput
            className="flex-1 ml-3 text-gray-900 dark:text-white"
            placeholder={`${t.searchAddress} in ${currentCountry?.name}...`}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => {
              setSearchQuery('');
              setSuggestions([]);
              setShowSuggestions(false);
            }}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-hidden z-50">
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectSuggestion(item)}
                  className="flex-row items-start p-4 border-b border-gray-100 dark:border-gray-700"
                >
                  <Ionicons name="location" size={20} color="#7ca163" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gray-900 dark:text-white font-medium">
                      {item.text || item.place_name?.split(',')[0]}
                    </Text>
                    <Text className="text-gray-500 text-sm" numberOfLines={1}>
                      {item.place_name}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {/* Use My Location Button */}
      <Pressable
        onPress={handleUseMyLocation}
        disabled={isLocating}
        className="flex-row items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
      >
        {isLocating ? (
          <>
            <ActivityIndicator size="small" color="#7ca163" />
            <Text className="text-gray-600 dark:text-gray-400 ml-2">{t.locating}</Text>
          </>
        ) : (
          <>
            <Ionicons name="locate" size={20} color="#7ca163" />
            <Text className="text-primary-600 dark:text-primary-400 ml-2 font-medium">
              {t.useMyLocation}
            </Text>
          </>
        )}
      </Pressable>

      {/* Error Toast */}
      {locationError && (
        <View className="bg-red-100 border border-red-200 rounded-xl px-4 py-3 flex-row items-center">
          <Ionicons name="warning" size={20} color="#ef4444" />
          <Text className="text-red-700 ml-2">{locationError}</Text>
        </View>
      )}

      {/* Selected Address Display */}
      {selectedAddress && (
        <View className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-200 dark:border-primary-800">
          <View className="flex-row items-start">
            <Ionicons name="checkmark-circle" size={20} color="#7ca163" />
            <View className="ml-2 flex-1">
              <Text className="text-gray-900 dark:text-white font-medium">
                {selectedAddress.streetAddress}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {selectedAddress.city}
                {selectedAddress.postalCode && `, ${selectedAddress.postalCode}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Expo Go Notice */}
      <View className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
        <View className="flex-row items-center">
          <Ionicons name="information-circle" size={18} color="#d97706" />
          <Text className="text-amber-700 dark:text-amber-400 text-xs ml-2 flex-1">
            Map view requires a development build. Search works in Expo Go.
          </Text>
        </View>
      </View>

      {/* Helper Text */}
      <Text className="text-gray-500 text-xs text-center">
        {t.dragPinHint}
      </Text>
    </View>
  );
}
