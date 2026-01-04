import React, { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Address } from '@/lib/api/client';

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  isDeleting?: boolean;
  selectable?: boolean;
}

export const AddressCard = memo(function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  onSelect,
  isSelected = false,
  isDeleting = false,
  selectable = false,
}: AddressCardProps) {
  const { t } = useTranslation();

  const handlePress = () => {
    if (selectable && onSelect) {
      onSelect();
    }
  };

  const Container = selectable ? Pressable : View;

  return (
    <Container
      onPress={selectable ? handlePress : undefined}
      className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 ${
        isSelected
          ? 'border-primary-500'
          : address.is_default_shipping
          ? 'border-primary-300'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Header with name and badges */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          {address.address_name && (
            <Text className="font-semibold text-gray-900 dark:text-white text-base">
              {address.address_name}
            </Text>
          )}
          {address.is_default_shipping && (
            <View className="bg-primary-500 px-2 py-0.5 rounded-full ml-2">
              <Text className="text-white text-xs font-medium">
                {t('account.default') || 'Default'}
              </Text>
            </View>
          )}
        </View>

        {/* Selection indicator for checkout */}
        {selectable && (
          <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
          }`}>
            {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
          </View>
        )}
      </View>

      {/* Address details */}
      <View className="mb-3">
        <Text className="text-gray-700 dark:text-gray-300 font-medium">
          {address.first_name} {address.last_name}
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-sm mt-0.5">
          {address.address_1}
          {address.address_2 && `, ${address.address_2}`}
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-sm">
          {address.city}
          {address.postal_code && `, ${address.postal_code}`}
        </Text>
        {address.phone && (
          <Text className="text-gray-500 dark:text-gray-500 text-sm mt-1">
            {address.phone}
          </Text>
        )}
      </View>

      {/* Actions */}
      {!selectable && (
        <View className="flex-row items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
          {/* Set Default */}
          {!address.is_default_shipping && (
            <Pressable
              onPress={onSetDefault}
              className="flex-row items-center"
            >
              <Ionicons name="star-outline" size={16} color="#7ca163" />
              <Text className="text-primary-600 text-sm ml-1">
                {t('account.makeDefault') || 'Set as default'}
              </Text>
            </Pressable>
          )}
          {address.is_default_shipping && <View />}

          {/* Edit and Delete */}
          <View className="flex-row items-center space-x-4">
            <Pressable
              onPress={onEdit}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700"
            >
              <Ionicons name="pencil-outline" size={18} color="#6b7280" />
            </Pressable>
            <Pressable
              onPress={onDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </Container>
  );
});
