'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart-context';

const MAX_PER_PRODUCT = 10;

export default function AddToCartButton({ product, className = '' }) {
  const t = useTranslations('common');
  const tCart = useTranslations('cart');
  const { addItem, cart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [stockError, setStockError] = useState(null);

  // Clear stock error after a delay
  useEffect(() => {
    if (stockError) {
      const timer = setTimeout(() => setStockError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [stockError]);

  // Get inventory info and current cart quantity
  const inventoryQuantity = product.inventoryQuantity;
  const itemInCart = cart?.items?.find(item => item.variant_id === product.variantId);
  const quantityInCart = itemInCart?.quantity || 0;
  
  // Calculate remaining allowed quantity (max 10 per product)
  const remainingAllowed = Math.max(0, MAX_PER_PRODUCT - quantityInCart);
  
  // Determine if the + button should be disabled
  const canIncrement = quantity < remainingAllowed && quantity < 99;

  // Reset quantity if it exceeds remaining allowed
  useEffect(() => {
    if (quantity > remainingAllowed && remainingAllowed > 0) {
      setQuantity(remainingAllowed);
    } else if (remainingAllowed === 0) {
      setQuantity(1);
    }
  }, [remainingAllowed, quantity]);

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= remainingAllowed) {
      setQuantity(newQuantity);
      setStockError(null);
    }
  };

  const handleAddToCart = async () => {
    if (!product.variantId || product.isSoldOut) return;
    
    // Check if limit already reached
    if (remainingAllowed === 0) {
      setStockError(tCart('dailyLimitReached') 
        || `Limit of ${MAX_PER_PRODUCT} reached for this product.`);
      return;
    }
    
    // Check if requested quantity exceeds remaining
    if (quantity > remainingAllowed) {
      setStockError(tCart('dailyLimitExceeded', { remaining: remainingAllowed }) 
        || `You can only add ${remainingAllowed} more of this product.`);
      return;
    }
    
    setStockError(null);
    setIsAdding(true);
    try {
      const result = await addItem(product.variantId, quantity);
      
      // Check for inventory error
      if (result && !result.success && result.error === 'insufficient_inventory') {
        const inCart = result.currentQuantityInCart || quantityInCart || 0;
        
        // Show appropriate message based on available info
        if (inventoryQuantity !== undefined && inventoryQuantity !== null) {
          if (inCart > 0) {
            setStockError(tCart('stockLimitWithCart', { available: inventoryQuantity, inCart }) 
              || `Only ${inventoryQuantity} in stock. You have ${inCart} in cart.`);
          } else {
            setStockError(tCart('stockLimit', { available: inventoryQuantity }) 
              || `Only ${inventoryQuantity} available in stock.`);
          }
        } else {
          // Fallback if inventory info not available
          setStockError(tCart('insufficientStock') || 'Not enough stock available.');
        }
        return;
      }
      
      if (result?.success) {
        setAdded(true);
        setTimeout(() => {
          setAdded(false);
          setQuantity(1);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  if (product.isSoldOut) {
    return (
      <button
        disabled
        className={`w-full bg-baucis-green-100 text-baucis-green-400 text-[10px] tracking-widest rounded-full py-2 cursor-not-allowed ${className}`}
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('soldOut').toUpperCase()}
      </button>
    );
  }

  // If limit reached, show disabled state
  if (remainingAllowed === 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        <button
          disabled
          className="w-full bg-baucis-green-100 text-baucis-green-400 text-[10px] tracking-widest rounded-full py-2.5 cursor-not-allowed"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {tCart('dailyLimitReached') || `LIMIT OF ${MAX_PER_PRODUCT} REACHED`}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Quantity Selector */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-gradient-to-r from-baucis-pink-50 to-white border border-baucis-pink-200 rounded-full overflow-hidden shadow-sm">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="w-9 h-9 flex items-center justify-center text-baucis-green-600 hover:bg-baucis-pink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span
            className="w-12 text-center text-sm font-semibold text-baucis-green-800 select-none"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={!canIncrement}
            className="w-9 h-9 flex items-center justify-center text-baucis-green-600 hover:bg-baucis-pink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={isAdding}
        className="group w-full bg-gradient-to-r from-baucis-green-600 to-baucis-green-700 text-white text-[10px] tracking-widest rounded-full py-2.5 hover:from-baucis-green-700 hover:to-baucis-green-800 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {isAdding ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{t('loading')}</span>
          </span>
        ) : added ? (
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{tCart('itemAdded')}</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span>{t('addToCart').toUpperCase()}</span>
          </span>
        )}
      </button>
      
      {/* Stock error message - shown after failed add */}
      {stockError && (
        <div className="flex items-center justify-center gap-1.5 text-sm font-semibold text-baucis-pink-600">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span style={{ fontFamily: 'Crimson Text, serif' }}>{stockError}</span>
        </div>
      )}
    </div>
  );
}
