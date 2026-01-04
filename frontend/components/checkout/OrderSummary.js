'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/checkout';
import { useTranslations } from 'next-intl';
import { useTierDiscount } from '@/components/products/TierCartPrice';

// Calculate lead time for an item based on inventory
const getItemLeadTime = (item) => {
  const inventoryQty = item.variant?.inventory_quantity;
  const orderedQty = item.quantity;
  const isInStock = inventoryQty === undefined || inventoryQty >= orderedQty;
  
  return {
    isInStock,
    minDays: isInStock ? 2 : 14,
    maxDays: isInStock ? 3 : 21,
  };
};

// Calculate overall delivery estimate based on all items and shipping
const calculateDeliveryEstimate = (items, shippingOption) => {
  // Get the longest lead time from all items
  let maxMinDays = 0;
  let maxMaxDays = 0;
  let allInStock = true;
  
  items.forEach(item => {
    const leadTime = getItemLeadTime(item);
    if (!leadTime.isInStock) allInStock = false;
    maxMinDays = Math.max(maxMinDays, leadTime.minDays);
    maxMaxDays = Math.max(maxMaxDays, leadTime.maxDays);
  });
  
  // Add shipping transit time (estimate based on shipping option)
  const shippingDays = shippingOption?.name?.toLowerCase().includes('express') ? 1 : 
                       shippingOption?.name?.toLowerCase().includes('standard') ? 3 : 2;
  
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + maxMinDays + shippingDays);
  
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxMaxDays + shippingDays);
  
  return { minDate, maxDate, allInStock };
};

export default function OrderSummary({ 
  cart, 
  potentialPoints = 0,
  shippingOption = null,
  customShipping = null,
  shippingReady = false,
  calculatingShipping = false,
  currentStep = 1,
  onContinueToPayment,
  loading = false,
  phoneRequired = false,
  hideProceedButton = false,
}) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const { hasDiscount, discountPercent, applyDiscount, tierName, tierColor, currentTier } = useTierDiscount();
  
  const items = cart?.items || [];
  
  // Calculate subtotal from item unit prices (same as CartDrawer)
  // This ensures consistency and uses original prices before any discounts
  const subtotal = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
  const discountedSubtotal = applyDiscount(subtotal);
  
  // Use custom shipping price (already in EUR from API)
  const shippingPriceEUR = customShipping?.priceEUR || 0;
  const shippingTotal = customShipping ? shippingPriceEUR : (cart?.shipping_total || 0);
  
  // Taxes are included in prices - no separate tax line needed
  const originalTotal = cart?.total || 0;
  
  // Calculate total: discounted products + shipping
  // Discount only applies to products, not shipping
  const productTotal = hasDiscount ? discountedSubtotal : subtotal;
  const total = productTotal + shippingTotal;
  
  // Original total (without discount) for strikethrough display
  const originalTotalWithShipping = subtotal + shippingTotal;
  
  const currency = cart?.currency_code || 'EUR';

  // Show proceed button only on step 1 (information) when shipping is ready and phone is provided
  const showProceedButton = !hideProceedButton && currentStep === 1 && shippingReady && !phoneRequired;
  const showPhoneRequiredMessage = !hideProceedButton && currentStep === 1 && shippingReady && phoneRequired;

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 sticky top-24">
      <h3 
        className="text-lg text-baucis-green-800 mb-4 pb-4 border-b border-baucis-green-100"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('orderSummary')}
      </h3>

      {/* Cart Items */}
      <div className="space-y-4 mb-6 max-h-72 overflow-y-auto">
        {items.map((item) => {
          const image = item.thumbnail || item.variant?.product?.thumbnail;
          const title = item.title || item.variant?.product?.title || 'Product';
          const unitPrice = item.unit_price || 0;
          const leadTime = getItemLeadTime(item);
          const productHandle = item.variant?.product?.handle || item.product_handle;
          const productUrl = productHandle ? `/products/${productHandle}` : null;
          
          return (
            <div key={item.id} className="flex items-start gap-3">
              {productUrl ? (
                <Link href={productUrl} className="relative w-14 h-14 bg-baucis-pink-50 rounded-lg overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity">
                  {image ? (
                    <img 
                      src={image} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-baucis-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Quantity Badge */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-baucis-green-600 text-white text-xs rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </Link>
              ) : (
                <div className="relative w-14 h-14 bg-baucis-pink-50 rounded-lg overflow-hidden flex-shrink-0">
                  {image ? (
                    <img 
                      src={image} 
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-baucis-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  {/* Quantity Badge */}
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-baucis-green-600 text-white text-xs rounded-full flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {productUrl ? (
                  <Link href={productUrl} className="block hover:text-baucis-green-600 transition-colors">
                    <p 
                      className="text-sm text-baucis-green-800 truncate hover:underline"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {title}
                    </p>
                  </Link>
                ) : (
                  <p 
                    className="text-sm text-baucis-green-800 truncate"
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {title}
                  </p>
                )}
                <p 
                  className="text-xs text-baucis-green-500"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {hasDiscount ? (
                    <>
                      <span className={tierColor.price}>{formatPrice(applyDiscount(unitPrice), currency)}</span>
                      <span className="line-through text-gray-400 ml-1">{formatPrice(unitPrice, currency)}</span>
                    </>
                  ) : (
                    formatPrice(unitPrice, currency)
                  )} × {item.quantity}
                </p>
                {/* Stock status for this item - always visible */}
                <div className="flex items-center gap-1 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${leadTime.isInStock ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span 
                    className={`text-[10px] ${leadTime.isInStock ? 'text-green-600' : 'text-amber-600'}`}
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {leadTime.isInStock ? tCart('inStock') : tCart('madeToOrder')}
                  </span>
                </div>
              </div>
              
              <span 
                className="text-sm flex-shrink-0"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {hasDiscount ? (
                  <span className="flex flex-col items-end">
                    <span className={tierColor.price}>{formatPrice(applyDiscount(unitPrice * item.quantity), currency)}</span>
                    <span className="text-xs text-gray-400 line-through">{formatPrice(unitPrice * item.quantity, currency)}</span>
                  </span>
                ) : (
                  <span className="text-baucis-green-700">{formatPrice(item.total || unitPrice * item.quantity, currency)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="space-y-3 pt-4 border-t border-baucis-green-100">
        <div className="flex justify-between text-sm">
          <span className="text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
            Subtotal
          </span>
          <span style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {hasDiscount ? (
              <>
                <span className={tierColor.price}>{formatPrice(discountedSubtotal, currency)}</span>
                <span className="text-gray-400 line-through text-xs ml-1">{formatPrice(subtotal, currency)}</span>
              </>
            ) : (
              <span className="text-baucis-green-800">{formatPrice(subtotal, currency)}</span>
            )}
          </span>
        </div>
        
        {/* Shipping - show loading, or name and cost when ready */}
        <div className="flex justify-between text-sm">
          <span className="text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
            {customShipping ? (
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span>{customShipping.zoneName || 'Shipping'}</span>
              </span>
            ) : shippingOption ? (
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span>{shippingOption.name || 'Shipping'}</span>
              </span>
            ) : (
              'Shipping'
            )}
          </span>
          <span className="text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {calculatingShipping ? (
              <span className="flex items-center space-x-2 text-baucis-green-500">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs">{t('calculating') || 'Calculating...'}</span>
              </span>
            ) : shippingReady && customShipping ? (
              <span>{formatPrice(shippingTotal, currency)}</span>
            ) : shippingReady ? (
              shippingTotal === 0 ? 'Free' : formatPrice(shippingTotal, currency)
            ) : (
              <span className="text-baucis-green-400 text-xs">{t('enterAddressFirst') || 'Enter address first'}</span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between pt-3 border-t border-baucis-green-100">
          <span
            className="text-baucis-green-800 font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            Total
          </span>
          <div className="text-right">
            {calculatingShipping ? (
              <span className="flex items-center space-x-2 text-baucis-green-500">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : hasDiscount ? (
              <>
                <span
                  className={`text-xl font-semibold ${tierColor.price}`}
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {formatPrice(total, currency)}
                </span>
                <span
                  className="text-sm text-gray-400 line-through ml-2"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {formatPrice(originalTotalWithShipping, currency)}
                </span>
              </>
            ) : (
              <span
                className="text-xl text-baucis-green-800 font-semibold"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {formatPrice(total, currency)}
              </span>
            )}
          </div>
        </div>
        
        {/* VAT note - below total */}
        <p className="text-[10px] text-baucis-green-400 text-right mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('vatTaxesIncluded') || 'VAT / Taxes included'}
        </p>
      </div>

      {/* Delivery Estimate - show when shipping is ready */}
      {shippingReady && (
        <div className="mt-4 pt-4 border-t border-baucis-green-100">
          {(() => {
            const delivery = calculateDeliveryEstimate(items, shippingOption);
            const formatDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            return (
              <div className="bg-gradient-to-br from-baucis-green-50 to-baucis-pink-50 rounded-2xl p-4 border border-baucis-green-100">
                {/* Delivery Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-baucis-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  </div>
                  <span 
                    className="text-baucis-green-700 text-sm font-medium"
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {t('estimatedDelivery') || 'Delivery'}
                  </span>
                </div>
                
                {/* Delivery Time - Prominent */}
                {customShipping ? (
                  <div className="text-center py-2">
                    <p 
                      className="text-2xl font-bold text-baucis-green-800 mb-1"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {customShipping.deliveryTime}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-baucis-green-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span 
                        className="text-xs"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        Ultra C.E.P Express • {customShipping.zoneName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p 
                      className="text-lg font-bold text-baucis-green-800"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {formatDate(delivery.minDate)} - {formatDate(delivery.maxDate)}
                    </p>
                  </div>
                )}
                
                {/* Made to Order Warning */}
                {!delivery.allInStock && (
                  <div className="mt-2 pt-2 border-t border-baucis-green-100/50 flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span 
                      className="text-amber-600 text-[10px]"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {t('includesMadeToOrder') || 'Includes made-to-order items'}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Zen Points Preview - compact, tier-styled */}
      {potentialPoints > 0 && (
        <div className="mt-3 pt-3 border-t border-baucis-green-100">
          <div className={`bg-white rounded-xl px-3 py-2 flex items-center justify-between border-2 ${currentTier === 'seed' ? 'border-stone-300' : currentTier === 'sprout' ? 'border-emerald-400' : currentTier === 'blossom' ? 'border-pink-400' : 'border-amber-400'}`}>
            <div className="flex items-center gap-2">
              {/* Tier Icon - matching tier table icons */}
              <div className={`p-1 rounded-lg ${currentTier === 'seed' ? 'bg-stone-100' : currentTier === 'sprout' ? 'bg-emerald-100' : currentTier === 'blossom' ? 'bg-gradient-to-br from-pink-100 to-rose-100' : 'bg-gradient-to-br from-amber-200 to-yellow-100'}`}>
                {currentTier === 'seed' && (
                  <svg className="w-4 h-4 text-stone-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18c-4 0-6-3-6-6 0-4 3-8 6-10 3 2 6 6 6 10 0 3-2 6-6 6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
                  </svg>
                )}
                {currentTier === 'sprout' && (
                  <svg className="w-4 h-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c-3 0-5-2.5-5-5 0-3.5 2.5-6 5-8 2.5 2 5 4.5 5 8 0 2.5-2 5-5 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 18c0-2 2-3 5-3s5 1 5 3" />
                  </svg>
                )}
                {currentTier === 'blossom' && (
                  <svg className="w-4 h-4 text-pink-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c0 3-2 5-2 5s2 2 2 5c0-3 2-5 2-5s-2-2-2-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M22 12c-3 0-5-2-5-2s-2 2-5 2c3 0 5 2 5 2s2-2 5-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c0-3 2-5 2-5s-2-2-2-5c0 3-2 5-2 5s2 2 2 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c3 0 5 2 5 2s2-2 5-2c-3 0-5-2-5-2s-2 2-5 2z" />
                  </svg>
                )}
                {currentTier === 'lotus' && (
                  <svg className="w-4 h-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2 3-3 6-3 9s1 6 3 9c2-3 3-6 3-9s-1-6-3-9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12c2-1 4-1 7-1s5 0 7 1c-1 3-3 5-7 7-4-2-6-4-7-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10c3 0 5 1 6 2-1 2-3 3-6 3 0-2 0-4 0-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c-3 0-5 1-6 2 1 2 3 3 6 3 0-2 0-4 0-5z" />
                  </svg>
                )}
              </div>
              <span 
                className={`text-xs ${tierColor.text}`}
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('zenPointsAddedWithOrder') || 'Zen Points added with this order'}
              </span>
            </div>
            <span 
              className={`font-bold text-base ${tierColor.price}`}
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              +{potentialPoints}
            </span>
          </div>
        </div>
      )}

      {/* Proceed to Payment Button */}
      {showProceedButton && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onContinueToPayment}
            disabled={loading || !shippingReady}
            className="w-full bg-baucis-green-600 text-white py-4 px-6 rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{(t('processing') || 'Processing...').toUpperCase()}</span>
              </>
            ) : (
              <>
                <span>{t('proceedToPayment') || 'PROCEED TO PAYMENT'}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Phone Verification Required Message */}
      {showPhoneRequiredMessage && (
        <div className="mt-6 flex items-center justify-center space-x-2 text-amber-600 bg-amber-50 rounded-full py-3 px-4">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
          <span 
            className="text-sm"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('phoneVerificationRequired') || 'Phone verification required to proceed'}
          </span>
        </div>
      )}

      {/* Trust & Security Section */}
      <div className="mt-6 pt-5 border-t border-baucis-green-100 space-y-4">
        {/* SSL Secure Badge */}
        <div className="flex items-center justify-center gap-2 text-baucis-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('sslSecure') || 'SSL Secure Checkout'}
          </span>
        </div>

        {/* Trust Badges Grid */}
        <div className="grid grid-cols-3 gap-2">
          {/* Secure Payment */}
          <div className="flex flex-col items-center p-2 bg-baucis-green-50/50 rounded-lg">
            <svg className="w-5 h-5 text-baucis-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] text-baucis-green-600 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('securePayment') || 'Secure Payment'}
            </span>
          </div>
          
          {/* Privacy Protected */}
          <div className="flex flex-col items-center p-2 bg-baucis-green-50/50 rounded-lg">
            <svg className="w-5 h-5 text-baucis-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            <span className="text-[10px] text-baucis-green-600 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('privacyProtected') || 'Privacy Protected'}
            </span>
          </div>
          
          {/* Money Back */}
          <div className="flex flex-col items-center p-2 bg-baucis-green-50/50 rounded-lg">
            <svg className="w-5 h-5 text-baucis-green-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-[10px] text-baucis-green-600 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('moneyBackGuarantee') || 'Money-Back Guarantee'}
            </span>
          </div>
        </div>

        {/* Accepted Payment Methods */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">{t('acceptedCards') || 'Accepted Cards'}</span>
          <div className="flex items-center justify-center gap-3">
            {/* Visa */}
            <div className="w-16 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm p-1.5">
              <img src="/visa.png" alt="Visa" className="h-full w-auto object-contain" />
            </div>
            {/* Mastercard */}
            <div className="w-16 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center shadow-sm p-1.5">
              <img src="/mastercard.png" alt="Mastercard" className="h-full w-auto object-contain" />
            </div>
          </div>
        </div>
        
        {/* Powered by POK */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-1">
          <span className="text-[9px] text-gray-400">{t('poweredBy') || 'Powered by'}</span>
          <div className="flex items-center gap-0.5">
            <span className="text-xs font-semibold text-baucis-green-600" style={{ fontFamily: 'Libre Baskerville, serif' }}>POK</span>
            <svg className="w-3 h-3 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        
        {/* Bank of Albania License */}
        <p className="text-[9px] text-gray-400 text-center">
          {t('licensedByBOA') || 'Licensed by Bank of Albania'}
        </p>
      </div>
    </div>
  );
}
