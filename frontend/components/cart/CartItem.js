'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart-context';
import StockBadge from '@/components/ui/StockBadge';
import TierCartPrice from '@/components/products/TierCartPrice';

const MAX_PER_PRODUCT = 10;

export default function CartItem({ item }) {
  const t = useTranslations('cart');
  const { updateItemQuantity, removeItem } = useCart();
  const [isUpdating, setIsUpdating] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(item.quantity);
  const [stockError, setStockError] = useState(null);

  // Sync local quantity with item quantity when it changes externally
  useEffect(() => {
    setLocalQuantity(item.quantity);
  }, [item.quantity]);

  // Clear stock error after a delay
  useEffect(() => {
    if (stockError) {
      const timer = setTimeout(() => setStockError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [stockError]);

  // Get inventory info
  const inventoryQuantity = item.variant?.inventory_quantity;
  const allowBackorder = item.variant?.allow_backorder || false;

  // Check if + button should be disabled (limit of 10 per product)
  const canIncrement = localQuantity < MAX_PER_PRODUCT;

  const handleQuantityChange = async (newQuantity, previousQuantity) => {
    if (newQuantity < 1 || isUpdating) return;
    
    // Enforce max limit of 10
    if (newQuantity > MAX_PER_PRODUCT) {
      setStockError(t('dailyLimitReached') || `Limit of ${MAX_PER_PRODUCT} reached.`);
      return;
    }
    
    const prevQty = previousQuantity || item.quantity;
    
    setIsUpdating(true);
    setStockError(null);
    
    try {
      const result = await updateItemQuantity(item.id, newQuantity);
      // Check if update failed due to inventory
      if (result && !result.success && result.error === 'insufficient_inventory') {
        // Revert to previous quantity
        setLocalQuantity(prevQty);
        
        // Try to get inventory from multiple sources
        const refreshedItem = result.cart?.items?.find(i => i.id === item.id);
        const availableStock = 
          refreshedItem?.variant?.inventory_quantity ??
          inventoryQuantity ??
          prevQty;
        
        // Show the stock limit
        setStockError(t('stockLimit', { available: availableStock }) || `Only ${availableStock} available.`);
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      setLocalQuantity(prevQty);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleButtonClick = (delta) => {
    const previousQty = localQuantity || item.quantity;
    const newQty = Math.max(1, Math.min(MAX_PER_PRODUCT, previousQty + delta));
    if (newQty === localQuantity) return;
    setLocalQuantity(newQty);
    setStockError(null);
    handleQuantityChange(newQty, previousQty);
  };

  const handleRemove = async () => {
    setIsUpdating(true);
    try {
      await removeItem(item.id);
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currency = item.variant?.calculated_price?.currency_code || 'EUR';
  const unitPrice = item.unit_price || 0;
  
  // Get product URL for linking
  const productHandle = item.variant?.product?.handle || item.product_handle;
  const productUrl = productHandle ? `/products/${productHandle}` : null;

  return (
    <div className={`flex gap-3 p-3 bg-baucis-pink-50/50 rounded-2xl transition-opacity duration-200 ${isUpdating ? 'opacity-50' : ''}`}>
      {/* Image */}
      {productUrl ? (
        <Link href={productUrl} className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-baucis-green-50">
              <svg className="w-6 h-6 text-baucis-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </Link>
      ) : (
        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-baucis-green-50">
              <svg className="w-6 h-6 text-baucis-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {productUrl ? (
            <Link href={productUrl} className="block hover:underline">
              <h3 
                className="text-sm text-baucis-green-800 font-medium truncate"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {item.title}
              </h3>
            </Link>
          ) : (
            <h3 
              className="text-sm text-baucis-green-800 font-medium truncate"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {item.title}
            </h3>
          )}
          
          <div className="mt-0.5">
            <TierCartPrice 
              price={unitPrice} 
              currency={currency} 
              className="text-xs"
            />
          </div>
          
          {/* Stock Badge Component */}
          <div className="mt-1">
            <StockBadge
              inventoryQuantity={inventoryQuantity}
              requestedQuantity={item.quantity}
              allowBackorder={allowBackorder}
              showLeadTime={false}
              size="sm"
            />
          </div>
        </div>
        
        {/* Quantity Controls */}
        <div className="flex items-center mt-1">
          <div className="flex items-center bg-white border border-baucis-green-200 rounded-full overflow-hidden shadow-sm">
            <button
              onClick={() => handleButtonClick(-1)}
              disabled={isUpdating || localQuantity <= 1}
              className="w-6 h-6 flex items-center justify-center text-baucis-green-600 hover:bg-baucis-green-50 transition-colors disabled:opacity-40"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <span
              className={`w-8 text-center text-xs font-medium text-baucis-green-800 select-none ${isUpdating ? 'opacity-50' : ''}`}
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {localQuantity}
            </span>
            
            <button
              onClick={() => handleButtonClick(1)}
              disabled={isUpdating || !canIncrement}
              className="w-6 h-6 flex items-center justify-center text-baucis-green-600 hover:bg-baucis-green-50 transition-colors disabled:opacity-40"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        {/* Stock error message - shown after failed update */}
        {stockError && (
          <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-baucis-pink-600">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span style={{ fontFamily: 'Crimson Text, serif' }}>{stockError}</span>
          </div>
        )}
      </div>
      
      {/* Right side: Total + Delete */}
      <div className="flex flex-col items-end justify-between flex-shrink-0">
        {/* Total with Tier Discount */}
        <TierCartPrice 
          price={unitPrice} 
          currency={currency}
          quantity={item.quantity}
          showTotal={true}
          className="text-sm font-semibold"
        />
        
        {/* Delete Button */}
        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors duration-200 disabled:opacity-50 mt-1"
          aria-label={t('remove')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
