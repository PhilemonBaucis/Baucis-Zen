'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';

export default function LoginForm() {
  const t = useTranslations('auth');
  const { login, authError, setAuthError, setAuthModalView } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(email, password);
    
    if (!result.success) {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-baucis-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-baucis-green-800";
  const labelClass = "block text-sm text-baucis-green-700 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error Message */}
      {authError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {authError}
        </div>
      )}

      <div>
        <label htmlFor="login-email" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('email')}
        </label>
        <input
          type="email"
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('password')}
        </label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className={inputClass}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      {/* Forgot Password Link */}
      <div className="text-right">
        <button
          type="button"
          className="text-sm text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
          style={{ fontFamily: 'Crimson Text, serif' }}
          onClick={() => {/* TODO: Implement forgot password */}}
        >
          {t('forgotPassword')}
        </button>
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
            <span>{t('loggingIn')}</span>
          </>
        ) : (
          <span>{t('login').toUpperCase()}</span>
        )}
      </button>

      {/* Switch to Register */}
      <div className="text-center pt-4 border-t border-baucis-green-100">
        <p className="text-sm text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('noAccount')}{' '}
          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setAuthModalView('register');
            }}
            className="text-baucis-green-700 font-medium hover:text-baucis-green-900 underline"
          >
            {t('registerNow')}
          </button>
        </p>
      </div>
    </form>
  );
}

