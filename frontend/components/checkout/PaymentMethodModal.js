'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

/**
 * Payment Method Selection Modal
 * 
 * Two options:
 * 1. Digital Payment (POK) - Coming Soon with 2.5% discount incentive
 * 2. Cash on Delivery - Available in Albania only
 */
export default function PaymentMethodModal({
  isOpen,
  onClose,
  onSelectPayment,
  countryCode = 'al',
  totalAmount = 0,
  currency = 'EUR',
}) {
  const t = useTranslations('checkout');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  // Check if COD is available (Albania only)
  const isCodAvailable = countryCode?.toLowerCase() === 'al';
  
  // Calculate 2.5% discount for digital payment
  const digitalDiscount = totalAmount * 0.025;

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  // Handle COD selection
  const handleSelectCod = () => {
    if (!isCodAvailable) return;
    setSelectedMethod('cod');
  };

  // Handle confirm
  const handleConfirm = () => {
    if (selectedMethod === 'cod') {
      onSelectPayment('cod');
      handleClose();
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
        {/* Header */}
        <div className="relative bg-gradient-to-r from-baucis-green-600 to-baucis-green-700 px-6 py-5">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <div>
              <h2 
                className="text-xl text-white font-medium"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('paymentMethod.title') || 'Choose Payment Method'}
              </h2>
              <p 
                className="text-white/80 text-sm mt-0.5"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('paymentMethod.subtitle') || 'Select how you want to pay'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Digital Payment Card - POK Pay */}
            <div
              className={`relative border-2 rounded-2xl p-5 transition-all duration-200 cursor-pointer ${
                selectedMethod === 'pok'
                  ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                  : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
              }`}
              onClick={() => {
                setSelectedMethod('pok');
                onSelectPayment('pok');
                handleClose();
              }}
            >
              {/* Available Badge */}
              <div className="absolute -top-2 -right-2 z-10">
                <span className={`text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg ${
                  selectedMethod === 'pok' ? 'bg-purple-500' : 'bg-purple-400'
                }`}>
                  {t('paymentMethod.digital.available') || 'AVAILABLE'}
                </span>
              </div>

              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                  selectedMethod === 'pok' ? 'bg-purple-500' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                }`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                {selectedMethod === 'pok' && (
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <h3
                className="text-lg text-gray-800 font-medium mb-1"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('paymentMethod.digital.title') || 'Pay Online'}
              </h3>
              <p
                className="text-purple-600 text-sm mb-4"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('paymentMethod.digital.subtitle') || 'Visa, Mastercard via POK'}
              </p>

              {/* Card Logos */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 px-2 bg-white rounded border border-gray-200 flex items-center">
                  <span className="text-xs font-bold text-blue-600">VISA</span>
                </div>
                <div className="h-6 px-2 bg-white rounded border border-gray-200 flex items-center">
                  <span className="text-xs font-bold text-orange-500">MC</span>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-center gap-1.5 text-purple-600 text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('paymentMethod.digital.securedBy') || 'Secured by POK - Bank of Albania'}
                </span>
              </div>
            </div>

            {/* Cash on Delivery Card */}
            <div 
              className={`relative border-2 rounded-2xl p-5 transition-all duration-200 ${
                selectedMethod === 'cod' 
                  ? 'border-baucis-green-500 bg-baucis-green-50 ring-2 ring-baucis-green-200' 
                  : isCodAvailable 
                    ? 'border-gray-200 hover:border-baucis-green-300 hover:bg-baucis-green-50/50 cursor-pointer' 
                    : 'border-gray-200 opacity-60 cursor-not-allowed bg-gray-50'
              }`}
              onClick={handleSelectCod}
            >
              {/* Available Badge */}
              {isCodAvailable && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="bg-baucis-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    {t('paymentMethod.cod.available') || 'AVAILABLE'}
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                  isCodAvailable 
                    ? 'bg-gradient-to-br from-baucis-green-500 to-baucis-green-600' 
                    : 'bg-gray-400'
                }`}>
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                
                {/* Selection Indicator */}
                {selectedMethod === 'cod' && (
                  <div className="w-6 h-6 bg-baucis-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <h3 
                className={`text-lg font-medium mb-1 ${isCodAvailable ? 'text-gray-800' : 'text-gray-500'}`}
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('paymentMethod.cod.title') || 'Cash on Delivery'}
              </h3>
              <p 
                className={`text-sm mb-4 ${isCodAvailable ? 'text-baucis-green-600' : 'text-gray-400'}`}
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('paymentMethod.cod.subtitle') || 'Pay when you receive'}
              </p>

              {isCodAvailable ? (
                <>
                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-baucis-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span 
                        className="text-gray-700 text-sm"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {t('paymentMethod.cod.noExtraFees') || 'No extra fees'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-baucis-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span 
                        className="text-gray-700 text-sm"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {t('paymentMethod.cod.exactAmount') || 'Please have exact amount ready'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-baucis-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span 
                        className="text-gray-700 text-sm"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {t('paymentMethod.cod.albaniaOnly') || 'Available in Albania only'}
                      </span>
                    </div>
                  </div>

                  {/* Albania Flag */}
                  <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <img 
                      width="20" 
                      height="15" 
                      alt="AL" 
                      className="rounded-sm object-cover" 
                      srcSet="https://flagcdn.com/w80/al.png 2x" 
                      src="https://flagcdn.com/w40/al.png" 
                      style={{ minWidth: '20px' }}
                    />
                    <span style={{ fontFamily: 'Crimson Text, serif' }}>Albania</span>
                  </div>
                </>
              ) : (
                /* Kosovo - Not Available Message */
                <div className="flex items-start gap-2 text-xs text-gray-500 mt-2">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('paymentMethod.cod.kosovoNote') || 'Cash on Delivery is not available for Kosovo. Digital payment options coming soon.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-6 border-2 border-gray-200 text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('paymentMethod.cancel') || 'Cancel'}
            </button>
            
            <button
              onClick={handleConfirm}
              disabled={!selectedMethod}
              className={`flex-1 py-3 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-2 ${
                selectedMethod 
                  ? 'bg-baucis-green-600 text-white hover:bg-baucis-green-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
            >
              {selectedMethod === 'cod' ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t('paymentMethod.cod.selectButton') || 'CONFIRM CASH ON DELIVERY'}
                </>
              ) : (
                t('paymentMethod.selectMethod') || 'SELECT A PAYMENT METHOD'
              )}
            </button>
          </div>

          {/* Security Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>SSL Secured</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>Protected Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-fade-out { animation: fadeOut 0.2s ease-out; }
        .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        .animate-scale-out { animation: scaleOut 0.2s ease-out; }
      `}</style>
    </div>
  );
}


