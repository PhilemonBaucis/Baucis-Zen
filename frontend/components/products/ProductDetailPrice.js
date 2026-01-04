'use client';

import TierPrice from './TierPrice';

/**
 * Client-side wrapper for TierPrice on product detail page
 * Needed because the product detail page is a server component
 */
export default function ProductDetailPrice({ price, currency }) {
  return (
    <div className="mb-4">
      <TierPrice 
        price={price} 
        currency={currency} 
        size="default"
        showBadge={true}
      />
    </div>
  );
}



