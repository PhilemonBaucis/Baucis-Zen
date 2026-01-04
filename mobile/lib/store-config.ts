import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from './api/client';

export interface ZenPointsTier {
  min: number;
  max: number | null;
  discount: number;
  name: string;
}

export interface StoreConfig {
  zenPoints: {
    tiers: {
      seed: ZenPointsTier;
      sprout: ZenPointsTier;
      blossom: ZenPointsTier;
      lotus: ZenPointsTier;
    };
    pointsPerEuro: number;
    cycleDays: number;
    signupBonus: number;
  };
  stock: {
    thresholds: {
      LOW_STOCK_MAX: number;
      CRITICAL_STOCK_MAX: number;
    };
    leadTimes: {
      IN_STOCK: { minDays: number; maxDays: number; unit: string };
      LOW_STOCK: { minDays: number; maxDays: number; unit: string };
      ONLY_X_LEFT: { minDays: number; maxDays: number; unit: string };
      MADE_TO_ORDER: { minDays: number; maxDays: number; unit: string };
      PRE_ORDER: { minDays: number; maxDays: number; unit: string };
    };
  };
}

// Default config (used before API loads, or as fallback)
export const DEFAULT_CONFIG: StoreConfig = {
  zenPoints: {
    tiers: {
      seed: { min: 0, max: 99, discount: 0, name: 'Seed' },
      sprout: { min: 100, max: 249, discount: 5, name: 'Sprout' },
      blossom: { min: 250, max: 499, discount: 10, name: 'Blossom' },
      lotus: { min: 500, max: null, discount: 15, name: 'Lotus' },
    },
    pointsPerEuro: 10,
    cycleDays: 30,
    signupBonus: 50,
  },
  stock: {
    thresholds: {
      LOW_STOCK_MAX: 10,
      CRITICAL_STOCK_MAX: 4,
    },
    leadTimes: {
      IN_STOCK: { minDays: 2, maxDays: 3, unit: 'days' },
      LOW_STOCK: { minDays: 2, maxDays: 4, unit: 'days' },
      ONLY_X_LEFT: { minDays: 2, maxDays: 3, unit: 'days' },
      MADE_TO_ORDER: { minDays: 14, maxDays: 21, unit: 'weeks' },
      PRE_ORDER: { minDays: 21, maxDays: 35, unit: 'weeks' },
    },
  },
};

// Fetch store config from backend
export async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/config`, {
      headers: {
        'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch store config');
    }

    return await response.json();
  } catch (err) {
    console.warn('Failed to fetch store config, using defaults:', err);
    return DEFAULT_CONFIG;
  }
}

// Zen Points helper functions
export function calculateTier(
  points: number,
  tiers: StoreConfig['zenPoints']['tiers'] = DEFAULT_CONFIG.zenPoints.tiers
): 'seed' | 'sprout' | 'blossom' | 'lotus' {
  if (points >= tiers.lotus.min) return 'lotus';
  if (points >= tiers.blossom.min) return 'blossom';
  if (points >= tiers.sprout.min) return 'sprout';
  return 'seed';
}

export function getTierInfo(
  tierName: string,
  tiers: StoreConfig['zenPoints']['tiers'] = DEFAULT_CONFIG.zenPoints.tiers
): ZenPointsTier {
  return tiers[tierName as keyof typeof tiers] || tiers.seed;
}

export function getDaysUntilReset(
  cycleStartDate: string | null,
  cycleDays: number = DEFAULT_CONFIG.zenPoints.cycleDays
): number {
  if (!cycleStartDate) return cycleDays;
  const start = new Date(cycleStartDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, cycleDays - daysPassed);
}
