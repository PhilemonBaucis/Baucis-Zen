'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth, ZEN_POINTS_TIERS } from '@/lib/auth-context';

export default function AccountDropdown() {
  const t = useTranslations('auth');
  const { customer, logout, currentTier, zenPoints, daysUntilReset } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get first letter for avatar
  const initial = customer?.first_name?.charAt(0)?.toUpperCase() || customer?.email?.charAt(0)?.toUpperCase() || '?';
  
  // Tier colors
  const tierColors = {
    seed: 'bg-stone-100 text-stone-600',
    sprout: 'bg-emerald-100 text-emerald-700',
    blossom: 'bg-pink-100 text-pink-700',
    lotus: 'bg-amber-100 text-amber-700',
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-baucis-green-600 text-white text-sm font-medium hover:bg-baucis-green-500 transition-colors"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
        aria-label="Account menu"
      >
        {initial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-baucis-green-100 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-baucis-green-100">
            <p 
              className="text-baucis-green-800 font-medium"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('greeting')}, {customer?.first_name || 'Friend'}!
            </p>
            <p 
              className="text-baucis-green-500 text-sm truncate"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {customer?.email}
            </p>
          </div>

          {/* Zen Points Summary */}
          <div className="px-4 py-3 border-b border-baucis-green-100">
            <div className="flex items-center justify-between mb-2">
              <span 
                className="text-sm text-baucis-green-600"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('zenPoints')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tierColors[currentTier]}`}>
                {ZEN_POINTS_TIERS[currentTier]?.name || 'Seed'}
              </span>
            </div>
            <div className="flex items-baseline space-x-1">
              <span 
                className="text-2xl font-bold text-baucis-green-800"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {zenPoints?.current_balance || 0}
              </span>
              <span className="text-sm text-baucis-green-500">pts</span>
            </div>
            {zenPoints && (
              <p 
                className="text-xs text-baucis-green-400 mt-1"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('resetsIn', { days: daysUntilReset })}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/account/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-baucis-green-700 hover:bg-baucis-green-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('myOrders')}</span>
            </Link>

            <Link
              href="/account/zen-points"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-baucis-green-700 hover:bg-baucis-green-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('zenPoints')}</span>
              <span className="ml-auto text-xs text-baucis-green-400">{t('comingSoon')}</span>
            </Link>

            <Link
              href="/account/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-baucis-green-700 hover:bg-baucis-green-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('accountSettings')}</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-baucis-green-100 pt-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

