import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '@/hooks/useLocale';
import { SupportedLanguage } from '@/i18n';

export function LanguageSelector() {
  const { currentLanguage, supportedLanguages, setLanguage, getCurrentLanguageInfo, isChanging, t } = useLocale();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = getCurrentLanguageInfo();

  const handleSelectLanguage = async (code: string) => {
    await setLanguage(code as SupportedLanguage);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl"
        onPress={() => setModalVisible(true)}
        disabled={isChanging}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full items-center justify-center mr-3">
            <Ionicons name="language-outline" size={20} color="#7ca163" />
          </View>
          <View>
            <Text className="text-gray-900 dark:text-white font-medium">
              {t('account.language') || 'Language'}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              {currentLang.nativeName}
            </Text>
          </View>
        </View>
        {isChanging ? (
          <ActivityIndicator size="small" color="#7ca163" />
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('account.selectLanguage') || 'Select Language'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={supportedLanguages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 ${
                    item.code === currentLanguage ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                  onPress={() => handleSelectLanguage(item.code)}
                >
                  <View>
                    <Text className="text-gray-900 dark:text-white font-medium">
                      {item.nativeName}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm">
                      {item.name}
                    </Text>
                  </View>
                  {item.code === currentLanguage && (
                    <Ionicons name="checkmark-circle" size={24} color="#7ca163" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
