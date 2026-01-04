'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

/**
 * POK Guest Checkout Component
 *
 * Uses POK's hosted checkout page (confirmUrl) in a cropped iframe.
 * CSS cropping hides POK branding while showing the card form.
 *
 * Flow:
 * 1. Create SDK order → get confirmUrl
 * 2. Display POK checkout in cropped iframe
 * 3. Poll for order completion
 * 4. Trigger onSuccess when payment completes
 */
export default function PokGuestCheckout({
  cartId,
  customerEmail,
  shippingAmount = 0,    // customShipping.priceEUR from checkout page
  discountAmount = 0,    // tier discount amount from checkout page
  onSuccess,
  onError,
  onCancel,
  isStaging = false,
}) {
  const t = useTranslations('checkout');
  const iframeRef = useRef(null);
  const orderCreatedRef = useRef(false); // Prevent duplicate order creation (React StrictMode)

  // SDK order state
  const [sdkOrderId, setSdkOrderId] = useState(null);
  const [confirmUrl, setConfirmUrl] = useState(null);
  const [orderAmount, setOrderAmount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create SDK order when component mounts
  useEffect(() => {
    if (!cartId) return;
    if (orderCreatedRef.current) return; // Already creating/created
    orderCreatedRef.current = true;

    const createOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('[POK] Creating order with:', { cartId, shippingAmount, discountAmount });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/pok/create-order`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              cart_id: cartId,
              shipping_amount: shippingAmount || 0,
              discount_amount: discountAmount || 0,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || data.details || 'Failed to create order');
        }

        console.log('[POK] SDK order created:', data.sdk_order_id);
        console.log('[POK] Confirm URL:', data.confirm_url);
        console.log('[POK] Amount from API:', data.amount);

        setSdkOrderId(data.sdk_order_id);
        setConfirmUrl(data.confirm_url);
        setOrderAmount(data.amount);
      } catch (err) {
        console.error('[POK] Create order error:', err);
        setError(err.message || 'Failed to initialize payment');
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    createOrder();
  }, [cartId]);

  // Poll for order completion
  useEffect(() => {
    if (!sdkOrderId) return;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/pok/status/${sdkOrderId}`,
          {
            headers: {
              'x-publishable-api-key': process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.isCompleted) {
            console.log('[POK] Order completed (via polling)');
            onSuccess?.({ sdk_order_id: sdkOrderId, transaction_id: data.transactionId });
          }
        }
      } catch (err) {
        // Silent fail - just a polling check
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [sdkOrderId, onSuccess]);

  // Listen for messages from POK iframe (backup for polling)
  useEffect(() => {
    const handleMessage = (event) => {
      // Accept messages from POK domains
      if (!event.origin.includes('pokpay.io') && !event.origin.includes('pok.al')) {
        return;
      }

      console.log('[POK] Received message:', event.data);

      const data = event.data;
      if (data?.type === 'payment_success' || data?.status === 'completed') {
        console.log('[POK] Payment successful via postMessage');
        onSuccess?.({ sdk_order_id: sdkOrderId });
      } else if (data?.type === 'payment_error' || data?.status === 'failed') {
        console.error('[POK] Payment failed:', data);
        setError(data.message || 'Payment failed');
        onError?.(data);
      } else if (data?.type === 'payment_cancelled') {
        console.log('[POK] Payment cancelled');
        onCancel?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sdkOrderId, onSuccess, onError, onCancel]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <svg className="w-8 h-8 animate-spin text-purple-600 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-purple-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
          Initializing payment...
        </p>
      </div>
    );
  }

  // Error state (no order created)
  if (error && !confirmUrl) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">Payment Error</p>
            <p className="text-red-600 text-sm mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-sm text-red-600 underline hover:text-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // POK Checkout iframe with cropping
  return (
    <div className="pok-checkout-wrapper">
      {/* Our custom header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <span className="text-purple-700 text-sm font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            Card Payment
          </span>
        </div>
        {orderAmount && (
          <span className="text-purple-600 text-sm font-medium">
            €{orderAmount.toFixed(2)}
          </span>
        )}
      </div>

      {/* Cropped iframe container */}
      {confirmUrl && (
        <div
          className="relative overflow-hidden rounded-lg bg-white"
          style={{ height: '420px' }}
        >
          <iframe
            ref={iframeRef}
            src={confirmUrl}
            className="w-full border-0"
            style={{
              height: '600px',
              marginTop: '-90px',  // Crop POK header (logo, branding)
              marginBottom: '-90px', // Crop POK footer (app links)
            }}
            title="POK Payment"
            allow="payment"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
          />
        </div>
      )}

      {/* Cancel button */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          Cancel
        </button>
      )}

      {/* Our custom footer */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-purple-100">
        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span className="text-xs text-purple-400" style={{ fontFamily: 'Crimson Text, serif' }}>
          Secured by POK Pay
        </span>
      </div>
    </div>
  );
}
