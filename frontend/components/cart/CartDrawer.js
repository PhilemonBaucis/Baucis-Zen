'use client';

import { useTranslations } from 'next-intl';
import { useCart } from '@/lib/cart-context';
import CartItem from './CartItem';
import Link from 'next/link';
import { useTierDiscount } from '@/components/products/TierCartPrice';

export default function CartDrawer() {
  const t = useTranslations('cart');
  const { cart, isDrawerOpen, closeDrawer, getTotalItems } = useCart();
  const { hasDiscount, discountPercent, applyDiscount, tierName, tierColor } = useTierDiscount();
  
  const items = cart?.items || [];
  const itemCount = getTotalItems();
  
  // Calculate subtotal from items
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const discountedSubtotal = applyDiscount(subtotal);
  const currency = items[0]?.variant?.calculated_price?.currency_code || 'EUR';
  
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <>
      {/* Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={closeDrawer}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-baucis-green-100">
            <h2 
              className="text-xl text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('title')} ({itemCount})
            </h2>
            <button 
              onClick={closeDrawer}
              className="w-10 h-10 flex items-center justify-center text-baucis-green-600 hover:text-baucis-green-800 hover:bg-baucis-green-50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="w-20 h-20 bg-baucis-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-baucis-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p 
                className="text-baucis-green-600 mb-6"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('empty')}
              </p>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="text-baucis-green-600 hover:text-baucis-green-800 underline"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('continueShopping')}
              </Link>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
              
              {/* Footer */}
              <div className="border-t border-baucis-green-100 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span 
                    className="text-baucis-green-600"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {t('subtotal')}
                  </span>
                  <div className="text-right">
                    {hasDiscount ? (
                      <>
                        <span 
                          className={`text-xl font-semibold ${tierColor.price}`}
                          style={{ fontFamily: 'Libre Baskerville, serif' }}
                        >
                          {formatPrice(discountedSubtotal)}
                        </span>
                        <span 
                          className="text-sm text-gray-400 line-through ml-2"
                          style={{ fontFamily: 'Crimson Text, serif' }}
                        >
                          {formatPrice(subtotal)}
                        </span>
                      </>
                    ) : (
                      <span 
                        className="text-xl text-baucis-green-800 font-semibold"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {formatPrice(subtotal)}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* VAT Included Note */}
                <div className="flex items-center gap-1.5 text-xs text-baucis-green-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('vatIncluded')}
                  </span>
                </div>
                
                {/* Shipping Note */}
                <div className="bg-baucis-pink-50 border border-baucis-pink-100 rounded-lg p-2.5">
                  <div className="flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-baucis-pink-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p 
                      className="text-xs text-baucis-pink-700 leading-snug"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {t('shippingNote')}
                    </p>
                  </div>
                </div>
                
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="block w-full bg-baucis-green-600 text-white text-center text-xs tracking-widest py-2.5 rounded-full hover:bg-baucis-green-700 transition-all duration-300"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('checkout').toUpperCase()}
                </Link>
                
                <Link
                  href="/products"
                  onClick={closeDrawer}
                  className="block w-full text-center text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {t('continueShopping')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
