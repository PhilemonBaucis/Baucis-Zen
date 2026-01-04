/**
 * Exchange Rate Service
 * 
 * Fetches EUR/ALL exchange rate from multiple free APIs
 * Primary: open.er-api.com (supports ALL currency)
 * Fallback: exchangerate.host
 * Caches rate for 2 hours to minimize API calls
 */

interface ExchangeRateCache {
  rate: number;
  updatedAt: Date;
}

interface OpenExchangeRateResponse {
  result: string;
  base_code: string;
  target_code: string;
  conversion_rate: number;
}

interface ExchangeRateHostResponse {
  success: boolean;
  base: string;
  rates: Record<string, number>;
}

// In-memory cache
let rateCache: ExchangeRateCache | null = null;

// Cache duration: 2 hours in milliseconds
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;

// Fallback rate if all APIs fail (approximate as of Dec 2025 - ~98 ALL/EUR)
const FALLBACK_EUR_TO_ALL = 98;

// API endpoints (free, no key required)
const OPEN_ER_API = 'https://open.er-api.com/v6/latest/EUR';
const EXCHANGERATE_HOST_API = 'https://api.exchangerate.host/latest?base=EUR&symbols=ALL';

/**
 * Fetch current EUR to ALL exchange rate
 * Tries multiple APIs for reliability
 */
async function fetchExchangeRate(): Promise<number> {
  // Try primary API: open.er-api.com
  try {
    const response = await fetch(OPEN_ER_API, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.rates && data.rates.ALL) {
        console.log(`[Exchange Rate] Got rate from open.er-api.com: ${data.rates.ALL}`);
        return data.rates.ALL;
      }
    }
  } catch (error) {
    console.warn('[Exchange Rate] open.er-api.com failed:', error);
  }
  
  // Try fallback API: exchangerate.host
  try {
    const response = await fetch(EXCHANGERATE_HOST_API, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data: ExchangeRateHostResponse = await response.json();
      
      if (data.success && data.rates && data.rates.ALL) {
        console.log(`[Exchange Rate] Got rate from exchangerate.host: ${data.rates.ALL}`);
        return data.rates.ALL;
      }
    }
  } catch (error) {
    console.warn('[Exchange Rate] exchangerate.host failed:', error);
  }
  
  throw new Error('All exchange rate APIs failed');
}

/**
 * Get current EUR to ALL exchange rate
 * Returns cached rate if still valid, otherwise fetches fresh rate
 */
export async function getEURtoALLRate(): Promise<{ rate: number; updatedAt: Date; fromCache: boolean }> {
  const now = new Date();
  
  // Check if cache is valid
  if (rateCache && (now.getTime() - rateCache.updatedAt.getTime()) < CACHE_DURATION_MS) {
    return {
      rate: rateCache.rate,
      updatedAt: rateCache.updatedAt,
      fromCache: true,
    };
  }
  
  // Fetch fresh rate
  try {
    const rate = await fetchExchangeRate();
    
    rateCache = {
      rate,
      updatedAt: now,
    };
    
    console.log(`[Exchange Rate] Updated: 1 EUR = ${rate} ALL`);
    
    return {
      rate,
      updatedAt: now,
      fromCache: false,
    };
  } catch (error) {
    // If we have a stale cache, use it
    if (rateCache) {
      console.warn('[Exchange Rate] Using stale cache due to API error');
      return {
        rate: rateCache.rate,
        updatedAt: rateCache.updatedAt,
        fromCache: true,
      };
    }
    
    // Use fallback rate
    console.warn(`[Exchange Rate] Using fallback rate: 1 EUR = ${FALLBACK_EUR_TO_ALL} ALL`);
    return {
      rate: FALLBACK_EUR_TO_ALL,
      updatedAt: now,
      fromCache: false,
    };
  }
}

/**
 * Convert ALL amount to EUR
 * @param amountALL - Amount in Albanian Lek
 * @returns Amount in EUR (rounded to 2 decimal places)
 */
export async function convertALLtoEUR(amountALL: number): Promise<{ amountEUR: number; rate: number; updatedAt: Date }> {
  const { rate, updatedAt } = await getEURtoALLRate();
  const amountEUR = Math.round((amountALL / rate) * 100) / 100;
  
  return {
    amountEUR,
    rate,
    updatedAt,
  };
}

/**
 * Convert EUR amount to ALL
 * @param amountEUR - Amount in EUR
 * @returns Amount in ALL (rounded to nearest integer)
 */
export async function convertEURtoALL(amountEUR: number): Promise<{ amountALL: number; rate: number; updatedAt: Date }> {
  const { rate, updatedAt } = await getEURtoALLRate();
  const amountALL = Math.round(amountEUR * rate);
  
  return {
    amountALL,
    rate,
    updatedAt,
  };
}

/**
 * Get current exchange rate info (for API endpoint)
 */
export async function getExchangeRateInfo(): Promise<{
  base: string;
  target: string;
  rate: number;
  updatedAt: string;
  fromCache: boolean;
}> {
  const { rate, updatedAt, fromCache } = await getEURtoALLRate();
  
  return {
    base: 'EUR',
    target: 'ALL',
    rate,
    updatedAt: updatedAt.toISOString(),
    fromCache,
  };
}

/**
 * Force refresh the exchange rate cache
 * Useful for admin operations
 */
export async function refreshExchangeRate(): Promise<{ rate: number; updatedAt: Date }> {
  // Clear cache to force refresh
  rateCache = null;
  
  const { rate, updatedAt } = await getEURtoALLRate();
  return { rate, updatedAt };
}

/**
 * Get the fallback rate (for display purposes)
 */
export function getFallbackRate(): number {
  return FALLBACK_EUR_TO_ALL;
}


