'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Tier-based price display for cart items
 * Shows both original and discounted prices inline
 */
export default function TierCartPrice({ 
  price, 
  currency = 'EUR', 
  quantity = 1,
  showTotal = false, // If true, multiply by quantity
  className = '',
}) {
  const { isLoggedIn, currentTier, tierInfo } = useAuth();
  
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Calculate prices
  const hasDiscount = isLoggedIn && tierInfo?.discount > 0;
  const discountPercent = tierInfo?.discount || 0;
  const basePrice = showTotal ? price * quantity : price;
  const discountedPrice = hasDiscount ? basePrice * (1 - discountPercent / 100) : basePrice;

  // Tier-specific styling
  const tierColors = {
    seed: 'text-baucis-green-700',
    sprout: 'text-emerald-600',
    blossom: 'text-pink-600',
    lotus: 'text-amber-600',
  };

  const priceColor = tierColors[currentTier] || tierColors.seed;

  // No discount - show regular price
  if (!hasDiscount) {
    return (
      <span 
        className={`text-baucis-green-700 ${className}`}
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {formatPrice(basePrice)}
      </span>
    );
  }

  // Has discount - show both prices
  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span 
        className={`font-semibold ${priceColor}`}
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {formatPrice(discountedPrice)}
      </span>
      <span 
        className="text-gray-400 line-through text-xs"
        style={{ fontFamily: 'Crimson Text, serif' }}
      >
        {formatPrice(basePrice)}
      </span>
    </span>
  );
}

/**
 * Hook to get tier discount info for calculations
 */
export function useTierDiscount() {
  const { isLoggedIn, currentTier, tierInfo } = useAuth();
  
  const hasDiscount = isLoggedIn && tierInfo?.discount > 0;
  const discountPercent = tierInfo?.discount || 0;
  
  const applyDiscount = (amount) => {
    return hasDiscount ? amount * (1 - discountPercent / 100) : amount;
  };

  const tierColors = {
    seed: { bg: '#f3f4f6', text: '#4b5563', price: 'text-baucis-green-700', icon: 'bg-gray-400', border: '#d1d5db' },
    sprout: { bg: '#d1fae5', text: '#047857', price: 'text-emerald-600', icon: 'bg-gradient-to-br from-emerald-400 to-green-500', border: '#a7f3d0' },
    blossom: { bg: '#fce7f3', text: '#9d174d', price: 'text-pink-600', icon: 'bg-gradient-to-br from-pink-400 to-rose-500', border: '#fbcfe8' },
    lotus: { bg: '#fef3c7', text: '#92400e', price: 'text-amber-600', icon: 'bg-gradient-to-br from-amber-400 to-yellow-500', border: '#fde68a' },
  };

  return {
    hasDiscount,
    discountPercent,
    applyDiscount,
    tierName: tierInfo?.name || 'Seed',
    tierColor: tierColors[currentTier] || tierColors.seed,
    currentTier,
  };
}

