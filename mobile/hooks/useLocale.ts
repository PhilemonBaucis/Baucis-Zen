import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import { changeLanguage, supportedLanguages, SupportedLanguage } from '../i18n';

export function useLocale() {
  const { i18n, t } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const currentLanguage = i18n.language as SupportedLanguage;

  const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en';

  const getCurrentLanguageInfo = useCallback(() => {
    return supportedLanguages.find(lang => lang.code === currentLanguage) || supportedLanguages[0];
  }, [currentLanguage]);

  const setLanguage = useCallback(async (languageCode: SupportedLanguage) => {
    if (languageCode === currentLanguage) return;

    setIsChanging(true);
    try {
      await changeLanguage(languageCode);
    } catch (error) {
      if (__DEV__) console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  }, [currentLanguage]);

  return {
    currentLanguage,
    deviceLanguage,
    supportedLanguages,
    getCurrentLanguageInfo,
    setLanguage,
    isChanging,
    t,
  };
}
