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
import MapboxGL from '@rnmapbox/maps';

// Initialize Mapbox
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

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

interface MapboxAddressPickerProps {
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

export function MapboxAddressPicker({
  coordinates,
  selectedCountry = 'al',
  onCountryChange,
  onAddressSelect,
  translations = {},
}: MapboxAddressPickerProps) {
  const t = {
    useMyLocation: translations.useMyLocation || 'Use my location',
    locating: translations.locating || 'Finding your location...',
    searchAddress: translations.searchAddress || 'Search for your address',
    dragPinHint: translations.dragPinHint || 'Drag the pin or tap to adjust',
  };

  const [countryCode, setCountryCode] = useState(selectedCountry);
  const [markerPosition, setMarkerPosition] = useState<Coordinates>(() => {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry);
    return coordinates || country?.center || DEFAULT_CENTER;
  });
  const [cameraCenter, setCameraCenter] = useState<[number, number]>(() => {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry);
    const pos = coordinates || country?.center || DEFAULT_CENTER;
    return [pos.lng, pos.lat];
  });
  const [zoomLevel, setZoomLevel] = useState(() => {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === selectedCountry);
    return coordinates ? 16 : country?.zoom || 7;
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Location state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Country selector
  const [showCountryModal, setShowCountryModal] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const currentCountry = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);

  // Update when coordinates prop changes
  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng) {
      setMarkerPosition(coordinates);
      setCameraCenter([coordinates.lng, coordinates.lat]);
      setZoomLevel(16);
    }
  }, [coordinates?.lat, coordinates?.lng]);

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
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `country=${countryCode}&` +
        `limit=6&` +
        `types=address,poi,place,locality,neighborhood&` +
        `language=en&` +
        `proximity=${cameraCenter[0]},${cameraCenter[1]}`;

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
  }, [countryCode, cameraCenter]);

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
    const [lng, lat] = suggestion.center;
    const newCoords = { lat, lng };

    setMarkerPosition(newCoords);
    setCameraCenter([lng, lat]);
    setZoomLevel(17);

    const streetName = suggestion.text || suggestion.place_name?.split(',')[0] || '';
    setSearchQuery(streetName);
    setSuggestions([]);
    setShowSuggestions(false);

    const addressData = extractAddressComponents(suggestion);
    onAddressSelect?.(addressData);
  };

  // Reverse geocode
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!MAPBOX_TOKEN) return;

    setIsGeocoding(true);

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

        setSearchQuery(addressData.streetAddress || '');

        // Update country if different
        if (addressData.countryCode && addressData.countryCode !== countryCode) {
          const countryExists = SUPPORTED_COUNTRIES.find(c => c.code === addressData.countryCode);
          if (countryExists) {
            setCountryCode(addressData.countryCode);
            onCountryChange?.(addressData.countryCode);
          }
        }

        onAddressSelect?.({
          ...addressData,
          coordinates: { lat, lng },
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle map press
  const handleMapPress = (event: any) => {
    const coords = event.geometry.coordinates;
    const newCoords = { lat: coords[1], lng: coords[0] };

    setMarkerPosition(newCoords);
    reverseGeocode(newCoords.lat, newCoords.lng);
  };

  // Handle marker drag
  const handleMarkerDragEnd = (event: any) => {
    const coords = event.geometry.coordinates;
    const newCoords = { lat: coords[1], lng: coords[0] };

    setMarkerPosition(newCoords);
    reverseGeocode(newCoords.lat, newCoords.lng);
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
      const newCoords = { lat: latitude, lng: longitude };

      setMarkerPosition(newCoords);
      setCameraCenter([longitude, latitude]);
      setZoomLevel(17);

      reverseGeocode(latitude, longitude);
    } catch (error) {
      setLocationError('Could not get location');
      setTimeout(() => setLocationError(null), 3000);
    } finally {
      setIsLocating(false);
    }
  };

  // Handle country selection
  const handleCountrySelect = (code: string) => {
    const country = SUPPORTED_COUNTRIES.find(c => c.code === code);
    if (country) {
      setCountryCode(code);
      onCountryChange?.(code);
      setMarkerPosition(country.center);
      setCameraCenter([country.center.lng, country.center.lat]);
      setZoomLevel(country.zoom);
      setSearchQuery('');
      setSuggestions([]);
    }
    setShowCountryModal(false);
  };

  if (!MAPBOX_TOKEN) {
    return (
      <View className="h-80 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center justify-center">
        <Text className="text-gray-500">Map not available - Missing API token</Text>
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

      {/* Map */}
      <View className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700" style={{ height: 350 }}>
        {/* Loading overlay */}
        {(isLocating || isGeocoding) && (
          <View className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 items-center justify-center">
            <ActivityIndicator size="large" color="#7ca163" />
            <Text className="text-gray-600 dark:text-gray-400 mt-2">
              {isLocating ? t.locating : 'Loading...'}
            </Text>
          </View>
        )}

        {/* Error Toast */}
        {locationError && (
          <View className="absolute top-4 left-4 right-4 bg-red-100 border border-red-200 rounded-xl px-4 py-3 z-20 flex-row items-center">
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text className="text-red-700 ml-2">{locationError}</Text>
          </View>
        )}

        <MapboxGL.MapView
          style={{ flex: 1 }}
          styleURL="mapbox://styles/mapbox/streets-v12"
          onPress={handleMapPress}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            centerCoordinate={cameraCenter}
            zoomLevel={zoomLevel}
            animationDuration={500}
          />

          {/* Marker */}
          <MapboxGL.PointAnnotation
            id="marker"
            coordinate={[markerPosition.lng, markerPosition.lat]}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          >
            <View className="items-center">
              <View className="w-10 h-10 bg-primary-500 rounded-full items-center justify-center shadow-lg">
                <View className="w-4 h-4 bg-white rounded-full" />
              </View>
              <View className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-primary-500 -mt-1" />
            </View>
          </MapboxGL.PointAnnotation>
        </MapboxGL.MapView>

        {/* Location Button */}
        <Pressable
          onPress={handleUseMyLocation}
          disabled={isLocating}
          className="absolute bottom-4 right-4 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg items-center justify-center border border-gray-200 dark:border-gray-700"
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#7ca163" />
          ) : (
            <Ionicons name="locate" size={24} color="#7ca163" />
          )}
        </Pressable>

        {/* Country Badge */}
        <View className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800/95 rounded-full px-3 py-1.5 flex-row items-center shadow-sm border border-gray-200 dark:border-gray-700">
          <Image
            source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
            style={{ width: 16, height: 12 }}
            className="rounded-sm"
          />
          <Text className="text-gray-700 dark:text-gray-300 text-xs ml-2">{currentCountry?.name}</Text>
        </View>
      </View>

      {/* Helper Text */}
      <Text className="text-gray-500 text-xs text-center">
        {t.dragPinHint}
      </Text>
    </View>
  );
}
