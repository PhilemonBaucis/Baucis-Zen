/**
 * Product Translation Module
 * 
 * Translates product titles, subtitles, and descriptions using Google Gemini API.
 * Stores translations in product metadata for multi-language support.
 * 
 * Features:
 * - Single API call per product (translates to all 7 languages at once)
 * - Change detection via content hashing (only re-translates when content changes)
 * - Smart handling of product names (keeps "Matcha 30g" style names unchanged)
 * - Graceful fallback to English if translation fails
 * - Detailed logging for debugging
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Target languages (excluding 'en' as source)
export const TARGET_LOCALES = ['de', 'fr', 'it', 'es', 'tr', 'el', 'sq'] as const;
export type TargetLocale = typeof TARGET_LOCALES[number];

// Language display names for prompts
const LANGUAGE_NAMES: Record<string, string> = {
  de: 'German',
  fr: 'French',
  it: 'Italian',
  es: 'Spanish',
  tr: 'Turkish',
  el: 'Greek',
  sq: 'Albanian',
};

// =============================================================================
// TYPES
// =============================================================================

export interface ProductTranslations {
  title: Record<string, string>;
  subtitle: Record<string, string>;
  description: Record<string, string>;
}

export interface TranslationMetadata {
  source_image_urls?: string[];
  translations?: ProductTranslations;
  translation_hash?: string;
}

interface AllLanguagesResult {
  de: { title: string; subtitle: string; description: string };
  fr: { title: string; subtitle: string; description: string };
  it: { title: string; subtitle: string; description: string };
  es: { title: string; subtitle: string; description: string };
  tr: { title: string; subtitle: string; description: string };
  el: { title: string; subtitle: string; description: string };
  sq: { title: string; subtitle: string; description: string };
}

interface TranslationStats {
  total: number;
  successful: number;
  failed: number;
  cached: number;
  locales: Record<string, boolean>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if Gemini API is configured
 */
export function isTranslationEnabled(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
}

/**
 * Create a hash of the source content for change detection.
 * This allows us to skip translation if content hasn't changed.
 */
function createContentHash(title: string, subtitle: string, description: string): string {
  const content = `${title}|||${subtitle || ''}|||${description || ''}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// =============================================================================
// GEMINI API - SINGLE CALL FOR ALL LANGUAGES
// =============================================================================

/**
 * Call Google Gemini API to translate content to ALL languages in one request.
 * This is much more efficient than making 7 separate API calls.
 */
async function callGeminiAPIAllLanguages(
  title: string,
  subtitle: string,
  description: string,
  logger: any
): Promise<AllLanguagesResult | null> {
  const languageList = TARGET_LOCALES.map(l => `${l} (${LANGUAGE_NAMES[l]})`).join(', ');

  const prompt = `You are a professional translator for "Baucis Zen", a premium e-commerce wellness and matcha store.

Translate the following product information from English to these 7 languages: ${languageList}

CRITICAL RULES:
1. Keep brand names, product codes, and SKUs exactly as-is
2. Maintain any specifications (measurements, weights, quantities) in their original format
3. Use formal/polite language appropriate for luxury e-commerce
4. Keep translations natural, elegant, and suitable for a premium wellness brand

PRODUCT TITLE:
${title}

PRODUCT SUBTITLE:
${subtitle || '(none)'}

PRODUCT DESCRIPTION:
${description || '(none)'}

Respond ONLY with valid JSON (no markdown, no code blocks, no explanation). Use this exact structure:
{
  "de": {"title": "...", "subtitle": "...", "description": "..."},
  "fr": {"title": "...", "subtitle": "...", "description": "..."},
  "it": {"title": "...", "subtitle": "...", "description": "..."},
  "es": {"title": "...", "subtitle": "...", "description": "..."},
  "tr": {"title": "...", "subtitle": "...", "description": "..."},
  "el": {"title": "...", "subtitle": "...", "description": "..."},
  "sq": {"title": "...", "subtitle": "...", "description": "..."}
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Lower temperature for more consistent translations
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Larger output for all languages
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`   ⚠️ Gemini API HTTP ${response.status}: ${errorText.substring(0, 150)}`);
      return null;
    }

    const data = await response.json();
    
    // Check for API errors in response
    if (data.error) {
      logger.warn(`   ⚠️ Gemini API error: ${data.error.message}`);
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      logger.warn(`   ⚠️ Empty response from Gemini API`);
      return null;
    }

    // Parse JSON response - handle potential markdown wrapping
    let jsonStr = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    // Extract JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn(`   ⚠️ Could not find JSON in response: ${text.substring(0, 100)}...`);
      return null;
    }

    const translated = JSON.parse(jsonMatch[0]) as AllLanguagesResult;
    
    // Validate we have all languages
    for (const locale of TARGET_LOCALES) {
      if (!translated[locale] || !translated[locale].title) {
        logger.warn(`   ⚠️ Missing translation for ${locale}`);
        return null;
      }
    }

    return translated;
    
  } catch (error: any) {
    if (error.name === 'SyntaxError') {
      logger.warn(`   ⚠️ JSON parse error: ${error.message}`);
    } else {
      logger.warn(`   ⚠️ Translation request failed: ${error.message}`);
    }
    return null;
  }
}

// =============================================================================
// MAIN TRANSLATION FUNCTION
// =============================================================================

/**
 * Generate translations for a product using a single API call.
 * 
 * @param title - Product title in English
 * @param subtitle - Product subtitle in English
 * @param description - Product description in English
 * @param existingMetadata - Existing product metadata (for caching)
 * @param logger - Logger instance
 * @returns Updated metadata with translations
 */
export async function translateProduct(
  title: string,
  subtitle: string,
  description: string,
  existingMetadata: TranslationMetadata | null,
  logger: any
): Promise<{ metadata: TranslationMetadata; stats: TranslationStats }> {
  const stats: TranslationStats = {
    total: TARGET_LOCALES.length,
    successful: 0,
    failed: 0,
    cached: 0,
    locales: {},
  };

  // Check if translation is enabled
  if (!isTranslationEnabled()) {
    logger.info(`   ⏭️ Translation skipped (GEMINI_API_KEY not configured)`);
    return {
      metadata: existingMetadata || {},
      stats,
    };
  }

  // Create hash to detect content changes
  const newHash = createContentHash(title, subtitle, description);
  
  // Check if content is unchanged and we have existing translations
  if (
    existingMetadata?.translation_hash === newHash && 
    existingMetadata?.translations &&
    Object.keys(existingMetadata.translations.title).length > 1
  ) {
    const cachedLocales = Object.keys(existingMetadata.translations.title).filter(l => l !== 'en');
    logger.info(`   📦 Using cached translations (${cachedLocales.length} locales, content unchanged)`);
    stats.cached = cachedLocales.length;
    return {
      metadata: existingMetadata,
      stats,
    };
  }

  // Initialize translations with English source
  const translations: ProductTranslations = {
    title: { en: title },
    subtitle: { en: subtitle || '' },
    description: { en: description || '' },
  };

  logger.info(`   🌍 Translating to ${TARGET_LOCALES.length} languages (single API call)...`);

  // Make single API call for all languages
  const result = await callGeminiAPIAllLanguages(title, subtitle, description, logger);
  
  if (result) {
    // Successfully got all translations
    for (const locale of TARGET_LOCALES) {
      const localeResult = result[locale];
      translations.title[locale] = localeResult.title;
      translations.subtitle[locale] = localeResult.subtitle || subtitle || '';
      translations.description[locale] = localeResult.description || description || '';
      stats.successful++;
      stats.locales[locale] = true;
    }
    
    // Log success for each language
    for (const locale of TARGET_LOCALES) {
      const titlePreview = translations.title[locale].length > 35 
        ? translations.title[locale].substring(0, 35) + '...' 
        : translations.title[locale];
      logger.info(`   ✅ ${locale.toUpperCase()}: "${titlePreview}"`);
    }
    
    logger.info(`   📊 Translation complete: ${stats.successful}/${stats.total} successful`);
  } else {
    // API call failed - use English fallback for all
    logger.warn(`   ❌ Translation failed, using English fallback for all languages`);
    for (const locale of TARGET_LOCALES) {
      translations.title[locale] = title;
      translations.subtitle[locale] = subtitle || '';
      translations.description[locale] = description || '';
      stats.failed++;
      stats.locales[locale] = false;
    }
    logger.info(`   📊 Translation complete: 0/${stats.total} successful, ${stats.failed} failed`);
  }

  // Build final metadata
  const metadata: TranslationMetadata = {
    ...existingMetadata,
    translations,
    translation_hash: newHash,
  };

  return { metadata, stats };
}

/**
 * Batch translate multiple products with progress tracking.
 * 
 * @param products - Array of products to translate
 * @param logger - Logger instance
 * @returns Translation results for all products
 */
export async function translateProductBatch(
  products: Array<{
    id?: string;
    sku: string;
    title: string;
    subtitle: string;
    description: string;
    existingMetadata?: TranslationMetadata | null;
  }>,
  logger: any
): Promise<Map<string, TranslationMetadata>> {
  const results = new Map<string, TranslationMetadata>();
  
  if (!isTranslationEnabled()) {
    logger.info(`\n⏭️ Batch translation skipped (GEMINI_API_KEY not configured)`);
    return results;
  }

  logger.info(`\n🌍 Starting batch translation for ${products.length} products...`);
  logger.info(`   Target languages: ${TARGET_LOCALES.join(', ').toUpperCase()}`);
  logger.info(`   Mode: Single API call per product (efficient)`);
  
  let totalStats = {
    products: 0,
    successful: 0,
    failed: 0,
    cached: 0,
  };

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    logger.info(`\n[${i + 1}/${products.length}] Translating: ${product.title.substring(0, 40)}...`);
    
    const { metadata, stats } = await translateProduct(
      product.title,
      product.subtitle,
      product.description,
      product.existingMetadata || null,
      logger
    );
    
    results.set(product.sku, metadata);
    totalStats.products++;
    totalStats.successful += stats.successful;
    totalStats.failed += stats.failed;
    totalStats.cached += stats.cached;
  }

  // Final summary
  logger.info(`\n========================================`);
  logger.info(`🌍 Batch Translation Complete!`);
  logger.info(`========================================`);
  logger.info(`   Products processed: ${totalStats.products}`);
  logger.info(`   Translations successful: ${totalStats.successful}`);
  logger.info(`   Translations failed: ${totalStats.failed}`);
  logger.info(`   Translations cached: ${totalStats.cached}`);

  return results;
}

/**
 * Check if a product needs translation (content changed or missing translations)
 */
export function needsTranslation(
  title: string,
  subtitle: string,
  description: string,
  existingMetadata: TranslationMetadata | null
): boolean {
  if (!isTranslationEnabled()) {
    return false;
  }

  // No existing translations
  if (!existingMetadata?.translations) {
    return true;
  }

  // Check if we have all target locales
  const existingLocales = Object.keys(existingMetadata.translations.title || {});
  const hasAllLocales = TARGET_LOCALES.every(locale => existingLocales.includes(locale));
  if (!hasAllLocales) {
    return true;
  }

  // Check if content has changed
  const currentHash = createContentHash(title, subtitle, description);
  return existingMetadata.translation_hash !== currentHash;
}
