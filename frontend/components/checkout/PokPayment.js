'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { formatCardNumber, formatExpiry, detectCardBrand } from '@/lib/pok';

/**
 * POK Payment Component
 *
 * Secure card input form with 3DS iframe handling.
 * Card data is sent directly to POK - never stored locally.
 */
export default function PokPayment({
  onCardSubmit,
  loading = false,
  error = null,
  step = null,
}) {
  const t = useTranslations('checkout');

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [cardBrand, setCardBrand] = useState('unknown');

  // 3DS iframe state
  const [show3dsIframe, setShow3dsIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  const iframeRef = useRef(null);

  // Validation state
  const [errors, setErrors] = useState({});

  // Detect card brand on number change
  useEffect(() => {
    setCardBrand(detectCardBrand(cardNumber));
  }, [cardNumber]);

  // Listen for 3DS completion messages
  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from POK domain
      if (!event.origin.includes('pokpay.io')) return;

      const data = event.data;
      if (data?.type === '3ds_complete') {
        setShow3dsIframe(false);
        // Pass auth info back to parent
        if (data.success && window.pok3dsResolve) {
          window.pok3dsResolve({
            success: true,
            authInfo: data.consumerAuthenticationInformation,
          });
        } else if (window.pok3dsResolve) {
          window.pok3dsResolve({
            success: false,
            error: data.error || '3DS authentication failed',
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    const cardDigits = cardNumber.replace(/\s/g, '');
    if (!cardDigits || cardDigits.length < 13) {
      newErrors.cardNumber = t('invalidCardNumber') || 'Invalid card number';
    }

    const [month, year] = expiry.split('/');
    if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
      newErrors.expiry = t('invalidExpiry') || 'Invalid expiry date';
    }

    if (!cvv || cvv.length < 3) {
      newErrors.cvv = t('invalidCvv') || 'Invalid CVV';
    }

    if (!holderName.trim()) {
      newErrors.holderName = t('invalidHolderName') || 'Cardholder name required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const [month, year] = expiry.split('/');
    const cardData = {
      cardNumber: cardNumber.replace(/\s/g, ''),
      expiryMonth: month,
      expiryYear: year.length === 2 ? '20' + year : year,
      cvv,
      holderName: holderName.trim(),
    };

    onCardSubmit?.(cardData, handle3dsRequired);
  };

  // Handle 3DS requirement
  const handle3dsRequired = (stepUp) => {
    return new Promise((resolve) => {
      // Store resolve function globally for message handler
      window.pok3dsResolve = resolve;

      // Show 3DS iframe
      setIframeUrl(stepUp.url);
      setShow3dsIframe(true);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (window.pok3dsResolve) {
          window.pok3dsResolve({
            success: false,
            error: '3DS authentication timed out',
          });
          setShow3dsIframe(false);
        }
      }, 5 * 60 * 1000);
    });
  };

  // Get step message
  const getStepMessage = () => {
    switch (step) {
      case 'creating_order':
        return t('creatingOrder') || 'Creating order...';
      case 'tokenizing_card':
        return t('processingCard') || 'Processing card...';
      case 'checking_3ds':
        return t('verifyingCard') || 'Verifying card...';
      case 'awaiting_3ds':
        return t('awaitingVerification') || 'Complete verification...';
      case 'confirming_payment':
        return t('confirmingPayment') || 'Confirming payment...';
      default:
        return t('processing') || 'Processing...';
    }
  };

  // Card brand icon
  const CardBrandIcon = () => {
    const iconClass = 'w-8 h-8';

    if (cardBrand === 'visa') {
      return (
        <svg className={iconClass} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#1434CB" />
          <path d="M19.5 30H16.5L18.5 18H21.5L19.5 30Z" fill="white" />
          <path d="M29 18L26.5 26L26 23.5L25 19C25 19 24.8 18 23.5 18H19L19 18.5C19 18.5 20.5 18.8 22 19.5L24.5 30H27.5L32 18H29Z" fill="white" />
        </svg>
      );
    }

    if (cardBrand === 'mastercard') {
      return (
        <svg className={iconClass} viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="8" fill="#2B2B2B" />
          <circle cx="20" cy="24" r="10" fill="#EB001B" />
          <circle cx="28" cy="24" r="10" fill="#F79E1B" />
          <path d="M24 16.5C26.5 18.5 28 21 28 24C28 27 26.5 29.5 24 31.5C21.5 29.5 20 27 20 24C20 21 21.5 18.5 24 16.5Z" fill="#FF5F00" />
        </svg>
      );
    }

    // Default card icon
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10H22" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* 3DS Iframe Modal */}
      {show3dsIframe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 bg-baucis-green-50 border-b border-baucis-green-100">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-baucis-green-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-baucis-green-800 font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                  {t('secureVerification') || 'Secure Verification'}
                </span>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-96 border-0"
              title="3DS Authentication"
              sandbox="allow-scripts allow-forms allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Card Form */}
      <form id="pok-payment-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Card Number */}
        <div>
          <label
            className="block text-sm text-baucis-green-600 mb-1"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('cardNumber') || 'Card Number'}
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              disabled={loading}
              className={`w-full px-4 py-3 pr-12 border-2 rounded-lg transition-colors ${
                errors.cardNumber
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-baucis-green-100 focus:border-baucis-green-500'
              } focus:outline-none disabled:bg-gray-50`}
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <CardBrandIcon />
            </div>
          </div>
          {errors.cardNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm text-baucis-green-600 mb-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('expiryDate') || 'Expiry Date'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              disabled={loading}
              className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                errors.expiry
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-baucis-green-100 focus:border-baucis-green-500'
              } focus:outline-none disabled:bg-gray-50`}
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
            {errors.expiry && (
              <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>
            )}
          </div>

          <div>
            <label
              className="block text-sm text-baucis-green-600 mb-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('cvv') || 'CVV'}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-csc"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
              placeholder="123"
              maxLength={4}
              disabled={loading}
              className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                errors.cvv
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-baucis-green-100 focus:border-baucis-green-500'
              } focus:outline-none disabled:bg-gray-50`}
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
            {errors.cvv && (
              <p className="text-red-500 text-xs mt-1">{errors.cvv}</p>
            )}
          </div>
        </div>

        {/* Cardholder Name */}
        <div>
          <label
            className="block text-sm text-baucis-green-600 mb-1"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('cardholderName') || 'Cardholder Name'}
          </label>
          <input
            type="text"
            autoComplete="cc-name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value.toUpperCase())}
            placeholder="JOHN DOE"
            disabled={loading}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
              errors.holderName
                ? 'border-red-300 focus:border-red-500'
                : 'border-baucis-green-100 focus:border-baucis-green-500'
            } focus:outline-none disabled:bg-gray-50`}
            style={{ fontFamily: 'Crimson Text, serif' }}
          />
          {errors.holderName && (
            <p className="text-red-500 text-xs mt-1">{errors.holderName}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center space-x-3 text-baucis-green-600">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span style={{ fontFamily: 'Crimson Text, serif' }}>{getStepMessage()}</span>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center space-x-2 text-xs text-baucis-green-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('pokSecurityNotice') || 'Your card details are securely processed by POK Pay'}
          </span>
        </div>

        {/* POK Pay Branding */}
        <div className="flex items-center justify-center space-x-2 pt-2 border-t border-baucis-green-100">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('poweredBy') || 'Powered by'}
          </span>
          <span className="font-semibold text-sm text-blue-600">POK Pay</span>
        </div>
      </form>
    </div>
  );
}
