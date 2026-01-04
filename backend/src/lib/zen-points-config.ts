/**
 * Zen Points Configuration
 * Centralized configuration for the loyalty points system
 */

export interface ZenPointsTier {
  min: number
  max: number
  discount: number
  name: string
}

export interface ZenPointsConfig {
  TIERS: {
    seed: ZenPointsTier
    sprout: ZenPointsTier
    blossom: ZenPointsTier
    lotus: ZenPointsTier
  }
  POINTS_PER_EURO: number
  CYCLE_DAYS: number
  SIGNUP_BONUS: number
}

export const ZEN_POINTS_CONFIG: ZenPointsConfig = {
  TIERS: {
    seed: { min: 0, max: 99, discount: 0, name: 'Seed' },
    sprout: { min: 100, max: 249, discount: 5, name: 'Sprout' },
    blossom: { min: 250, max: 499, discount: 10, name: 'Blossom' },
    lotus: { min: 500, max: Infinity, discount: 15, name: 'Lotus' },
  },
  POINTS_PER_EURO: 0.1, // 1 point per €10 spent
  CYCLE_DAYS: 30,
  SIGNUP_BONUS: 50,
}

/**
 * Calculate tier from current point balance
 */
export function calculateTier(points: number): keyof ZenPointsConfig['TIERS'] {
  const { TIERS } = ZEN_POINTS_CONFIG
  if (points >= TIERS.lotus.min) return 'lotus'
  if (points >= TIERS.blossom.min) return 'blossom'
  if (points >= TIERS.sprout.min) return 'sprout'
  return 'seed'
}

/**
 * Get discount percentage for a given tier
 */
export function getTierDiscount(tier: keyof ZenPointsConfig['TIERS']): number {
  return ZEN_POINTS_CONFIG.TIERS[tier]?.discount || 0
}

/**
 * Calculate days until points reset
 */
export function getDaysUntilReset(cycleStartDate: string | null): number {
  if (!cycleStartDate) return ZEN_POINTS_CONFIG.CYCLE_DAYS
  
  const start = new Date(cycleStartDate)
  const now = new Date()
  const daysPassed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  
  return Math.max(0, ZEN_POINTS_CONFIG.CYCLE_DAYS - daysPassed)
}

/**
 * Calculate points to earn for a given order total (in whole euros)
 * Note: Medusa stores prices in whole euros, NOT cents
 * Rule: 1 point per €10 spent (POINTS_PER_EURO = 0.1)
 */
export function calculatePointsForOrder(totalInEuros: number): number {
  return Math.round(totalInEuros * ZEN_POINTS_CONFIG.POINTS_PER_EURO)
}

/**
 * Get initial Zen Points object for new customers (includes signup bonus)
 */
export function getInitialZenPoints() {
  return {
    current_balance: ZEN_POINTS_CONFIG.SIGNUP_BONUS,
    tier: 'seed' as const,
    discount_percent: 0,
    cycle_start_date: new Date().toISOString(),
    lifetime_points: ZEN_POINTS_CONFIG.SIGNUP_BONUS,
    signup_bonus_applied: true,
  }
}

/**
 * Get tier info suitable for API response (converts Infinity to null for JSON serialization)
 */
export function getTiersForAPI() {
  const tiers: Record<string, { min: number; max: number | null; discount: number; name: string }> = {}
  
  for (const [key, tier] of Object.entries(ZEN_POINTS_CONFIG.TIERS)) {
    tiers[key] = {
      min: tier.min,
      max: tier.max === Infinity ? null : tier.max,
      discount: tier.discount,
      name: tier.name,
    }
  }
  
  return tiers
}

