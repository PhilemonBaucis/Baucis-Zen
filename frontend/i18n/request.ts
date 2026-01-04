import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'de', 'fr', 'it', 'es', 'tr', 'el', 'sq'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

// Language display names and flags
export const languageNames: Record<Locale, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  fr: { name: 'Français', flag: '🇫🇷' },
  it: { name: 'Italiano', flag: '🇮🇹' },
  es: { name: 'Español', flag: '🇪🇸' },
  tr: { name: 'Türkçe', flag: '🇹🇷' },
  el: { name: 'Ελληνικά', flag: '🇬🇷' },
  sq: { name: 'Shqip', flag: '🇦🇱' },
};

// Map countries to languages for IP detection
export const countryToLocale: Record<string, Locale> = {
  // German-speaking
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // French-speaking  
  FR: 'fr', BE: 'fr', MC: 'fr', LU: 'fr',
  // Italian-speaking
  IT: 'it', SM: 'it', VA: 'it',
  // Spanish-speaking
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es',
  // Turkish-speaking
  TR: 'tr', CY: 'tr',
  // Greek-speaking
  GR: 'el',
  // Albanian-speaking
  AL: 'sq', XK: 'sq',
  // Default to English
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
};

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that the incoming `locale` is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

