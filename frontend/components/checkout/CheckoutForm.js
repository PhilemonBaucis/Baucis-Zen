'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PhoneInput from '@/components/ui/PhoneInput';
import PokGuestCheckout from '@/components/checkout/PokGuestCheckout';

// Dynamic import for AddressMap (no SSR due to WebGL)
const AddressMap = dynamic(() => import('@/components/ui/AddressMap'), {
  ssr: false,
  loading: () => <div className="h-[250px] bg-baucis-green-50 rounded-2xl animate-pulse" />
});

const MAX_ADDRESSES = 4;

// Icons
const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const WarningIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

const XMarkIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const CreditCardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

// OTP Input Component for phone verification
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

export default function CheckoutForm({
  initialData,
  onSubmit,
  onSaveAddress,
  onEditAddress,
  onAddressChange,
  loading,
  savingAddress = false,
  isLoggedIn = false,
  potentialPoints = 0,
  savedAddresses = [],
  addressesLoading = false,
  billingSameAsShipping = true,
  onBillingSameChange,
  shippingReady = false,
  phoneVerified = false,
  verifiedPhone = '',
  onPhoneVerified,
  cartId = null,
  onProceedToPayment,
  countryCode = 'al',
  onSelectPaymentMethod,
  selectedPaymentMethod = null,
  totalAmount = 0,
  currency = 'EUR',
  // POK inline payment props (for PokGuestCheckout)
  onPokPaymentSuccess,
  onPokPaymentError,
  customerEmail = '',
  shippingAmount = 0,
  discountAmount = 0,
}) {
  const t = useTranslations('checkout');
  const tAuth = useTranslations('auth');
  const tAccount = useTranslations('account');
  
  // Section refs for scrolling
  const addressSectionRef = useRef(null);
  const paymentSectionRef = useRef(null);
  
  // Section confirmation states
  const [contactConfirmed, setContactConfirmed] = useState(false);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [addressError, setAddressError] = useState(null);

  // Supported shipping countries
  const SUPPORTED_COUNTRIES = ['al', 'xk', 'mk'];

  // Address selection mode - default to 'new' for guests
  const [addressMode, setAddressMode] = useState(isLoggedIn ? 'saved' : 'new');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [editingAddressId, setEditingAddressId] = useState(null);
  
  // Set address mode to 'new' for guests or when no saved addresses
  useEffect(() => {
    if (!isLoggedIn || savedAddresses.length === 0) {
      setAddressMode('new');
    }
  }, [isLoggedIn, savedAddresses.length]);
  
  // Form data for shipping - city and postalCode are auto-filled from map
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    phone: initialData?.phone || '',
    addressName: '',
    address1: initialData?.address1 || '',
    address2: initialData?.address2 || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    countryCode: initialData?.countryCode || 'gb', // Default to UK (London)
    coordinates: null, // { lat, lng } for map pin
  });

  // Billing address form data
  const [billingData, setBillingData] = useState({
    firstName: '',
    lastName: '',
    address1: '',
    address2: '',
    city: '',
    postalCode: '',
    countryCode: 'al', // Default to Albania
    coordinates: null, // { lat, lng } for map pin
  });

  // Check if max addresses reached
  const maxAddressesReached = savedAddresses.length >= MAX_ADDRESSES;

  // Save to account checkboxes (for logged-in users)
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [savePhoneToAccount, setSavePhoneToAccount] = useState(true);

  // Phone OTP verification state
  const [showPhoneOTPModal, setShowPhoneOTPModal] = useState(false);
  const [phoneOTPCode, setPhoneOTPCode] = useState('');
  const [phoneOTPState, setPhoneOTPState] = useState('idle');
  const [phoneOTPError, setPhoneOTPError] = useState(null);
  const [phoneOTPCountdown, setPhoneOTPCountdown] = useState(0);
  
  // Pending action after OTP verification
  const [pendingOTPAction, setPendingOTPAction] = useState(null);

  // Countdown timer for phone OTP resend
  useEffect(() => {
    if (phoneOTPCountdown > 0) {
      const timer = setTimeout(() => setPhoneOTPCountdown(phoneOTPCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneOTPCountdown]);

  // Validate phone format
  const isPhoneValid = (phoneNumber) => {
    if (!phoneNumber) return false;
    const normalized = phoneNumber.replace(/\s+/g, '');
    return normalized.startsWith('+') && normalized.length >= 10;
  };

  // Check if phone is already verified (logged in user with matching verified phone)
  const isPhoneAlreadyVerified = phoneVerified && verifiedPhone === formData.phone;

  // Phone OTP handlers
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
          phone: formData.phone, 
          code: code,
          cart_id: cartId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Phone verified successfully
      setShowPhoneOTPModal(false);
      setPhoneOTPCode('');
      setPhoneOTPState('idle');
      
      // Pass savePhoneToAccount flag to parent (for logged-in users)
      onPhoneVerified?.(formData.phone, savePhoneToAccount);
      
      // Execute pending action after verification
      if (pendingOTPAction === 'confirmContact') {
        completeContactConfirmation();
      }
      setPendingOTPAction(null);
      
    } catch (err) {
      setPhoneOTPState('error');
      setPhoneOTPError(err.message);
      setPhoneOTPCode('');
    }
  };

  const handleCancelPhoneOTP = () => {
    setShowPhoneOTPModal(false);
    setPhoneOTPCode('');
    setPhoneOTPState('idle');
    setPhoneOTPError(null);
    setPendingOTPAction(null);
  };

  const handleResendPhoneOTP = () => {
    if (phoneOTPCountdown > 0) return;
    handleSendPhoneOTP(formData.phone);
  };

  // Auto-select default address when addresses load
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = savedAddresses.find(a => a.is_default_shipping) || savedAddresses[0];
      setSelectedAddressId(defaultAddr.id);
      setAddressMode('saved');
      // Update formData.coordinates from default address's metadata
      if (defaultAddr?.metadata?.coordinates) {
        setFormData(prev => ({
          ...prev,
          coordinates: defaultAddr.metadata.coordinates,
        }));
      }
    } else if (savedAddresses.length === 0 && isLoggedIn) {
      setAddressMode('new');
    }
  }, [savedAddresses]);

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => {
        const updates = {};
        if (initialData.email && initialData.email !== prev.email) updates.email = initialData.email;
        if (initialData.phone && initialData.phone !== prev.phone) updates.phone = initialData.phone;
        if (initialData.firstName && initialData.firstName !== prev.firstName) updates.firstName = initialData.firstName;
        if (initialData.lastName && initialData.lastName !== prev.lastName) updates.lastName = initialData.lastName;
        if (Object.keys(updates).length > 0) return { ...prev, ...updates };
        return prev;
      });
    }
  }, [initialData?.email, initialData?.phone, initialData?.firstName, initialData?.lastName]);

  // Auto-confirm contact if logged in with verified phone
  useEffect(() => {
    if (isLoggedIn && formData.email && isPhoneAlreadyVerified && !contactConfirmed) {
      setContactConfirmed(true);
      // Scroll to address section
      setTimeout(() => {
        addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [isLoggedIn, formData.email, isPhoneAlreadyVerified]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Reset confirmations if contact info changes
    if (['email', 'phone'].includes(name)) {
      setContactConfirmed(false);
      setAddressConfirmed(false);
    }
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));
    // Reset confirmations if phone changes
    if (value !== verifiedPhone) {
      setContactConfirmed(false);
      setAddressConfirmed(false);
    }
  };

  // Complete contact confirmation (called after OTP or if already verified)
  const completeContactConfirmation = () => {
    setContactConfirmed(true);
    // Scroll to address section
    setTimeout(() => {
      addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  // Handle confirm contact button
  const handleConfirmContact = async () => {
    if (!formData.email || !formData.phone || !isPhoneValid(formData.phone)) {
      return;
    }

    // If phone already verified with same number, just confirm
    if (isPhoneAlreadyVerified) {
      completeContactConfirmation();
      return;
    }

    // Need to verify phone - show OTP modal
    setPendingOTPAction('confirmContact');
    setShowPhoneOTPModal(true);
    await handleSendPhoneOTP(formData.phone);
  };

  // Handle edit contact (unlock section)
  const handleEditContact = () => {
    setContactConfirmed(false);
    setAddressConfirmed(false);
  };

  const handleSelectAddress = (addressId) => {
    setSelectedAddressId(addressId);
    setAddressMode('saved');
    // Update formData.coordinates from selected address's metadata
    const selectedAddr = savedAddresses.find(a => a.id === addressId);
    if (selectedAddr?.metadata?.coordinates) {
      setFormData(prev => ({
        ...prev,
        coordinates: selectedAddr.metadata.coordinates,
      }));
    }
  };

  // Handle starting edit of a saved address
  const handleStartEditAddress = (e, address) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Populate form with address data
    setFormData(prev => ({
      ...prev,
      addressName: address.address_name || '',
      firstName: address.first_name || '',
      lastName: address.last_name || '',
      address1: address.address_1 || '',
      address2: address.address_2 || '',
      city: address.city || '',
      postalCode: address.postal_code || '',
      countryCode: address.country_code || 'al',
      coordinates: address.metadata?.coordinates || null,
    }));
    
    // Set editing state and switch to new address mode to show form
    setEditingAddressId(address.id);
    setAddressMode('new');
    setSelectedAddressId(null);
  };

  // Handle saving the edited address
  const handleSaveEditedAddress = async () => {
    if (!editingAddressId || !onEditAddress) return;
    
    const editData = {
      id: editingAddressId,
      address_name: formData.addressName || `${formData.city} Address`,
      first_name: formData.firstName,
      last_name: formData.lastName,
      address_1: formData.address1,
      address_2: formData.address2 || '',
      city: formData.city,
      postal_code: formData.postalCode || '',
      country_code: formData.countryCode || '',
      phone: formData.phone,
      metadata: formData.coordinates ? {
        coordinates: formData.coordinates
      } : undefined,
    };
    
    try {
      await onEditAddress(editData);
      // Reset editing state after successful save
      setEditingAddressId(null);
      // Select the edited address
      setSelectedAddressId(editingAddressId);
      setAddressMode('saved');
    } catch (err) {
      console.error('Failed to update address:', err);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingAddressId(null);
    // Reset form
    setFormData(prev => ({
      ...prev,
      addressName: '',
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      address1: '',
      address2: '',
      city: '',
      postalCode: '',
      countryCode: 'al',
      coordinates: null,
    }));
    // Switch back to saved mode if there are saved addresses
    if (savedAddresses.length > 0) {
      setAddressMode('saved');
      // Select the first address by default
      setSelectedAddressId(savedAddresses[0]?.id);
    }
  };

  // Handle confirm address button - also saves to account if checkbox checked
  const handleConfirmAddress = async () => {
    let addressData = formData;
    
    // If using saved address, populate from selected address
    if (addressMode === 'saved' && selectedAddressId) {
      const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        addressData = {
          ...formData,
          firstName: selectedAddr.first_name,
          lastName: selectedAddr.last_name,
          address1: selectedAddr.address_1,
          address2: selectedAddr.address_2 || '',
          city: selectedAddr.city,
          postalCode: selectedAddr.postal_code || '',
          countryCode: selectedAddr.country_code || 'al',
          coordinates: selectedAddr.metadata?.coordinates || formData.coordinates || null,
        };
      }
    }

    // Validate shipping address - require coordinates and city from map selection
    if (!addressData.firstName || !addressData.lastName || !addressData.city || !addressData.coordinates) {
      setAddressError(t('locationRequired') || 'Please search for your address or click on the map to set your location');
      return;
    }

    // Validate that shipping country is supported
    if (!SUPPORTED_COUNTRIES.includes(addressData.countryCode)) {
      setAddressError(t('shippingRestriction') || 'We currently ship to:');
      return;
    }

    // Validate billing address if different from shipping
    if (!billingSameAsShipping && (!billingData.firstName || !billingData.lastName || !billingData.city || !billingData.coordinates)) {
      return;
    }

    // Validate that billing country is supported (if different from shipping)
    if (!billingSameAsShipping && !SUPPORTED_COUNTRIES.includes(billingData.countryCode)) {
      setAddressError(t('invoiceRestriction') || 'We currently invoice to:');
      return;
    }

    // Clear any previous error
    setAddressError(null);

    // If logged in, using new address, checkbox checked, and not at max - save to account
    if (isLoggedIn && addressMode === 'new' && saveAddressToAccount && !maxAddressesReached) {
      const saveData = {
        address_name: formData.addressName || `${formData.city} Address`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        address_1: formData.address1,
        address_2: formData.address2 || '',
        city: formData.city,
        postal_code: formData.postalCode || '',
        country_code: formData.countryCode || '',
        phone: formData.phone,
        metadata: formData.coordinates ? {
          coordinates: formData.coordinates
        } : undefined,
      };
      
      // Save address in background (don't block checkout)
      onSaveAddress(saveData).catch(err => {
        console.error('Failed to save address to account:', err);
      });
    }

    // Call parent to set shipping address and calculate shipping
    await onSubmit(addressData, billingSameAsShipping ? null : billingData);
    
    setAddressConfirmed(true);
    
    // Scroll to payment section
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  // Handle edit address (unlock section)
  const handleEditAddress = () => {
    setAddressConfirmed(false);
  };

  const showValidation = true;
  const inputClass = "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all text-baucis-green-800";
  const labelClass = "block text-sm text-baucis-green-700 mb-2";
  
  const getInputClass = (fieldValue, isRequired = true) => {
    if (!showValidation || !isRequired) {
      return `${inputClass} border-baucis-green-200 focus:ring-baucis-green-400`;
    }
    if (!fieldValue || fieldValue.trim() === '') {
      return `${inputClass} border-2 border-red-400 bg-red-50/50 focus:ring-red-400`;
    }
    return `${inputClass} border-baucis-green-200 focus:ring-baucis-green-400`;
  };

  const getLabelClass = (fieldValue, isRequired = true) => {
    if (showValidation && isRequired && (!fieldValue || fieldValue.trim() === '')) {
      return "block text-sm text-red-500 font-medium mb-2";
    }
    return labelClass;
  };

  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
  // Address is valid if we have name, city (from map), and coordinates
  const isNewAddressValid = formData.firstName && formData.lastName && formData.city && formData.coordinates;
  const isContactValid = formData.email && formData.phone && isPhoneValid(formData.phone);
  const isBillingValid = billingSameAsShipping || (billingData.firstName && billingData.lastName && billingData.city && billingData.coordinates);
  const isAddressValid = ((addressMode === 'saved' && selectedAddressId) || (addressMode === 'new' && isNewAddressValid)) && isBillingValid;

  return (
    <div className="space-y-6">
      {/* ============ SECTION 1: CONTACT INFORMATION ============ */}
      <div className={`bg-white rounded-2xl border-2 transition-all ${contactConfirmed ? 'border-baucis-green-300 bg-baucis-green-50/30' : 'border-baucis-green-200'}`}>
        {/* Section Header */}
        <div className={`flex items-center justify-between p-5 ${contactConfirmed ? '' : 'border-b border-baucis-green-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${contactConfirmed ? 'bg-baucis-green-500' : 'bg-baucis-green-100'}`}>
              {contactConfirmed ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <UserIcon className="w-5 h-5 text-baucis-green-600" />
              )}
            </div>
            <div className={contactConfirmed ? 'min-h-[76px] flex flex-col justify-center' : ''}>
              <h2 className="text-lg text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Contact Information
              </h2>
              {contactConfirmed && (
                <div className="text-sm text-baucis-green-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  <p>{formData.email}</p>
                  <p>{formData.phone}</p>
                </div>
              )}
            </div>
          </div>
          {contactConfirmed && (
            <button
              type="button"
              onClick={handleEditContact}
              className="text-sm text-baucis-green-600 hover:text-baucis-green-800 underline flex-shrink-0"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              Edit
            </button>
          )}
        </div>

        {/* Section Content */}
        {!contactConfirmed && (
          <div className="p-5 space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className={getLabelClass(formData.email)} style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('invoiceEmail') || 'Invoice Email'} *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className={getInputClass(formData.email)}
                style={{ fontFamily: 'Crimson Text, serif' }}
              />
              {showValidation && !formData.email && (
                <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('requiredField') || 'This field is required'}
                </p>
              )}
            </div>
            
            {/* Phone */}
            <div>
              <label htmlFor="phone" className={getLabelClass(formData.phone)} style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('phone') || 'Phone Number'} *
              </label>
              <PhoneInput
                value={formData.phone}
                onChange={handlePhoneChange}
                disabled={false}
                hasError={showValidation && (!formData.phone || !isPhoneValid(formData.phone))}
              />
              {showValidation && !formData.phone && (
                <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('requiredField') || 'This field is required'}
                </p>
              )}
              {/* Verified badge */}
              {isPhoneAlreadyVerified && (
                <div className="flex items-center gap-2 mt-2 bg-gradient-to-r from-baucis-green-50 to-emerald-50 border border-baucis-green-200 rounded-xl p-3">
                  <div className="w-6 h-6 bg-baucis-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-4 h-4 text-baucis-green-600" />
                  </div>
                  <p className="text-baucis-green-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                    Phone number verified
                  </p>
                </div>
              )}
              
              {/* Save Phone to Account Checkbox - show for logged in users with different phone */}
              {isLoggedIn && formData.phone && isPhoneValid(formData.phone) && formData.phone !== initialData?.phone && (
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-baucis-green-50/50 rounded-xl cursor-pointer hover:bg-baucis-green-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={savePhoneToAccount}
                      onChange={(e) => setSavePhoneToAccount(e.target.checked)}
                      className="w-4 h-4 text-baucis-green-600 rounded border-baucis-green-300 focus:ring-baucis-green-500"
                    />
                    <span className="text-sm text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('savePhoneToAccount') || 'Save this phone number to my account'}
                    </span>
                  </label>
                  {/* Warning if phone will overwrite existing */}
                  {savePhoneToAccount && initialData?.phone && initialData.phone !== formData.phone && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      <p className="text-xs text-amber-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                        {t('phoneWillOverwrite') || 'This will replace your current account phone number.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Important Contact Info Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-xs text-amber-800 leading-relaxed" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('contactInfoImportant') || 'Please ensure your email and phone number are correct. Our courier will use these details to coordinate delivery and provide order updates.'}
                </p>
              </div>
            </div>

            {/* Guest Account Creation Prompt */}
            {!isLoggedIn && (
              <div className="bg-baucis-green-50 border border-baucis-green-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-baucis-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-baucis-green-800 font-medium text-sm mb-1" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                      {potentialPoints > 0 ? `Earn ${potentialPoints} Zen Points!` : 'Earn Zen Points!'}
                    </p>
                    <p className="text-baucis-green-600 text-xs mb-3" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('createAccountToEarn') || 'Create an account to earn points on this order and unlock discounts on future purchases.'}
                    </p>
                    <SignInButton 
                      mode="modal"
                      forceRedirectUrl="/checkout"
                      fallbackRedirectUrl="/checkout"
                    >
                      <button
                        type="button"
                        className="inline-flex items-center space-x-2 bg-baucis-green-600 text-white text-xs px-4 py-2 rounded-full hover:bg-baucis-green-700 transition-colors"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{(t('signInOrCreate') || 'Sign in / Create account').toUpperCase()}</span>
                      </button>
                    </SignInButton>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Contact Button */}
            <button
              type="button"
              onClick={handleConfirmContact}
              disabled={!isContactValid}
              className="w-full bg-baucis-green-600 text-white py-2.5 px-5 rounded-lg hover:bg-baucis-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              <span>Confirm Information</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ============ SECTION 2: SHIPPING ADDRESS ============ */}
      <div 
        ref={addressSectionRef}
        className={`bg-white rounded-2xl border-2 transition-all ${
          addressConfirmed 
            ? 'border-baucis-green-300 bg-baucis-green-50/30' 
            : contactConfirmed 
              ? 'border-baucis-green-200' 
              : 'border-gray-200 opacity-60'
        }`}
      >
        {/* Section Header */}
        <div className={`flex items-center justify-between p-5 ${addressConfirmed ? '' : (contactConfirmed && !addressConfirmed ? 'border-b border-baucis-green-100' : '')}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              addressConfirmed 
                ? 'bg-baucis-green-500' 
                : contactConfirmed 
                  ? 'bg-baucis-green-100' 
                  : 'bg-gray-100'
            }`}>
              {addressConfirmed ? (
                <CheckCircleIcon className="w-6 h-6 text-white" />
              ) : (
                <MapPinIcon className={`w-5 h-5 ${contactConfirmed ? 'text-baucis-green-600' : 'text-gray-400'}`} />
              )}
            </div>
            {addressConfirmed ? (
              <div className="flex gap-8 min-h-[76px]">
                {/* Shipping Address */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-lg text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                    {t('shippingAddress') || 'Shipping Address'}
                  </h2>
                  <div className="text-sm text-baucis-green-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                    {addressMode === 'saved' && selectedAddress ? (
                      <>
                        <p>{selectedAddress.first_name} {selectedAddress.last_name}</p>
                        <p>{selectedAddress.address_1}{selectedAddress.address_2 && `, ${selectedAddress.address_2}`}</p>
                        <p>{selectedAddress.city}{selectedAddress.postal_code && `, ${selectedAddress.postal_code}`}</p>
                      </>
                    ) : (
                      <>
                        <p>{formData.firstName} {formData.lastName}</p>
                        <p>{formData.address1}{formData.address2 && `, ${formData.address2}`}</p>
                        <p>{formData.city}{formData.postalCode && `, ${formData.postalCode}`}</p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-px bg-baucis-green-200 self-stretch" />
                
                {/* Billing Address */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-lg text-baucis-green-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                    {t('billingAddress') || 'Billing Address'}
                  </h2>
                  <div className="text-sm text-baucis-green-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                    {billingSameAsShipping ? (
                      // Show shipping address details when same
                      addressMode === 'saved' && selectedAddress ? (
                        <>
                          <p>{selectedAddress.first_name} {selectedAddress.last_name}</p>
                          <p>{selectedAddress.address_1}{selectedAddress.address_2 && `, ${selectedAddress.address_2}`}</p>
                          <p>{selectedAddress.city}{selectedAddress.postal_code && `, ${selectedAddress.postal_code}`}</p>
                        </>
                      ) : (
                        <>
                          <p>{formData.firstName} {formData.lastName}</p>
                          <p>{formData.address1}{formData.address2 && `, ${formData.address2}`}</p>
                          <p>{formData.city}{formData.postalCode && `, ${formData.postalCode}`}</p>
                        </>
                      )
                    ) : (
                      // Show different billing address
                      <>
                        <p>{billingData.firstName} {billingData.lastName}</p>
                        <p>{billingData.address1}</p>
                        <p>{billingData.city}{billingData.postalCode && `, ${billingData.postalCode}`}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className={`text-lg ${contactConfirmed ? 'text-baucis-green-800' : 'text-gray-400'}`} style={{ fontFamily: 'Libre Baskerville, serif' }}>
                  {t('shippingAddress') || 'Shipping Address'}
                </h2>
              </div>
            )}
          </div>
          {addressConfirmed && (
            <button
              type="button"
              onClick={handleEditAddress}
              className="text-sm text-baucis-green-600 hover:text-baucis-green-800 underline flex-shrink-0"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              Edit
            </button>
          )}
        </div>

        {/* Section Content - Only show if contact confirmed and address not confirmed */}
        {contactConfirmed && !addressConfirmed && (
          <div className="p-5 space-y-4">
            {/* Saved Addresses for logged-in users */}
            {isLoggedIn && savedAddresses.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-baucis-green-600 mb-3" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('savedAddresses') || 'Saved Addresses'}
                </p>
                
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <label
                      key={address.id}
                      className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        addressMode === 'saved' && selectedAddressId === address.id
                          ? 'border-baucis-green-500 bg-baucis-green-50'
                          : 'border-baucis-green-100 hover:border-baucis-green-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={addressMode === 'saved' && selectedAddressId === address.id}
                        onChange={() => handleSelectAddress(address.id)}
                        className="sr-only"
                      />
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 mt-0.5 flex-shrink-0 ${
                        addressMode === 'saved' && selectedAddressId === address.id
                          ? 'border-baucis-green-500'
                          : 'border-baucis-green-300'
                      }`}>
                        {addressMode === 'saved' && selectedAddressId === address.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-baucis-green-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <MapPinIcon className="w-4 h-4 text-baucis-green-500" />
                            <span className="text-baucis-green-800 font-medium text-sm" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                              {address.address_name || 'Address'}
                            </span>
                            {address.is_default_shipping && (
                              <span className="bg-baucis-green-600 text-white text-xs px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          {/* Edit button */}
                          {onEditAddress && (
                            <button
                              type="button"
                              onClick={(e) => handleStartEditAddress(e, address)}
                              className="text-baucis-green-500 hover:text-baucis-green-700 p-1.5 rounded-lg hover:bg-baucis-green-100 transition-colors"
                              title={t('edit') || 'Edit'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-baucis-green-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {address.first_name} {address.last_name}
                        </p>
                        <p className="text-baucis-green-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {address.address_1}{address.address_2 && `, ${address.address_2}`}
                        </p>
                        <p className="text-baucis-green-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {address.city}{address.postal_code && `, ${address.postal_code}`}
                        </p>
                      </div>
                    </label>
                  ))}
                  
                  {/* Use Different Address Option */}
                  {!maxAddressesReached && (
                    <label
                      className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        addressMode === 'new'
                          ? 'border-baucis-green-500 bg-baucis-green-50'
                          : 'border-baucis-green-100 hover:border-baucis-green-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={addressMode === 'new'}
                        onChange={() => setAddressMode('new')}
                        className="sr-only"
                      />
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 ${
                        addressMode === 'new' ? 'border-baucis-green-500' : 'border-baucis-green-300'
                      }`}>
                        {addressMode === 'new' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-baucis-green-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-baucis-green-700 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {t('useNewAddress') || 'Use a different address'}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Manual Address Form - Map-first approach */}
            {((addressMode === 'new' && !maxAddressesReached) || savedAddresses.length === 0 || !isLoggedIn) && (
              <div className="space-y-4">
                {/* Editing indicator */}
                {editingAddressId && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                      <span className="text-sm text-amber-800 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
                        {t('editingAddress') || 'Editing address'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-sm text-amber-700 hover:text-amber-900 underline"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {t('cancel') || 'Cancel'}
                    </button>
                  </div>
                )}

                {/* Address Name */}
                {isLoggedIn && (
                  <div>
                    <label htmlFor="addressName" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('addressName') || 'Address Name'}
                    </label>
                    <input
                      type="text"
                      id="addressName"
                      name="addressName"
                      value={formData.addressName}
                      onChange={handleChange}
                      placeholder="Home, Office, etc."
                      className={`${inputClass} border-baucis-green-200 focus:ring-baucis-green-400`}
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    />
                  </div>
                )}

                {/* First Name / Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className={getLabelClass(formData.firstName)} style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('firstName')} *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className={getInputClass(formData.firstName)}
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className={getLabelClass(formData.lastName)} style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('lastName')} *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className={getInputClass(formData.lastName)}
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    />
                  </div>
                </div>
                
                {/* Exact Location - Map with search (primary way to get address) */}
                <div>
                  <label className={`text-sm mb-2 block ${formData.city && formData.coordinates ? 'text-baucis-green-700' : 'text-red-500 font-medium'}`} style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('pinYourLocation') || 'Find your exact location'} *
                  </label>
                  <AddressMap
                    coordinates={formData.coordinates}
                    selectedCountry={formData.countryCode || 'al'}
                    onCountryChange={(code) => {
                      setAddressError(null); // Clear error when country changes
                      setFormData(prev => ({
                        ...prev,
                        countryCode: code,
                        // Clear address when country changes
                        city: '',
                        address1: '',
                        postalCode: '',
                        coordinates: null,
                      }));
                    }}
                    onCoordinatesChange={(coords) => setFormData(prev => ({
                      ...prev,
                      coordinates: coords
                    }))}
                    onAddressSelect={(addressData) => {
                      if (addressData) {
                        setFormData(prev => ({
                          ...prev,
                          address1: addressData.streetAddress || '',
                          city: addressData.city || '',
                          postalCode: addressData.postalCode || '',
                          countryCode: addressData.countryCode || prev.countryCode,
                          coordinates: addressData.coordinates,
                        }));
                      }
                    }}
                    height="420px"
                    showSearch={true}
                    showCountrySelector={true}
                    translations={{
                      useMyLocation: t('useMyLocation') || 'Use my location',
                      locating: t('locating') || 'Finding your location...',
                      locationError: t('locationError') || 'Could not get your location',
                      searchAddress: t('searchAddress') || 'Search for your address',
                      dragPinHint: t('dragPinHint') || 'Drag the pin or tap the map to adjust',
                      shippingRestriction: t('shippingRestriction') || 'We currently ship to:',
                    }}
                  />
                  {/* Show selected address from map */}
                  {formData.city && formData.coordinates && (
                    <div className="mt-3 p-3 bg-baucis-green-50 rounded-xl border border-baucis-green-200">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-baucis-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        </svg>
                        <div>
                          <p className="text-sm text-baucis-green-800 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
                            {formData.address1 || formData.city}
                          </p>
                          <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                            {formData.city}{formData.postalCode && `, ${formData.postalCode}`}{formData.countryCode && ` (${formData.countryCode.toUpperCase()})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Validation message */}
                  {showValidation && (!formData.city || !formData.coordinates) && (
                    <p className="text-xs text-red-500 mt-2" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('selectLocationOnMap') || 'Please select your location on the map'}
                    </p>
                  )}
                </div>

                {/* Save Address to Account Checkbox - only show when not editing */}
                {isLoggedIn && addressMode === 'new' && !maxAddressesReached && !editingAddressId && (
                  <label className="flex items-center gap-3 p-3 bg-baucis-green-50/50 rounded-xl cursor-pointer hover:bg-baucis-green-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={saveAddressToAccount}
                      onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                      className="w-4 h-4 text-baucis-green-600 rounded border-baucis-green-300 focus:ring-baucis-green-500"
                    />
                    <span className="text-sm text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('saveAddressToAccount') || 'Save this address to my account'}
                    </span>
                  </label>
                )}
                
                {/* Update Address Button when editing */}
                {editingAddressId && (
                  <button
                    type="button"
                    onClick={handleSaveEditedAddress}
                    disabled={savingAddress || !isNewAddressValid}
                    className="w-full bg-amber-600 text-white py-2.5 px-5 rounded-lg hover:bg-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {savingAddress ? (
                      <>
                        <SpinnerIcon className="w-4 h-4" />
                        <span>{t('saving') || 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                        <span>{t('updateAddress') || 'Update Address'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Billing Address */}
            <div className="border-t border-baucis-green-100 pt-4 mt-4">
              <h3 className="text-lg text-baucis-green-800 mb-4" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                {t('billingAddress') || 'Billing Address'}
              </h3>
              
              <label className="flex items-center space-x-3 p-4 bg-baucis-green-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => onBillingSameChange(e.target.checked)}
                  className="w-5 h-5 text-baucis-green-600 rounded border-baucis-green-300 focus:ring-baucis-green-500"
                />
                <span className="text-sm text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('sameAsShipping') || 'Same as shipping address'}
                </span>
              </label>

              {!billingSameAsShipping && (
                <div className="space-y-4 mt-4">
                  {/* Billing Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('firstName')} *</label>
                      <input type="text" name="firstName" value={billingData.firstName} onChange={handleBillingChange} className={`${inputClass} border-baucis-green-200 focus:ring-baucis-green-400`} style={{ fontFamily: 'Crimson Text, serif' }} />
                    </div>
                    <div>
                      <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>{t('lastName')} *</label>
                      <input type="text" name="lastName" value={billingData.lastName} onChange={handleBillingChange} className={`${inputClass} border-baucis-green-200 focus:ring-baucis-green-400`} style={{ fontFamily: 'Crimson Text, serif' }} />
                    </div>
                  </div>

                  {/* Billing Location - Map with search */}
                  <div>
                    <label className={`text-sm mb-2 block ${billingData.city && billingData.coordinates ? 'text-baucis-green-700' : 'text-red-500 font-medium'}`} style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('pinYourLocation') || 'Find your exact location'} *
                    </label>
                    <AddressMap
                      coordinates={billingData.coordinates}
                      selectedCountry={billingData.countryCode || 'al'}
                      onCountryChange={(code) => {
                        setAddressError(null); // Clear error when country changes
                        setBillingData(prev => ({
                          ...prev,
                          countryCode: code,
                          // Clear address when country changes
                          city: '',
                          address1: '',
                          postalCode: '',
                          coordinates: null,
                        }));
                      }}
                      onCoordinatesChange={(coords) => setBillingData(prev => ({
                        ...prev,
                        coordinates: coords
                      }))}
                      onAddressSelect={(addressData) => {
                        if (addressData) {
                          setBillingData(prev => ({
                            ...prev,
                            address1: addressData.streetAddress || '',
                            city: addressData.city || '',
                            postalCode: addressData.postalCode || '',
                            countryCode: addressData.countryCode || prev.countryCode,
                            coordinates: addressData.coordinates,
                          }));
                        }
                      }}
                      height="350px"
                      showSearch={true}
                      showCountrySelector={true}
                      translations={{
                        useMyLocation: t('useMyLocation') || 'Use my location',
                        locating: t('locating') || 'Finding your location...',
                        locationError: t('locationError') || 'Could not get your location',
                        searchAddress: t('searchAddress') || 'Search for your address',
                        dragPinHint: t('dragPinHint') || 'Drag the pin or tap the map to adjust',
                        shippingRestriction: t('shippingRestriction') || 'We currently ship to:',
                      }}
                    />
                    {/* Show selected billing address from map */}
                    {billingData.city && billingData.coordinates && (
                      <div className="mt-3 p-3 bg-baucis-green-50 rounded-xl border border-baucis-green-200">
                        <div className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-baucis-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                          </svg>
                          <div>
                            <p className="text-sm text-baucis-green-800 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
                              {billingData.address1 || billingData.city}
                            </p>
                            <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                              {billingData.city}{billingData.postalCode && `, ${billingData.postalCode}`}{billingData.countryCode && ` (${billingData.countryCode.toUpperCase()})`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Validation message for billing */}
                    {showValidation && !billingSameAsShipping && (!billingData.city || !billingData.coordinates) && (
                      <p className="text-xs text-red-500 mt-2" style={{ fontFamily: 'Crimson Text, serif' }}>
                        {t('selectLocationOnMap') || 'Please select your location on the map'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Address Error Message */}
            {addressError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex items-center gap-2 flex-wrap text-sm text-amber-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                  <span>{addressError}</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/al.png" srcSet="https://flagcdn.com/w80/al.png 2x" width="16" height="12" alt="Albania" className="rounded-sm" />
                    <span>Albania</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/xk.png" srcSet="https://flagcdn.com/w80/xk.png 2x" width="16" height="12" alt="Kosovo" className="rounded-sm" />
                    <span>Kosovo</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/mk.png" srcSet="https://flagcdn.com/w80/mk.png 2x" width="16" height="12" alt="North Macedonia" className="rounded-sm" />
                    <span>North Macedonia</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Address Button - disabled when editing an existing address */}
            <button
              type="button"
              onClick={handleConfirmAddress}
              disabled={loading || !isAddressValid || editingAddressId}
              className="w-full bg-baucis-green-600 text-white py-2.5 px-5 rounded-lg hover:bg-baucis-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {loading ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  <span>Calculating Shipping...</span>
                </>
              ) : editingAddressId ? (
                <>
                  <span>{t('updateAddressFirst') || 'Update address first'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Confirm Address</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ============ SECTION 3: PAYMENT ============ */}
      <div 
        ref={paymentSectionRef}
        className={`bg-white rounded-2xl border-2 transition-all ${
          addressConfirmed 
            ? 'border-baucis-green-200' 
            : 'border-gray-200 opacity-60'
        }`}
      >
        {/* Section Header */}
        <div className={`flex items-center justify-between p-5 ${addressConfirmed ? 'border-b border-baucis-green-100' : ''}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              addressConfirmed ? 'bg-baucis-green-100' : 'bg-gray-100'
            }`}>
              <CreditCardIcon className={`w-5 h-5 ${addressConfirmed ? 'text-baucis-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-h-[76px] flex flex-col justify-center">
              <h2 className={`text-lg ${addressConfirmed ? 'text-baucis-green-800' : 'text-gray-400'}`} style={{ fontFamily: 'Libre Baskerville, serif' }}>
                Payment
              </h2>
              {!addressConfirmed && (
                <p className="text-sm text-gray-400 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  Complete previous steps first
                </p>
              )}
              {addressConfirmed && !shippingReady && (
                <p className="text-sm text-baucis-green-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  Calculating shipping...
                </p>
              )}
              {addressConfirmed && shippingReady && (
                <p className="text-sm text-baucis-green-600 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                  Ready to proceed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section Content - Only show if address confirmed and shipping ready */}
        {addressConfirmed && shippingReady && (
          <div className="p-5 pt-0 space-y-4">
            {/* Payment Method Selection */}
            <div className="grid gap-3">
              
              {/* Digital Payment Option - POK Pay */}
              <div
                className={`relative border-2 rounded-xl p-4 transition-all cursor-pointer ${
                  selectedPaymentMethod === 'pok'
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
                onClick={() => onSelectPaymentMethod?.('pok')}
              >
                <div className="absolute -top-2 right-3 z-10">
                  <span className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedPaymentMethod === 'pok' ? 'bg-purple-500' : 'bg-purple-400'
                  }`}>
                    {t('paymentMethod.digital.available') || 'AVAILABLE'}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedPaymentMethod === 'pok' ? 'bg-purple-500' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  }`}>
                    <CreditCardIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                        {t('paymentMethod.digital.title') || 'Pay Online'}
                      </h4>
                      {selectedPaymentMethod === 'pok' && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-purple-600 mt-0.5" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('paymentMethod.digital.subtitle') || 'Visa, Mastercard via POK'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        {t('paymentMethod.digital.secure') || 'Secure 3DS'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        {t('paymentMethod.digital.instant') || 'Instant payment'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash on Delivery Option */}
              {countryCode?.toLowerCase() === 'al' ? (
                <div 
                  className={`relative border-2 rounded-xl p-4 transition-all cursor-pointer ${
                    selectedPaymentMethod === 'cod' 
                      ? 'border-baucis-green-500 bg-baucis-green-50 ring-2 ring-baucis-green-200' 
                      : 'border-gray-200 hover:border-baucis-green-300 hover:bg-baucis-green-50/30'
                  }`}
                  onClick={() => onSelectPaymentMethod?.('cod')}
                >
                  <div className="absolute -top-2 right-3 z-10">
                    <span className="bg-baucis-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {t('paymentMethod.cod.available') || 'AVAILABLE'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedPaymentMethod === 'cod' ? 'bg-baucis-green-500' : 'bg-baucis-green-100'
                    }`}>
                      <svg className={`w-5 h-5 ${selectedPaymentMethod === 'cod' ? 'text-white' : 'text-baucis-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-800" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                          {t('paymentMethod.cod.title') || 'Cash on Delivery'}
                        </h4>
                        {selectedPaymentMethod === 'cod' && (
                          <div className="w-5 h-5 bg-baucis-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-baucis-green-600 mt-0.5" style={{ fontFamily: 'Crimson Text, serif' }}>
                        {t('paymentMethod.cod.subtitle') || 'Pay when you receive'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-baucis-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {t('paymentMethod.cod.noExtraFees') || 'No extra fees'}
                        </span>
                        <span className="flex items-center gap-1">
                          <img 
                            width="20" 
                            height="15" 
                            alt="AL" 
                            className="rounded-sm object-cover" 
                            srcSet="https://flagcdn.com/w80/al.png 2x" 
                            src="https://flagcdn.com/w40/al.png" 
                            style={{ minWidth: '20px' }}
                          />
                          Albania
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Kosovo - COD Not Available */
                <div className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-slate-50 opacity-60">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-400" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                          {t('paymentMethod.cod.title') || 'Cash on Delivery'}
                        </h4>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          {t('notAvailable') || 'Not Available'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p style={{ fontFamily: 'Crimson Text, serif' }}>
                          {t('paymentMethod.cod.kosovoNote') || 'Cash on Delivery is not available for Kosovo. Digital payment options coming soon.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm COD Button */}
            {selectedPaymentMethod === 'cod' && (
              <button
                type="button"
                onClick={onProceedToPayment}
                disabled={loading}
                className="w-full bg-baucis-green-600 text-white py-2.5 px-5 rounded-lg hover:bg-baucis-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{t('processing') || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <span>{t('paymentMethod.cod.selectButton') || 'Confirm Cash on Delivery'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            )}

            {/* Inline POK Card Form with Slide Animation */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                selectedPaymentMethod === 'pok'
                  ? 'max-h-[800px] opacity-100'
                  : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-xl p-4 border border-purple-100 mt-3">
                <PokGuestCheckout
                  cartId={cartId}
                  customerEmail={customerEmail || formData.email}
                  shippingAmount={shippingAmount}
                  discountAmount={discountAmount}
                  onSuccess={onPokPaymentSuccess}
                  onError={onPokPaymentError}
                  onCancel={() => onSelectPaymentMethod(null)}
                  isStaging={process.env.NEXT_PUBLIC_POK_STAGING === 'true'}
                />
              </div>
            </div>

            {/* Note when nothing selected */}
            {!selectedPaymentMethod && countryCode?.toLowerCase() === 'al' && (
              <p className="text-center text-xs text-gray-400" style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('paymentMethod.selectMethod') || 'Select a payment method to continue'}
              </p>
            )}
          </div>
        )}

        {/* Loading state while calculating shipping */}
        {addressConfirmed && !shippingReady && (
          <div className="p-5 pt-0">
            <div className="flex items-center justify-center gap-2 py-4 text-baucis-green-600">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('calculatingShipping') || 'Calculating shipping...'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Phone OTP Verification Modal */}
      {showPhoneOTPModal && (
        <div className="fixed inset-0 bg-baucis-green-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-b from-white to-baucis-pink-50 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 px-6 py-5 border-b border-baucis-green-100">
              <button 
                type="button"
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
                    Code sent to <strong>{formData.phone}</strong>
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
                  <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>Sending code...</span>
                </div>
              )}

              {phoneOTPState === 'verifying' && (
                <div className="flex items-center justify-center gap-2 text-baucis-green-600 mb-4">
                  <SpinnerIcon className="w-5 h-5" />
                  <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>Verifying...</span>
                </div>
              )}

              {/* Error message */}
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
                      phoneOTPCountdown > 0 ? 'text-red-300 cursor-not-allowed' : 'text-red-600 hover:text-red-800 underline'
                    }`}
                    style={{ fontFamily: 'Libre Baskerville, serif' }}
                  >
                    {phoneOTPCountdown > 0 ? `Resend in ${phoneOTPCountdown}s` : 'Resend Code'}
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
                  Cancel
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
                    {phoneOTPCountdown > 0 ? `Resend in ${phoneOTPCountdown}s` : 'Resend Code'}
                  </button>
                )}
              </div>
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
