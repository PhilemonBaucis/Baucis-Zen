'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const StoreConfigContext = createContext(null);

// Default config (used before API loads, or as fallback)
const DEFAULT_CONFIG = {
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

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

export function StoreConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${MEDUSA_BACKEND_URL}/store/config`, {
        headers: {
          'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch store config');
      }

      const data = await response.json();
      setConfig(data);
    } catch (err) {
      console.warn('Failed to fetch store config, using defaults:', err.message);
      setError(err.message);
      // Keep using default config
    } finally {
      setLoading(false);
    }
  };

  // Zen Points helper functions using config
  const calculateTier = (points) => {
    const { tiers } = config.zenPoints;
    if (points >= tiers.lotus.min) return 'lotus';
    if (points >= tiers.blossom.min) return 'blossom';
    if (points >= tiers.sprout.min) return 'sprout';
    return 'seed';
  };

  const getTierInfo = (tierName) => {
    return config.zenPoints.tiers[tierName] || config.zenPoints.tiers.seed;
  };

  const getDaysUntilReset = (cycleStartDate) => {
    if (!cycleStartDate) return config.zenPoints.cycleDays;
    const start = new Date(cycleStartDate);
    const now = new Date();
    const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return Math.max(0, config.zenPoints.cycleDays - daysPassed);
  };

  const value = {
    config,
    loading,
    error,
    
    // Zen Points helpers
    zenPointsTiers: config.zenPoints.tiers,
    pointsPerEuro: config.zenPoints.pointsPerEuro,
    cycleDays: config.zenPoints.cycleDays,
    signupBonus: config.zenPoints.signupBonus,
    calculateTier,
    getTierInfo,
    getDaysUntilReset,
    
    // Stock helpers
    stockThresholds: config.stock.thresholds,
    stockLeadTimes: config.stock.leadTimes,
  };

  return (
    <StoreConfigContext.Provider value={value}>
      {children}
    </StoreConfigContext.Provider>
  );
}

export function useStoreConfig() {
  const context = useContext(StoreConfigContext);
  if (!context) {
    throw new Error('useStoreConfig must be used within a StoreConfigProvider');
  }
  return context;
}

// Export default config for use in non-context scenarios
export { DEFAULT_CONFIG };

