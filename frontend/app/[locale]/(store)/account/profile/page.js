'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import PhoneInput from '@/components/ui/PhoneInput';

// Icon components
const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const ShieldCheckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const XMarkIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// OTP Input Component for phone verification modal
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
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    
    const otpString = newOtp.join('');
    onChange?.(otpString);

    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

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
      
      const lastIndex = Math.min(pastedData.length, length) - 1;
      inputRefs.current[lastIndex]?.focus();

      if (pastedData.length === length) {
        onComplete?.(pastedData);
      }
    }
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
          onFocus={() => inputRefs.current[index]?.select()}
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

const EnvelopeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

// Deletion reasons
const DELETION_REASONS = [
  { id: 'not_using', label: 'I no longer use this service' },
  { id: 'found_alternative', label: 'I found a better alternative' },
  { id: 'too_expensive', label: 'Products are too expensive' },
  { id: 'poor_experience', label: 'Poor customer experience' },
  { id: 'privacy_concerns', label: 'Privacy concerns' },
  { id: 'too_many_emails', label: 'Too many promotional emails' },
  { id: 'technical_issues', label: 'Technical issues with the website' },
  { id: 'other', label: 'Other reason' },
];

export default function ProfilePage() {
  const t = useTranslations('account');
  const router = useRouter();
  const { signOut } = useClerk();
  const { customer, refreshCustomer, clerkUser } = useAuth();
  
  // Unified edit mode
  const [isEditing, setIsEditing] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    firstName: customer?.first_name || '',
    lastName: customer?.last_name || '',
    phone: customer?.phone || '',
  });
  
  // Original phone (to compare and revert on cancel)
  const [originalPhone, setOriginalPhone] = useState('');
  
  // Phone verification state - for verified badge display
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  
  // Phone OTP modal state
  const [showPhoneOTPModal, setShowPhoneOTPModal] = useState(false);
  const [phoneOTPCode, setPhoneOTPCode] = useState('');
  const [phoneOTPState, setPhoneOTPState] = useState('idle'); // 'idle' | 'sending' | 'verifying' | 'error'
  const [phoneOTPError, setPhoneOTPError] = useState(null);
  const [phoneOTPCountdown, setPhoneOTPCountdown] = useState(0);
  const [pendingPhoneChange, setPendingPhoneChange] = useState('');
  
  // Email editing state (separate due to verification flow)
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailAddressId, setEmailAddressId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailStep, setEmailStep] = useState(1); // 1 = enter email, 2 = enter code
  
  // Loading and status states
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Update local state when customer data changes
  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        phone: customer.phone || '',
      });
      setOriginalPhone(customer.phone || '');
      
      // Check if phone is verified in metadata
      const metadata = customer.metadata || {};
      if (metadata.phone_verified && metadata.verified_phone) {
        setPhoneVerified(true);
        setVerifiedPhone(metadata.verified_phone);
      }
    }
  }, [customer]);

  // Countdown timer for phone OTP resend
  useEffect(() => {
    if (phoneOTPCountdown > 0) {
      const timer = setTimeout(() => setPhoneOTPCountdown(phoneOTPCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneOTPCountdown]);

  // ============ Edit Mode Handlers ============
  const handleStartEditing = () => {
    setIsEditing(true);
    setNewEmail(''); // Reset email field
    setError(null);
  };

  const handleCancelEditing = () => {
    // Reset form data to original values
    setFormData({
      firstName: customer?.first_name || '',
      lastName: customer?.last_name || '',
      phone: originalPhone,
    });
    setNewEmail('');
    setIsEditing(false);
    setIsEditingEmail(false);
    setEmailStep(1);
    setError(null);
  };

  // ============ Phone OTP Modal Handlers ============
  const handleSendPhoneOTP = async (phoneToVerify) => {
    setPhoneOTPState('sending');
    setPhoneOTPError(null);
    setPhoneOTPCode('');

    try {
      const response = await fetch('/api/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneToVerify }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setPhoneOTPState('idle');
      setPhoneOTPCountdown(60);
    } catch (err) {
      setPhoneOTPState('error');
      setPhoneOTPError(err.message);
    }
  };

  const handleVerifyPhoneOTP = async (code) => {
    if (!code || code.length < 6) return;

    setPhoneOTPState('verifying');
    setPhoneOTPError(null);

    try {
      const response = await fetch('/api/verify-phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: pendingPhoneChange, 
          code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Phone verified - save it with verified metadata
      const existingMetadata = customer?.metadata || {};
      const phoneResponse = await fetch('/api/auth/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: pendingPhoneChange,
          metadata: {
            ...existingMetadata,
            phone_verified: true,
            verified_phone: pendingPhoneChange,
          },
        }),
      });

      if (!phoneResponse.ok) throw new Error('Failed to save phone');

      // Update states
      setPhoneVerified(true);
      setVerifiedPhone(pendingPhoneChange);
      setOriginalPhone(pendingPhoneChange);
      setFormData(prev => ({ ...prev, phone: pendingPhoneChange }));
      
      // Close modal and show success
      setShowPhoneOTPModal(false);
      setPhoneOTPCode('');
      setPhoneOTPState('idle');
      setPendingPhoneChange('');
      
      await refreshCustomer();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setPhoneOTPState('error');
      setPhoneOTPError(err.message);
      setPhoneOTPCode('');
    }
  };

  const handleCancelPhoneOTP = () => {
    // Revert phone to original
    setFormData(prev => ({ ...prev, phone: originalPhone }));
    setShowPhoneOTPModal(false);
    setPhoneOTPCode('');
    setPhoneOTPState('idle');
    setPhoneOTPError(null);
    setPendingPhoneChange('');
  };

  const handleResendPhoneOTP = () => {
    if (phoneOTPCountdown > 0) return;
    handleSendPhoneOTP(pendingPhoneChange);
  };

  // Validate phone format
  const isPhoneValid = (phoneNumber) => {
    if (!phoneNumber) return true; // Empty is valid (optional)
    const normalized = phoneNumber.replace(/\s+/g, '');
    return normalized.startsWith('+') && normalized.length >= 10;
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Check if email changed - trigger verification flow
      if (newEmail && newEmail !== customer?.email) {
        // Start email verification
        const response = await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: newEmail }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send verification code');
        }

        setEmailAddressId(data.emailAddressId);
        setIsEditingEmail(true);
        setEmailStep(2);
        setLoading(false);
        return; // Exit - verification flow will handle the rest
      }

      // Check if phone changed and is valid - trigger OTP verification
      const phoneChanged = formData.phone !== originalPhone;
      const newPhoneHasValue = formData.phone && formData.phone.trim() !== '';
      
      if (phoneChanged && newPhoneHasValue) {
        // Validate phone format first
        if (!isPhoneValid(formData.phone)) {
          setError('Please enter a valid phone number');
          setLoading(false);
          return;
        }

        // Store pending phone change and open OTP modal
        setPendingPhoneChange(formData.phone);
        setShowPhoneOTPModal(true);
        setLoading(false);
        
        // Send OTP code
        await handleSendPhoneOTP(formData.phone);
        return;
      }

      // Update name via Clerk
      const nameResponse = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });

      if (!nameResponse.ok) {
        const data = await nameResponse.json();
        throw new Error(data.error || 'Failed to update name');
      }

      // If phone was cleared, update it via Medusa
      if (phoneChanged && !newPhoneHasValue) {
        const phoneResponse = await fetch('/api/auth/sync', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '' }),
        });

        if (!phoneResponse.ok) throw new Error('Failed to update phone');
        setPhoneVerified(false);
        setVerifiedPhone('');
        setOriginalPhone('');
      }

      await refreshCustomer();
      setIsEditing(false);
      setNewEmail('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ Email Handlers ============
  const handleStartEmailChange = () => {
    setIsEditingEmail(true);
    setEmailStep(1);
    setNewEmail('');
    setVerificationCode('');
    setEmailAddressId(null);
    setError(null);
  };

  const handleSendVerificationCode = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      setError(t('enterValidEmail') || 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setEmailAddressId(data.emailAddressId);
      setEmailStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError(t('enterValidCode') || 'Please enter a valid verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddressId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      await refreshCustomer();
      setIsEditingEmail(false);
      setEmailStep(1);
      setNewEmail('');
      setVerificationCode('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmailEdit = () => {
    setIsEditingEmail(false);
    setEmailStep(1);
    setNewEmail('');
    setVerificationCode('');
    setEmailAddressId(null);
    setError(null);
  };

  // ============ Delete Account Handlers ============
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError(t('typeDeleteToConfirm'));
      return;
    }

    if (!deleteReason) {
      setDeleteError(t('selectReason'));
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: deleteReason,
          reasonLabel: DELETION_REASONS.find(r => r.id === deleteReason)?.label || deleteReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      await signOut();
      router.push('/');
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep(1);
    setDeleteReason('');
    setDeleteConfirmation('');
    setDeleteError(null);
  };

  const labelClass = "block text-sm text-baucis-green-700 mb-2";
  const inputClass = "w-full px-4 py-3 border border-baucis-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-baucis-green-800";
  const disabledInputClass = "w-full px-4 py-3 border border-baucis-green-200 rounded-xl bg-baucis-green-50 text-baucis-green-600 cursor-not-allowed";

  return (
    <div className="space-y-6">
      {/* Profile Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <UserIcon className="w-5 h-5 text-baucis-green-600" />
          <h2 className="text-xl text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('profile')}
          </h2>
        </div>

        {/* Avatar */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-baucis-green-600 rounded-full flex items-center justify-center text-white text-2xl font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {customer?.first_name?.charAt(0)?.toUpperCase() || customer?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-lg text-baucis-green-800 font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {customer?.first_name} {customer?.last_name}
            </p>
            <p className="text-baucis-green-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('memberSince')} {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">{error}</div>
        )}
        {success && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-baucis-green-50 to-emerald-50 border border-baucis-green-200 px-4 py-3 rounded-xl text-sm mb-4">
            <div className="w-8 h-8 bg-baucis-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-baucis-green-600" />
            </div>
            <p className="text-baucis-green-700 font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {t('profileUpdated') || 'Profile updated successfully'}
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('email')}</label>
            {isEditingEmail ? (
              // Email verification flow
              <div className="space-y-3">
                {emailStep === 1 && (
                  <>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t('enterNewEmail') || 'Enter new email address'}
                      className={inputClass}
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    />
                    <p className="text-xs text-baucis-green-500" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('emailVerificationRequired') || 'A verification code will be sent to confirm your new email'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSendVerificationCode}
                        disabled={loading || !newEmail}
                        className="px-4 py-2 text-xs bg-baucis-green-600 text-white rounded-lg hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {loading ? '...' : t('sendCode') || 'Send Code'}
                      </button>
                      <button
                        onClick={handleCancelEmailEdit}
                        disabled={loading}
                        className="px-4 py-2 text-xs border border-baucis-green-300 text-baucis-green-600 rounded-lg hover:bg-baucis-green-50 transition-colors"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </>
                )}
                {emailStep === 2 && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                        <p className="text-blue-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {t('codeSent') || 'Verification code sent to'} <strong>{newEmail}</strong>
                        </p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={t('verificationCode') || 'Enter 6-digit code'}
                      className={`${inputClass} text-center tracking-widest font-mono`}
                      style={{ fontFamily: 'monospace' }}
                      maxLength={6}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleVerifyEmail}
                        disabled={loading || verificationCode.length < 6}
                        className="px-4 py-2 text-xs bg-baucis-green-600 text-white rounded-lg hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {loading ? '...' : t('verifyEmail') || 'Verify Email'}
                      </button>
                      <button
                        onClick={() => setEmailStep(1)}
                        disabled={loading}
                        className="px-4 py-2 text-xs border border-baucis-green-300 text-baucis-green-600 rounded-lg hover:bg-baucis-green-50 transition-colors"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {t('back')}
                      </button>
                      <button
                        onClick={handleCancelEmailEdit}
                        disabled={loading}
                        className="px-4 py-2 text-xs text-red-500 hover:text-red-700 transition-colors"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Normal email display - editable when in edit mode
              <div>
                <input
                  type="email"
                  value={isEditing ? (newEmail || customer?.email || '') : (customer?.email || '')}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                  }}
                  disabled={!isEditing}
                  className={isEditing ? inputClass : disabledInputClass}
                  style={{ fontFamily: 'Crimson Text, serif' }}
                />
                {isEditing && newEmail && newEmail !== customer?.email && (
                  <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('emailVerificationNote') || 'Email change requires verification'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('firstName')}</label>
              <input
                type="text"
                value={isEditing ? formData.firstName : (customer?.first_name || '')}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditing}
                className={isEditing ? inputClass : disabledInputClass}
                style={{ fontFamily: 'Crimson Text, serif' }}
              />
            </div>
            <div>
              <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('lastName')}</label>
              <input
                type="text"
                value={isEditing ? formData.lastName : (customer?.last_name || '')}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditing}
                className={isEditing ? inputClass : disabledInputClass}
                style={{ fontFamily: 'Crimson Text, serif' }}
              />
            </div>
          </div>

          {/* Phone - Respects Edit Profile mode */}
          <div>
            <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('phone')}</label>
            <PhoneInput
              value={formData.phone || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              disabled={!isEditing}
              hasError={!!error && error.includes('phone')}
            />
            {/* Verified badge - show when phone is verified and matches current */}
            {phoneVerified && verifiedPhone && formData.phone === verifiedPhone && (
              <div className="flex items-center gap-2 mt-2 bg-gradient-to-r from-baucis-green-50 to-emerald-50 border border-baucis-green-200 rounded-xl p-3">
                <div className="w-8 h-8 bg-baucis-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5 text-baucis-green-600" />
                </div>
                <p className="text-baucis-green-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                  Phone number verified
                </p>
              </div>
            )}
          </div>

          {/* Single Edit/Save Button */}
          <div className="pt-2">
            {!isEditing ? (
              <button
                onClick={handleStartEditing}
                className="w-full sm:w-auto px-6 py-2.5 text-sm border border-baucis-green-300 text-baucis-green-600 rounded-full hover:bg-baucis-green-50 transition-colors flex items-center justify-center space-x-2"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                <PencilIcon className="w-4 h-4" />
                <span>{t('editProfile') || 'Edit Profile'}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm bg-baucis-green-600 text-white rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span>{t('saveChanges') || 'Save Changes'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelEditing}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-sm border border-baucis-green-300 text-baucis-green-600 rounded-full hover:bg-baucis-green-50 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ShieldCheckIcon className="w-5 h-5 text-baucis-green-600" />
          <h3 className="text-lg text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('accountSecurity')}</h3>
        </div>
        
        <p className="text-baucis-green-600 text-sm mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>{t('securityManaged')}</p>

        <div className="flex items-center space-x-3 p-4 bg-baucis-green-50 rounded-xl">
          <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-baucis-green-600" />
          </div>
          <div>
            <p className="text-baucis-green-800 text-sm font-medium" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('connectedWith')}</p>
            <p className="text-baucis-green-600 text-xs" style={{ fontFamily: 'Crimson Text, serif' }}>{clerkUser?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Delete Account Button */}
      <div className="flex justify-center pt-4">
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="text-sm px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('deleteAccount')}
        </button>
      </div>

      {/* Phone OTP Verification Modal */}
      {showPhoneOTPModal && (
        <div className="fixed inset-0 bg-baucis-green-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-white to-baucis-pink-50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 px-6 py-5 border-b border-baucis-green-100">
              <button 
                onClick={handleCancelPhoneOTP} 
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-baucis-green-400 hover:bg-white/50 hover:text-baucis-green-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-baucis-green-100 rounded-2xl flex items-center justify-center">
                  <PhoneIcon className="w-6 h-6 text-baucis-green-600" />
                </div>
                <div>
                  <h3 className="text-lg text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                    Verify Phone Number
                  </h3>
                  <p className="text-baucis-green-500 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                    Code sent to <strong>{pendingPhoneChange}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* OTP Input */}
              <div className="mb-6">
                <OTPInput
                  length={6}
                  value={phoneOTPCode}
                  onChange={setPhoneOTPCode}
                  onComplete={handleVerifyPhoneOTP}
                  disabled={phoneOTPState === 'verifying' || phoneOTPState === 'sending'}
                  error={!!phoneOTPError}
                />
              </div>

              {/* Loading state */}
              {phoneOTPState === 'sending' && (
                <div className="flex items-center justify-center gap-2 text-baucis-green-600 mb-4">
                  <SpinnerIcon className="w-5 h-5" />
                  <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                    Sending code...
                  </span>
                </div>
              )}

              {phoneOTPState === 'verifying' && (
                <div className="flex items-center justify-center gap-2 text-baucis-green-600 mb-4">
                  <SpinnerIcon className="w-5 h-5" />
                  <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                    Verifying...
                  </span>
                </div>
              )}

              {/* Error message with resend option */}
              {phoneOTPError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>{phoneOTPError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResendPhoneOTP}
                    disabled={phoneOTPCountdown > 0}
                    className={`text-sm font-medium transition-colors ${
                      phoneOTPCountdown > 0
                        ? 'text-red-300 cursor-not-allowed'
                        : 'text-red-600 hover:text-red-800 underline'
                    }`}
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {phoneOTPCountdown > 0 
                      ? `Resend in ${phoneOTPCountdown}s`
                      : 'Resend Code'
                    }
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-baucis-green-100">
                <button
                  type="button"
                  onClick={handleCancelPhoneOTP}
                  disabled={phoneOTPState === 'verifying'}
                  className="px-4 py-2 text-sm text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {t('cancel')}
                </button>

                {!phoneOTPError && (
                  <button
                    type="button"
                    onClick={handleResendPhoneOTP}
                    disabled={phoneOTPCountdown > 0 || phoneOTPState === 'verifying' || phoneOTPState === 'sending'}
                    className={`text-sm font-medium transition-colors ${
                      phoneOTPCountdown > 0 || phoneOTPState === 'verifying' || phoneOTPState === 'sending'
                        ? 'text-baucis-green-400 cursor-not-allowed'
                        : 'text-baucis-green-600 hover:text-baucis-green-800'
                    }`}
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {phoneOTPCountdown > 0 
                      ? `Resend in ${phoneOTPCountdown}s`
                      : 'Resend Code'
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-baucis-green-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-white to-baucis-pink-50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-red-50 to-red-100 px-6 py-5 border-b border-red-100">
              <button onClick={resetDeleteModal} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-baucis-green-400 hover:bg-white/50 hover:text-baucis-green-600 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl text-red-700" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('deleteAccount')}</h3>
              <p className="text-red-500/80 text-sm mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>{t('deleteAccountWarning')}</p>
            </div>

            <div className="p-6">
              {deleteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4" style={{ fontFamily: 'Crimson Text, serif' }}>{deleteError}</div>
              )}

              {deleteStep === 1 && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm text-baucis-green-700 mb-3" style={{ fontFamily: 'Crimson Text, serif' }}>{t('whyLeaving')}</label>
                    <div className="relative">
                      <select value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} className="w-full px-4 py-3.5 border border-baucis-green-200 rounded-xl bg-white text-baucis-green-800 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all" style={{ fontFamily: 'Crimson Text, serif' }}>
                        <option value="" className="text-baucis-green-400">{t('selectReason')}</option>
                        {DELETION_REASONS.map((reason) => (<option key={reason.id} value={reason.id}>{reason.label}</option>))}
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-baucis-green-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button onClick={resetDeleteModal} className="flex-1 px-4 py-3 border border-baucis-green-200 text-baucis-green-700 rounded-full hover:bg-baucis-green-50 transition-colors" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('cancel')}</button>
                    <button onClick={() => { if (!deleteReason) { setDeleteError(t('selectReason')); return; } setDeleteError(null); setDeleteStep(2); }} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('continue')}</button>
                  </div>
                </>
              )}

              {deleteStep === 2 && (
                <>
                  <div className="mb-5 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-red-700 text-sm font-medium mb-2" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('deleteConfirmationWarning')}</p>
                    <ul className="text-red-600/80 text-sm space-y-1.5" style={{ fontFamily: 'Crimson Text, serif' }}>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>{t('deleteWarning1')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>{t('deleteWarning2')}</li>
                      <li className="flex items-start"><span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>{t('deleteWarning3')}</li>
                    </ul>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm text-baucis-green-700 mb-2" style={{ fontFamily: 'Crimson Text, serif' }}>{t('typeDeleteToConfirm')}</label>
                    <input type="text" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())} placeholder="DELETE" className="w-full px-4 py-3 border border-baucis-green-200 rounded-xl bg-white text-baucis-green-800 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition-all" />
                  </div>

                  <div className="flex space-x-3">
                    <button onClick={() => { setDeleteStep(1); setDeleteConfirmation(''); setDeleteError(null); }} className="flex-1 px-4 py-3 border border-baucis-green-200 text-baucis-green-700 rounded-full hover:bg-baucis-green-50 transition-colors" style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('back')}</button>
                    <button onClick={handleDeleteAccount} disabled={deleteConfirmation !== 'DELETE' || deleteLoading} className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                      {deleteLoading ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />) : (<><TrashIcon className="w-4 h-4" /><span>{t('deleteAccountPermanently')}</span></>)}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

