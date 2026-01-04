'use client';

import { useCart } from '../../lib/cart-context';

export default function CartIcon({ className = "h-6 w-6" }) {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <div className="relative">
      <svg 
        className={className} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {/* Plus sign above cart */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 2v4m0 0v4m0-4h4m-4 0H8" 
        />
        {/* Normal shopping cart */}
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" 
        />
      </svg>
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount}
        </span>
      )}
    </div>
  );
}
