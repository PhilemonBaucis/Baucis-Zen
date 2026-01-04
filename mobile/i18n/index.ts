import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';

import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import it from '../locales/it.json';
import es from '../locales/es.json';
import tr from '../locales/tr.json';
import el from '../locales/el.json';
import sq from '../locales/sq.json';

const LANGUAGE_KEY = 'user-language';

export const resources = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  it: { translation: it },
  es: { translation: es },
  tr: { translation: tr },
  el: { translation: el },
  sq: { translation: sq },
} as const;

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' },
] as const;

export type SupportedLanguage = keyof typeof resources;

// Get device language or fallback to English
const getDeviceLanguage = (): SupportedLanguage => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  if (deviceLocale && deviceLocale in resources) {
    return deviceLocale as SupportedLanguage;
  }
  return 'en';
};

// Load saved language preference
const loadSavedLanguage = async (): Promise<SupportedLanguage | null> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved && saved in resources) {
      return saved as SupportedLanguage;
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
  return null;
};

// Save language preference
export const saveLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Failed to save language:', error);
  }
};

// Change language and persist
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

// Initialize i18n
const initI18n = async () => {
  const savedLanguage = await loadSavedLanguage();
  const initialLanguage = savedLanguage || getDeviceLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // React already escapes values
      },
      react: {
        useSuspense: false, // Disable suspense for React Native
      },
    });

  return i18n;
};

// Export initialization promise
export const i18nPromise = initI18n();

export default i18n;
