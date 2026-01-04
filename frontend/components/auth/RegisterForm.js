'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';

export default function RegisterForm() {
  const t = useTranslations('auth');
  const { register, authError, setAuthError, setAuthModalView } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear password match error when user types
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError(t('passwordsNoMatch'));
      return;
    }
    
    // Validate password length
    if (formData.password.length < 8) {
      setPasswordError(t('passwordTooShort'));
      return;
    }
    
    setLoading(true);
    
    const result = await register({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
    });
    
    if (!result.success) {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-baucis-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-baucis-green-800";
  const labelClass = "block text-sm text-baucis-green-700 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {(authError || passwordError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {authError || passwordError}
        </div>
      )}

      {/* Signup Bonus Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 flex items-center space-x-3">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-lg">🎁</span>
        </div>
        <div>
          <p className="text-amber-800 font-medium text-sm" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('signupBonus')}
          </p>
          <p className="text-amber-600 text-xs" style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('signupBonusDesc')}
          </p>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('firstName')} *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            placeholder="John"
            className={inputClass}
            style={{ fontFamily: 'Crimson Text, serif' }}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
            {t('lastName')} *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            placeholder="Doe"
            className={inputClass}
            style={{ fontFamily: 'Crimson Text, serif' }}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="register-email" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('email')} *
        </label>
        <input
          type="email"
          id="register-email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="your@email.com"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      {/* Phone (Optional) */}
      <div>
        <label htmlFor="phone" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('phone')} ({t('optional')})
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+355 69 123 4567"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="register-password" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('password')} *
        </label>
        <input
          type="password"
          id="register-password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
          minLength={8}
          placeholder="••••••••"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
        <p className="text-xs text-baucis-green-500 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('passwordHint')}
        </p>
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('confirmPassword')} *
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          placeholder="••••••••"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-baucis-green-600 text-white text-sm tracking-wider py-3 rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{t('creatingAccount')}</span>
          </>
        ) : (
          <span>{t('createAccount').toUpperCase()}</span>
        )}
      </button>

      {/* Switch to Login */}
      <div className="text-center pt-4 border-t border-baucis-green-100">
        <p className="text-sm text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('haveAccount')}{' '}
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthModalView('login');
            }}
            className="text-baucis-green-700 font-medium hover:text-baucis-green-900 underline"
          >
            {t('loginHere')}
          </button>
        </p>
      </div>
    </form>
  );
}

