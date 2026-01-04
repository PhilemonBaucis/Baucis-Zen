'use client';

import { formatPrice } from '@/lib/checkout';
import { useTranslations } from 'next-intl';

export default function ShippingOptions({ 
  options, 
  selectedId, 
  onSelect, 
  onSubmit, 
  onBack,
  loading 
}) {
  const t = useTranslations('checkout');

  return (
    <div className="space-y-6">
      <div>
        <h2 
          className="text-xl text-baucis-green-800 mb-6"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {t('shippingMethod') || 'Shipping Method'}
        </h2>
        
        {options.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('noShippingOptions') || 'No shipping options available for your address. Please check your address or contact support.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((option) => {
              const price = option.amount || 0;
              const isSelected = selectedId === option.id;
              
              return (
                <label
                  key={option.id}
                  className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-baucis-green-500 bg-baucis-green-50' 
                      : 'border-baucis-green-100 hover:border-baucis-green-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={option.id}
                    checked={isSelected}
                    onChange={() => onSelect(option.id)}
                    className="sr-only"
                  />
                  
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 ${
                    isSelected ? 'border-baucis-green-500' : 'border-baucis-green-300'
                  }`}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-baucis-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-baucis-green-800 font-medium"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {option.name}
                      </span>
                      <span 
                        className="text-baucis-green-700 font-medium"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {price === 0 ? (t('free') || 'Free') : formatPrice(price, 'EUR')}
                      </span>
                    </div>
                    {option.description && (
                      <p 
                        className="text-sm text-baucis-green-500 mt-1"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {option.description}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery Estimate */}
      <div className="bg-baucis-pink-50 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-baucis-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p 
              className="text-baucis-green-800 font-medium text-sm"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('estimatedDeliveryShort') || 'Estimated Delivery'}
            </p>
            <p 
              className="text-baucis-green-500 text-sm"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('estimatedDeliveryNote') || '1-3 business days within Albania'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 sm:flex-none px-6 py-3 border border-baucis-green-300 text-baucis-green-600 rounded-full hover:bg-baucis-green-50 transition-colors flex items-center justify-center space-x-2"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          <span>{t('back') || 'Back'}</span>
        </button>
        
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !selectedId}
          className="flex-1 bg-baucis-green-600 text-white py-3 px-6 rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
        >
          {loading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{(t('saving') || 'Saving...').toUpperCase()}</span>
            </>
          ) : (
            <>
              <span>{(t('continueToPayment') || 'Continue to Payment').toUpperCase()}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

