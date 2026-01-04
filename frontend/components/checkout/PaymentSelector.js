'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/checkout';
import PokPayment from './PokPayment';
import { processPokPayment } from '@/lib/pok';

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function PaymentSelector({
  selectedMethod,
  onSelect,
  onSubmit,
  onBack,
  loading,
  cart,
  isLoggedIn = false,
  onPokPaymentComplete = null, // Called when POK payment succeeds
}) {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  
  const total = cart?.total || 0;
  const currency = cart?.currency_code || 'EUR';

  // Payment availability state (fetched from backend)
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [codDisabled, setCodDisabled] = useState(false);
  const [preOrderItems, setPreOrderItems] = useState([]);
  const [hasBackorder, setHasBackorder] = useState(false);

  // POK Pay state
  const [pokAvailable, setPokAvailable] = useState(false);
  const [pokConfigured, setPokConfigured] = useState(false);  // Whether POK credentials are set
  const [pokReason, setPokReason] = useState(null);  // Why POK is not available
  const [pokLoading, setPokLoading] = useState(false);
  const [pokError, setPokError] = useState(null);
  const [pokStep, setPokStep] = useState(null);

  // Turnstile state (for guest checkout)
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [verifyingTurnstile, setVerifyingTurnstile] = useState(false);
  const [turnstileError, setTurnstileError] = useState(null);
  const turnstileWidgetRef = useRef(null);

  // Load Turnstile script for guests
  useEffect(() => {
    if (isLoggedIn || !TURNSTILE_SITE_KEY) return;

    // Check if already loaded
    if (window.turnstile) {
      setTurnstileLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = () => setTurnstileLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetRef.current);
      }
    };
  }, [isLoggedIn]);

  // Render Turnstile widget when script is loaded
  useEffect(() => {
    if (!turnstileLoaded || isLoggedIn || !TURNSTILE_SITE_KEY) return;

    const container = document.getElementById('turnstile-container');
    if (!container || turnstileWidgetRef.current) return;

    turnstileWidgetRef.current = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => {
        setTurnstileToken(token);
        setTurnstileError(null);
      },
      'error-callback': () => {
        setTurnstileError('Verification failed. Please try again.');
        setTurnstileToken(null);
      },
      'expired-callback': () => {
        setTurnstileToken(null);
      },
      theme: 'light',
      size: 'flexible',
    });
  }, [turnstileLoaded, isLoggedIn]);

  // Fetch payment availability when cart changes
  useEffect(() => {
    if (cart?.id) {
      fetchPaymentAvailability(cart.id);
    }
  }, [cart?.id, cart?.items?.length]);

  const fetchPaymentAvailability = async (cartId) => {
    setPaymentLoading(true);
    try {
      const response = await fetch(
        `${MEDUSA_BACKEND_URL}/store/payment/available?cart_id=${cartId}`,
        {
          headers: {
            'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check payment availability');
      }

      const data = await response.json();
      
      // Find COD provider status
      const codProvider = data.providers?.find(p => p.id === 'pp_system_default');
      setCodDisabled(!codProvider?.available);

      // Find POK provider status
      const pokProvider = data.providers?.find(p => p.id === 'pok');
      setPokConfigured(!!pokProvider);  // POK is in list = credentials configured
      setPokAvailable(pokProvider?.available || false);
      setPokReason(pokProvider?.reason || null);

      // Get backorder info
      setHasBackorder(data.backorderInfo?.hasBackorder || false);

      // Get pre-order items from restrictions
      const codRestriction = data.restrictions?.find(r => r.provider === 'pp_system_default');
      setPreOrderItems(codRestriction?.details?.items || []);

      // If COD is disabled and it was selected, switch to available method
      if (!codProvider?.available && selectedMethod === 'cod') {
        if (pokProvider?.available) {
          onSelect('pok');
        } else {
          onSelect('stripe');
        }
      }
    } catch (err) {
      console.error('Failed to fetch payment availability:', err);
      // Fallback: assume COD and POK available (phone verified, Albania/Kosovo region)
      setCodDisabled(false);
      setPokConfigured(true);
      setPokAvailable(true);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Verify Turnstile token with backend before submitting
  const handleSubmit = async () => {
    // For logged-in users, skip Turnstile verification
    if (isLoggedIn) {
      onSubmit();
      return;
    }

    // For guests, verify Turnstile token first
    if (!turnstileToken) {
      setTurnstileError('Please complete the security verification');
      return;
    }

    setVerifyingTurnstile(true);
    setTurnstileError(null);

    try {
      const response = await fetch(`${MEDUSA_BACKEND_URL}/store/verify-turnstile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ token: turnstileToken }),
      });

      const data = await response.json();

      if (!data.success) {
        setTurnstileError('Security verification failed. Please refresh and try again.');
        // Reset Turnstile
        if (turnstileWidgetRef.current && window.turnstile) {
          window.turnstile.reset(turnstileWidgetRef.current);
        }
        setTurnstileToken(null);
        return;
      }

      // Verification successful, proceed with order
      onSubmit();
    } catch (err) {
      console.error('Turnstile verification error:', err);
      setTurnstileError('Verification failed. Please try again.');
    } finally {
      setVerifyingTurnstile(false);
    }
  };

  // Check if order can be placed
  const canPlaceOrder = isLoggedIn || (turnstileToken && !verifyingTurnstile);

  // Handle POK card submission
  const handlePokCardSubmit = async (cardData, on3dsRequired) => {
    setPokLoading(true);
    setPokError(null);

    try {
      const result = await processPokPayment(
        cart?.id,
        cardData,
        (step) => setPokStep(step),
        on3dsRequired
      );

      if (!result.success) {
        setPokError(result.error);
        setPokLoading(false);
        return;
      }

      // Payment successful - call the completion handler
      setPokLoading(false);
      setPokStep(null);
      onPokPaymentComplete?.(result);
    } catch (err) {
      console.error('POK payment error:', err);
      setPokError('Payment failed. Please try again.');
      setPokLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 
          className="text-xl text-baucis-green-800 mb-6"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {t('paymentMethod.title') || 'Payment Method'}
        </h2>
        
        <div className="space-y-3">
          {/* Cash on Delivery */}
          <label
            className={`flex items-start p-4 border-2 rounded-xl transition-all ${
              codDisabled 
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : selectedMethod === 'cod' 
                  ? 'border-baucis-green-500 bg-baucis-green-50 cursor-pointer' 
                  : 'border-baucis-green-100 hover:border-baucis-green-300 cursor-pointer'
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={selectedMethod === 'cod'}
              onChange={() => !codDisabled && onSelect('cod')}
              disabled={codDisabled}
              className="sr-only"
            />
            
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 mt-0.5 ${
              codDisabled 
                ? 'border-gray-300'
                : selectedMethod === 'cod' 
                  ? 'border-baucis-green-500' 
                  : 'border-baucis-green-300'
            }`}>
              {selectedMethod === 'cod' && !codDisabled && (
                <div className="w-2.5 h-2.5 rounded-full bg-baucis-green-500" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  codDisabled ? 'bg-gray-100' : 'bg-amber-100'
                }`}>
                  <svg className={`w-6 h-6 ${codDisabled ? 'text-gray-400' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <span 
                    className={`font-medium ${codDisabled ? 'text-gray-500' : 'text-baucis-green-800'}`}
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {t('paymentMethod.cod.title') || 'Cash on Delivery'}
                  </span>
                  <p 
                    className={`text-sm ${codDisabled ? 'text-red-500' : 'text-baucis-green-500'}`}
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {codDisabled 
                      ? (tCart('codNotAvailable') || 'Not available for pre-orders')
                      : (t('paymentMethod.cod.subtitle') || 'Pay when you receive your order')
                    }
                  </p>
                </div>
              </div>
              
              {selectedMethod === 'cod' && !codDisabled && (
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-amber-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('codMessage') || `Please have`} <strong>{formatPrice(total, currency)}</strong> {t('codMessageEnd') || 'ready when your package arrives. Our courier will collect the payment.'}
                  </p>
                </div>
              )}
            </div>
          </label>

          {/* POK Pay - Card Payment (Albania/Kosovo) */}
          {pokConfigured && (
            <label
              className={`flex items-start p-4 border-2 rounded-xl transition-all ${
                !pokAvailable
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : selectedMethod === 'pok'
                    ? 'border-baucis-green-500 bg-baucis-green-50 cursor-pointer'
                    : 'border-baucis-green-100 hover:border-baucis-green-300 cursor-pointer'
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="pok"
                checked={selectedMethod === 'pok'}
                onChange={() => pokAvailable && onSelect('pok')}
                disabled={!pokAvailable}
                className="sr-only"
              />

              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 mt-0.5 ${
                !pokAvailable
                  ? 'border-gray-300'
                  : selectedMethod === 'pok'
                    ? 'border-baucis-green-500'
                    : 'border-baucis-green-300'
              }`}>
                {selectedMethod === 'pok' && pokAvailable && (
                  <div className="w-2.5 h-2.5 rounded-full bg-baucis-green-500" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    !pokAvailable ? 'bg-gray-100' : 'bg-purple-100'
                  }`}>
                    <svg className={`w-6 h-6 ${!pokAvailable ? 'text-gray-400' : 'text-purple-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <span
                      className={`font-medium ${!pokAvailable ? 'text-gray-500' : 'text-baucis-green-800'}`}
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {t('pokPay') || 'POK Pay'}
                    </span>
                    <p
                      className={`text-sm ${!pokAvailable ? 'text-red-500' : 'text-baucis-green-500'}`}
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {!pokAvailable
                        ? (pokReason === 'phone_not_verified'
                            ? (t('phoneNotVerified') || 'Phone verification required')
                            : pokReason === 'region_not_supported'
                              ? (t('pokRegionOnly') || 'Only available for Albania & Kosovo')
                              : (t('pokNotAvailable') || 'Not available'))
                        : (t('pokPayDescription') || 'Pay with card via POK')
                      }
                    </p>
                  </div>
                </div>

                {selectedMethod === 'pok' && pokAvailable && (
                  <div className="mt-4">
                    <PokPayment
                      onCardSubmit={handlePokCardSubmit}
                      loading={pokLoading}
                      error={pokError}
                      step={pokStep}
                    />
                  </div>
                )}
              </div>
            </label>
          )}
        </div>

        {/* Pre-order notice */}
        {hasBackorder && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <div>
                <p 
                  className="text-blue-800 text-sm font-medium"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {tCart('preOrderNote') || 'Your cart includes pre-order items'}
                </p>
                <p 
                  className="text-blue-600 text-xs mt-1"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {tCart('preOrderPaymentNote') || 'Pre-order items require card payment. Cash on Delivery is not available.'}
                </p>
                {preOrderItems.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {preOrderItems.map((item) => (
                      <li 
                        key={item.id} 
                        className="text-blue-600 text-xs flex items-center"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
                        {item.title} (
                          {item.isFullPreOrder 
                            ? (tCart('preOrder') || 'Pre-order') 
                            : (t('preOrderItemStatus', { available: item.available, backorder: item.backorderQty }) || `${item.available} in stock, ${item.backorderQty} on order`)
                          }
                        )
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Turnstile Bot Protection - Only for guests */}
      {!isLoggedIn && TURNSTILE_SITE_KEY && (
        <div className="border-t border-baucis-green-100 pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <svg className="w-5 h-5 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span 
              className="text-sm text-baucis-green-600"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('securityCheck') || 'Security verification'}
            </span>
          </div>
          
          <div id="turnstile-container" className="flex justify-center" />
          
          {turnstileError && (
            <p className="text-red-500 text-sm mt-2 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
              {turnstileError}
            </p>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center space-x-3 text-baucis-green-500 text-sm">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('securityNotice') || 'Your payment information is secure and encrypted'}
        </span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={pokLoading}
          className="flex-1 sm:flex-none px-6 py-3 border border-baucis-green-300 text-baucis-green-600 rounded-full hover:bg-baucis-green-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span>{t('back') || 'Back'}</span>
        </button>

        {/* Hide main submit button when POK is selected (POK has its own submit) */}
        {selectedMethod !== 'pok' && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || verifyingTurnstile || (!isLoggedIn && !turnstileToken && TURNSTILE_SITE_KEY)}
          className="flex-1 bg-baucis-green-600 text-white py-4 px-6 rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
        >
          {loading || verifyingTurnstile ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{verifyingTurnstile ? (t('verifying') || 'VERIFYING...') : (t('processing') || 'PROCESSING...')}</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>{t('placeOrder') || 'PLACE ORDER'} • {formatPrice(total, currency)}</span>
            </>
          )}
        </button>
        )}

        {/* POK Submit Button */}
        {selectedMethod === 'pok' && (
          <button
            type="button"
            onClick={() => {
              // Trigger form submission in PokPayment component
              const form = document.querySelector('form');
              if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }}
            disabled={pokLoading || (!isLoggedIn && !turnstileToken && TURNSTILE_SITE_KEY)}
            className="flex-1 bg-purple-600 text-white py-4 px-6 rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
          >
            {pokLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('processing') || 'PROCESSING...'}</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{t('payWithPok') || 'PAY WITH POK'} • {formatPrice(total, currency)}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
