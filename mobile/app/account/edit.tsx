import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await user.update({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      Alert.alert(
        t('account.success') || 'Success',
        t('account.profileUpdated') || 'Your profile has been updated.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      if (__DEV__) console.error('Failed to update profile:', error);
      Alert.alert(
        t('account.error') || 'Error',
        t('account.updateFailed') || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    firstName.trim() !== (user?.firstName || '') ||
    lastName.trim() !== (user?.lastName || '');

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#7ca163" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-gray-900"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Avatar */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-primary-100 items-center justify-center">
            <Text className="text-4xl font-bold text-primary-600">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text className="mt-3 text-gray-500 dark:text-gray-400">
            {user?.emailAddresses[0]?.emailAddress}
          </Text>
        </View>

        {/* Form Fields */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('account.firstName') || 'First Name'}
          </Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('account.enterFirstName') || 'Enter first name'}
            placeholderTextColor="#9ca3af"
            className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg text-gray-900 dark:text-white"
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel={t('account.firstName') || 'First Name'}
          />
        </View>

        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('account.lastName') || 'Last Name'}
          </Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('account.enterLastName') || 'Enter last name'}
            placeholderTextColor="#9ca3af"
            className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg text-gray-900 dark:text-white"
            autoCapitalize="words"
            autoCorrect={false}
            accessibilityLabel={t('account.lastName') || 'Last Name'}
          />
        </View>

        {/* Email (Read-only) */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 opacity-60">
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            {t('account.email') || 'Email'}
          </Text>
          <View className="flex-row items-center bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
            <Text className="flex-1 text-gray-900 dark:text-white">
              {user?.emailAddresses[0]?.emailAddress}
            </Text>
            <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            {t('account.emailCannotChange') || 'Email cannot be changed here. Contact support if needed.'}
          </Text>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !hasChanges}
          className={`py-4 rounded-xl items-center mt-4 ${
            hasChanges ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
          accessibilityRole="button"
          accessibilityLabel={t('account.saveChanges') || 'Save Changes'}
          accessibilityState={{ disabled: isSaving || !hasChanges }}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className={`font-bold text-lg ${hasChanges ? 'text-white' : 'text-gray-500'}`}>
              {t('account.saveChanges') || 'Save Changes'}
            </Text>
          )}
        </Pressable>

        {/* Account Info */}
        <View className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
            <Text className="ml-2 font-medium text-gray-600 dark:text-gray-300">
              {t('account.accountInfo') || 'Account Info'}
            </Text>
          </View>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('account.memberSince') || 'Member since'}: {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
