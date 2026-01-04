/**
 * Ultra C.E.P Shipping Configuration
 * 
 * Contract pricing (base currency: ALL for Albania, EUR for Kosovo)
 * - Tirana: 250 ALL
 * - Albania National: 360 ALL
 * - Kosovo: €7.00
 * - Weight surcharge: +50 ALL per kg over 2kg
 * 
 * Delivery times:
 * - Tirana: 24 hours
 * - Albania (cities): 24 hours
 * - Albania (rural): 24-72 hours
 * - Kosovo: 4 days
 */

export interface ShippingZone {
  id: string;
  name: string;
  priceALL?: number;
  priceEUR?: number;
  deliveryHours: number;
  deliveryText: string;
  deliveryTextKey: string;
}

export const SHIPPING_ZONES: Record<string, ShippingZone> = {
  tirana: {
    id: 'tirana',
    name: 'Tirana',
    priceALL: 250,
    deliveryHours: 24,
    deliveryText: '24 hours',
    deliveryTextKey: 'shipping.times.tiranaTime',
  },
  albania: {
    id: 'albania',
    name: 'Albania (National)',
    priceALL: 360,
    deliveryHours: 72,
    deliveryText: '24-72 hours',
    deliveryTextKey: 'shipping.times.albaniaTime',
  },
  kosovo: {
    id: 'kosovo',
    name: 'Kosovo',
    priceEUR: 7.00, // Already EUR in contract
    deliveryHours: 96,
    deliveryText: '4 days',
    deliveryTextKey: 'shipping.times.kosovoTime',
  },
};

/**
 * Weight surcharge in ALL per kg over 2kg base weight
 */
export const WEIGHT_SURCHARGE_ALL = 50;

/**
 * Base weight included in standard price (kg)
 */
export const BASE_WEIGHT_KG = 2;

/**
 * Shipping partner information
 */
export const SHIPPING_PARTNER = {
  name: 'Ultra C.E.P SHPK',
  license: 'Albanian Law No. 46/2015',
  tracking: 'SMS with real-time link',
};

/**
 * Liability limits from contract
 */
export const LIABILITY_LIMITS = {
  registeredLetters: { ALL: 2000, description: 'Registered letters' },
  parcels: { ALL: 5000, description: 'Parcels' },
  delayPerDay: { ALL: 500, description: 'Per day of delay' },
  delayMax: { ALL: 5000, description: 'Maximum delay compensation' },
  insuranceRate: 0.01, // 1% of declared value
  insuranceMinEUR: 5, // Minimum €5
};

/**
 * Determine shipping zone based on city and country
 * @param city - City name from address
 * @param country - ISO country code (AL, XK)
 * @returns Zone ID or null if not supported
 */
export function getShippingZone(city: string | null | undefined, country: string | null | undefined): string | null {
  if (!country) return null;
  
  const countryUpper = country.toUpperCase();
  
  // Kosovo
  if (countryUpper === 'XK') {
    return 'kosovo';
  }
  
  // Albania
  if (countryUpper === 'AL') {
    // Check if Tirana
    if (city && city.toLowerCase().includes('tiran')) {
      return 'tirana';
    }
    // All other Albanian locations
    return 'albania';
  }
  
  // Not supported
  return null;
}

/**
 * Get shipping zone details by ID
 */
export function getShippingZoneById(zoneId: string): ShippingZone | null {
  return SHIPPING_ZONES[zoneId] || null;
}

/**
 * Calculate weight surcharge in ALL
 * @param weightKg - Package weight in kilograms
 * @returns Surcharge amount in ALL
 */
export function calculateWeightSurchargeALL(weightKg: number): number {
  if (weightKg <= BASE_WEIGHT_KG) {
    return 0;
  }
  const extraKg = Math.ceil(weightKg - BASE_WEIGHT_KG);
  return extraKg * WEIGHT_SURCHARGE_ALL;
}

/**
 * Get all supported country codes
 */
export function getSupportedCountries(): string[] {
  return ['AL', 'XK'];
}

/**
 * Check if a country is supported for shipping
 */
export function isCountrySupported(country: string): boolean {
  return getSupportedCountries().includes(country.toUpperCase());
}





