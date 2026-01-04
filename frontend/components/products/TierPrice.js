'use client';

import { useAuth } from '@/lib/auth-context';

/**
 * Format price from cents to display currency
 */
const formatPrice = (amount, currency) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'EUR',
  }).format(amount);
};

/**
 * Tier-based price display component
 * Shows original price (crossed out) and discounted price with tier styling
 */
export default function TierPrice({ 
  price, 
  currency = 'EUR', 
  size = 'default', // 'small' for cards, 'default' for detail page
  showBadge = true,
}) {
  const { isLoggedIn, currentTier, tierInfo } = useAuth();
  
  // No discount for guests or seed tier
  const hasDiscount = isLoggedIn && tierInfo?.discount > 0;
  const discountPercent = tierInfo?.discount || 0;
  const discountedPrice = hasDiscount ? price * (1 - discountPercent / 100) : price;

  // Tier-specific styling
  const tierStyles = {
    seed: {
      badge: 'bg-gray-100 text-gray-600',
      price: 'text-baucis-green-700',
    },
    sprout: {
      badge: 'bg-emerald-100 text-emerald-700',
      price: 'text-emerald-600',
      glow: 'drop-shadow-sm',
    },
    blossom: {
      badge: 'bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700',
      price: 'text-pink-600',
      glow: 'drop-shadow-sm',
    },
    lotus: {
      badge: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700',
      price: 'text-amber-600',
      glow: 'drop-shadow-md',
    },
  };

  const style = tierStyles[currentTier] || tierStyles.seed;
  const isSmall = size === 'small';

  // No discount - show regular price
  if (!hasDiscount) {
    return (
      <p 
        className={`${isSmall ? 'text-lg' : 'text-2xl font-semibold'} text-baucis-green-700`}
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {formatPrice(price, currency)}
      </p>
    );
  }

  // Has discount - show original + discounted price
  return (
    <div className={`${isSmall ? 'space-y-0.5' : 'space-y-1'}`}>
      {/* Discount Badge */}
      {showBadge && (
        <div className={`inline-flex items-center space-x-1 ${style.badge} rounded-full ${isSmall ? 'px-2 py-0.5' : 'px-3 py-1'} ${isSmall ? 'text-[10px]' : 'text-xs'} font-medium`}>
          <svg className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
          <span>{tierInfo?.name} -{discountPercent}%</span>
        </div>
      )}
      
      {/* Prices */}
      <div className={`flex items-baseline ${isSmall ? 'gap-2' : 'gap-3'} flex-wrap`}>
        {/* Discounted Price */}
        <p 
          className={`${isSmall ? 'text-lg' : 'text-2xl'} font-bold ${style.price} ${style.glow || ''}`}
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {formatPrice(discountedPrice, currency)}
        </p>
        
        {/* Original Price (crossed out) */}
        <p 
          className={`${isSmall ? 'text-sm' : 'text-base'} text-gray-400 line-through`}
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {formatPrice(price, currency)}
        </p>
      </div>
    </div>
  );
}



