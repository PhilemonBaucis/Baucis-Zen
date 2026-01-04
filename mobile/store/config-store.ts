import { create } from 'zustand';
import { StoreConfig, DEFAULT_CONFIG, fetchStoreConfig, calculateTier, getTierInfo, getDaysUntilReset } from '../lib/store-config';

interface ConfigState {
  config: StoreConfig;
  isLoading: boolean;
  error: string | null;
  lastFetchAt: number | null;

  // Actions
  loadConfig: () => Promise<void>;

  // Helpers
  calculateTier: (points: number) => 'seed' | 'sprout' | 'blossom' | 'lotus';
  getTierInfo: (tierName: string) => StoreConfig['zenPoints']['tiers']['seed'];
  getDaysUntilReset: (cycleStartDate: string | null) => number;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: DEFAULT_CONFIG,
  isLoading: false,
  error: null,
  lastFetchAt: null,

  loadConfig: async () => {
    // Only fetch if not fetched recently (cache for 5 minutes)
    const { lastFetchAt } = get();
    if (lastFetchAt && Date.now() - lastFetchAt < 5 * 60 * 1000) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const config = await fetchStoreConfig();
      set({
        config,
        isLoading: false,
        lastFetchAt: Date.now(),
      });
    } catch (error) {
      if (__DEV__) console.error('Failed to load config:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load config',
        isLoading: false,
      });
    }
  },

  calculateTier: (points) => calculateTier(points, get().config.zenPoints.tiers),
  getTierInfo: (tierName) => getTierInfo(tierName, get().config.zenPoints.tiers),
  getDaysUntilReset: (cycleStartDate) => getDaysUntilReset(cycleStartDate, get().config.zenPoints.cycleDays),
}));
