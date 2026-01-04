'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { SignInButton, SignedIn, SignedOut, useUser, useClerk } from '@clerk/nextjs';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import ZenPointsBadge from '@/components/zen-points/ZenPointsBadge';

// Icons
const DashboardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const AddressIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const OrdersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const ProfileIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);

const LogoutIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

export default function Header() {
  const t = useTranslations('header');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tAccount = useTranslations('account');
  const [isVisible, setIsVisible] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const lastScrollY = useRef(0);
  const dropdownRef = useRef(null);
  const { getTotalItems, openDrawer } = useCart();
  const { isLoaded } = useUser();
  const { signOut } = useClerk();
  const { customer, isLoggedIn } = useAuth();
  const itemCount = getTotalItems();

  // Handle scroll
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      const currentScrollY = target.scrollTop !== undefined ? target.scrollTop : window.scrollY;
      
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get initial for avatar
  const initial = customer?.first_name?.charAt(0)?.toUpperCase() 
    || customer?.email?.charAt(0)?.toUpperCase() 
    || '?';

  const handleSignOut = async () => {
    setShowDropdown(false);
    await signOut();
  };

  const menuItems = [
    { href: '/account', label: tAccount('dashboard'), Icon: DashboardIcon },
    { href: '/account/addresses', label: tAccount('addresses'), Icon: AddressIcon },
    { href: '/account/orders', label: tAccount('orders'), Icon: OrdersIcon },
    { href: '/account/profile', label: tAccount('profile'), Icon: ProfileIcon },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 bg-baucis-green-700 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* Centered Logo */}
      <Link href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <img 
          src="/Baucis Zen - Logo.png" 
          alt="BAUCIS ZEN" 
          className="h-7 w-auto hover:opacity-80 transition-opacity duration-300"
        />
      </Link>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Left Icons */}
          <div className="flex items-center space-x-2">
            {/* Home Icon */}
            <Link 
              href="/" 
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
              aria-label={tCommon('home')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>

            {/* Shop Icon */}
            <Link 
              href="/products" 
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300 ml-0"
              aria-label={t('shopCollection')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3c14 0 16 10 16 16-6 0-16-2-16-16zm0 0c0 8 4 13 11 15M5 3c4 1 8 4 10 8" />
              </svg>
            </Link>

            {/* Zen Points Badge - only shows when logged in */}
            <ZenPointsBadge />
          </div>

          {/* Right Icons */}
          <div className="flex items-center space-x-2">
            {/* Account Icon */}
            {!isLoaded ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Signed Out - Show Sign In Button */}
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300"
                      aria-label={tAuth('login')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </button>
                  </SignInButton>
                </SignedOut>

                {/* Signed In - Avatar with Dropdown */}
                <SignedIn>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="h-8 px-3 pr-3.5 flex items-center justify-center rounded-full bg-baucis-green-600 text-white text-sm font-medium hover:bg-baucis-green-500 transition-colors"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                      aria-label="My Account"
                    >
                      {initial}
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                      <div 
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-baucis-green-100 py-2 overflow-hidden"
                        style={{ animation: 'dropdownFadeIn 0.15s ease-out' }}
                      >
                        {menuItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center space-x-3 px-4 py-2.5 text-baucis-green-700 hover:bg-baucis-green-50 transition-colors"
                          >
                            <item.Icon className="w-4 h-4 text-baucis-green-500" />
                            <span 
                              className="text-sm"
                              style={{ fontFamily: 'Crimson Text, serif' }}
                            >
                              {item.label}
                            </span>
                          </Link>
                        ))}
                        
                        {/* Divider */}
                        <div className="my-1 border-t border-baucis-green-100" />
                        
                        {/* Sign Out */}
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-3 px-4 py-2.5 w-full text-left text-baucis-green-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <LogoutIcon className="w-4 h-4" />
                          <span 
                            className="text-sm"
                            style={{ fontFamily: 'Crimson Text, serif' }}
                          >
                            {tAccount('signOut')}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </SignedIn>
              </>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />
            
            {/* Cart Icon */}
            <button 
              onClick={openDrawer}
              className="relative w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors duration-300 ml-0"
              aria-label={t('openCart')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-baucis-pink-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </header>
  );
}
