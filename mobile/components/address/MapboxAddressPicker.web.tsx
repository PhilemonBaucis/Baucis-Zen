import { View, Text } from 'react-native';

interface MapboxAddressPickerProps {
  coordinates?: { lat: number; lng: number };
  selectedCountry?: string;
  onCountryChange?: (code: string) => void;
  onAddressSelect?: (data: any) => void;
  translations?: Record<string, string>;
}

// Web fallback - Mapbox not supported on web
export function MapboxAddressPicker(_props: MapboxAddressPickerProps) {
  return (
    <View className="h-80 rounded-2xl bg-gray-100 items-center justify-center">
      <Text className="text-gray-500">Map not available on web</Text>
      <Text className="text-gray-400 text-sm mt-2">Use the mobile app for map features</Text>
    </View>
  );
}
