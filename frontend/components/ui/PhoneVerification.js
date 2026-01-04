'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import PhoneInput from './PhoneInput';

// Icons
const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

/**
 * OTP Input Component - Individual boxes for each digit
 */
function OTPInput({ length = 6, value, onChange, onComplete, disabled, error }) {
  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(new Array(length).fill(''));

  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      while (otpArray.length < length) otpArray.push('');
      setOtp(otpArray);
    } else {
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const newOtp = [...otp];
    // Take only the last digit if multiple were pasted
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === length) {
      onComplete?.(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pastedData) {
      const newOtp = pastedData.split('');
      while (newOtp.length < length) newOtp.push('');
      setOtp(newOtp);
      onChange?.(pastedData);
      
      // Focus last filled input or first empty
      const lastIndex = Math.min(pastedData.length, length) - 1;
      inputRefs.current[lastIndex]?.focus();

      if (pastedData.length === length) {
        onComplete?.(pastedData);
      }
    }
  };

  const handleFocus = (index) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex justify-center gap-1.5 sm:gap-2">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={`
            w-9 h-11 sm:w-10 sm:h-12 
            text-center text-lg sm:text-xl font-bold
            border-2 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-1
            transition-all duration-200
            ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}
            ${error 
              ? 'border-red-400 focus:border-red-500 focus:ring-red-400 text-red-600' 
              : digit 
                ? 'border-baucis-green-500 focus:border-baucis-green-600 focus:ring-baucis-green-400 text-baucis-green-800' 
                : 'border-baucis-green-200 focus:border-baucis-green-500 focus:ring-baucis-green-400 text-baucis-green-800'
            }
          `}
          style={{ fontFamily: 'monospace' }}
        />
      ))}
    </div>
  );
}

/**
 * PhoneVerification Component - Redesigned with OTP boxes
 */
export default function PhoneVerification({
  phone = '',
  onPhoneChange,
  onVerified,
  isVerified = false,
  verifiedPhone = '',
  cartId = null,
  required = false,
  disabled = false,
  autoTrigger = true, // Auto-send code when phone is valid
}) {
  const t = useTranslations('checkout');
  
  // Component state
  const [state, setState] = useState('input'); // 'input' | 'sending' | 'code' | 'verifying' | 'verified' | 'error'
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [lastSentPhone, setLastSentPhone] = useState('');

  // Check if current phone matches verified phone
  const phoneMatchesVerified = isVerified && verifiedPhone && phone === verifiedPhone;

  // Reset state when phone changes significantly
  useEffect(() => {
    if (phone !== lastSentPhone && state === 'code') {
      // Phone changed while in code entry - reset
      setState('input');
      setCode('');
      setError(null);
    }
    if (phoneMatchesVerified) {
      setState('verified');
    }
  }, [phone, lastSentPhone, state, phoneMatchesVerified]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validate phone format
  const isPhoneValid = (phoneNumber) => {
    if (!phoneNumber) return false;
    const normalized = phoneNumber.replace(/\s+/g, '');
    return normalized.startsWith('+') && normalized.length >= 10;
  };

  const handleSendCode = async () => {
    if (!phone || !isPhoneValid(phone)) {
      setError(t('phoneVerification.invalidPhone') || 'Please enter a valid phone number');
      return;
    }

    setState('sending');
    setError(null);

    try {
      const response = await fetch('/api/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setState('code');
      setLastSentPhone(phone);
      setCountdown(60);
      setCode('');
    } catch (err) {
      setState('error');
      setError(err.message);
    }
  };

  const handleVerifyCode = async (otpCode) => {
    if (!otpCode || otpCode.length < 6) return;

    setState('verifying');
    setError(null);

    try {
      const response = await fetch('/api/verify-phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          code: otpCode,
          cart_id: cartId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setState('verified');
      setCode('');
      onVerified?.(phone);
    } catch (err) {
      setState('error');
      setError(err.message);
      setCode('');
    }
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    setError(null);
    handleSendCode();
  };

  const handleChangePhone = () => {
    setState('input');
    setCode('');
    setError(null);
    setLastSentPhone('');
  };

  // Verified badge
  if (state === 'verified' || phoneMatchesVerified) {
    return (
      <div className="space-y-3">
        <PhoneInput
          value={phone}
          onChange={onPhoneChange}
          disabled={true}
        />
        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-green-800 font-medium text-sm" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                {t('phoneVerification.phoneVerified') || 'Phone Verified'}
              </p>
              <p className="text-green-600 text-xs" style={{ fontFamily: 'Crimson Text, serif' }}>
                {phone}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleChangePhone}
              className="text-green-600 text-xs font-medium hover:text-green-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-green-100"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('phoneVerification.change') || 'Change'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Phone Input - Always visible in input/sending state */}
      {(state === 'input' || state === 'sending' || state === 'error') && (
        <>
          <PhoneInput
            value={phone}
            onChange={onPhoneChange}
            disabled={disabled || state === 'sending'}
            hasError={!!error && state === 'error'}
          />

          {/* Error message */}
          {error && state === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>{error}</p>
            </div>
          )}

          {/* Send Code Button */}
          {!disabled && (
            <button
              type="button"
              onClick={handleSendCode}
              disabled={state === 'sending' || !phone || !isPhoneValid(phone)}
              className={`
                w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl
                font-medium text-sm transition-all duration-200
                ${state === 'sending' || !isPhoneValid(phone)
                  ? 'bg-baucis-green-100 text-baucis-green-400 cursor-not-allowed'
                  : 'bg-baucis-green-600 text-white hover:bg-baucis-green-700 shadow-lg shadow-baucis-green-600/20 hover:shadow-xl hover:shadow-baucis-green-600/30'
                }
              `}
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {state === 'sending' ? (
                <>
                  <SpinnerIcon className="w-5 h-5" />
                  <span>{t('phoneVerification.sending') || 'Sending...'}</span>
                </>
              ) : (
                <PhoneIcon className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Required notice */}
          {required && !phoneMatchesVerified && (
            <p className="text-xs text-amber-600 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('phoneVerification.required') || 'Phone verification is required to proceed'}
            </p>
          )}
        </>
      )}

      {/* OTP Entry State */}
      {(state === 'code' || state === 'verifying') && (
        <div className="bg-gradient-to-b from-baucis-pink-50 to-white rounded-3xl p-6 border border-baucis-green-100 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-baucis-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PhoneIcon className="w-7 h-7 text-baucis-green-600" />
            </div>
            <h3 className="text-lg text-baucis-green-800 font-medium mb-1" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {t('phoneVerification.enterCode') || 'Enter Verification Code'}
            </h3>
            <p className="text-sm text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('phoneVerification.codeSent') || 'Code sent to'} <strong>{phone}</strong>
            </p>
          </div>

          {/* OTP Boxes */}
          <div className="mb-6">
            <OTPInput
              length={6}
              value={code}
              onChange={setCode}
              onComplete={handleVerifyCode}
              disabled={state === 'verifying'}
              error={!!error}
            />
          </div>

          {/* Verifying indicator */}
          {state === 'verifying' && (
            <div className="flex items-center justify-center gap-2 text-baucis-green-600 mb-4">
              <SpinnerIcon className="w-5 h-5" />
              <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('phoneVerification.verifying') || 'Verifying...'}
              </span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 rounded-xl p-3 mb-4">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-baucis-green-100">
            <button
              type="button"
              onClick={handleChangePhone}
              disabled={state === 'verifying'}
              className="text-sm text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              ← {t('phoneVerification.changePhone') || 'Change number'}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={countdown > 0 || state === 'verifying'}
              className={`
                text-sm font-medium transition-colors
                ${countdown > 0 || state === 'verifying'
                  ? 'text-baucis-green-400 cursor-not-allowed'
                  : 'text-baucis-green-600 hover:text-baucis-green-800'
                }
              `}
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {countdown > 0 
                ? `${t('phoneVerification.resendIn') || 'Resend in'} ${countdown}s`
                : (t('phoneVerification.resend') || 'Resend Code')
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
