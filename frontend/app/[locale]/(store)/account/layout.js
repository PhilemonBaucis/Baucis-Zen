'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { SignOutButton } from '@clerk/nextjs';

// Icon components
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

export default function AccountLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, loading, customer } = useAuth();
  const t = useTranslations('account');

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/');
    }
  }, [loading, isLoggedIn, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-baucis-pink-50 to-white pt-16">
        <div className="animate-spin w-8 h-8 border-2 border-baucis-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Don't render if not logged in (will redirect)
  if (!isLoggedIn) {
    return null;
  }

  const navItems = [
    { href: '/account', label: t('dashboard'), Icon: DashboardIcon },
    { href: '/account/addresses', label: t('addresses'), Icon: AddressIcon },
    { href: '/account/orders', label: t('orders'), Icon: OrdersIcon },
    { href: '/account/profile', label: t('profile'), Icon: ProfileIcon },
  ];

  // Get current path without locale
  const currentPath = pathname.replace(/^\/[a-z]{2}/, '') || '/account';

  return (
    <div className="min-h-screen bg-gradient-to-b from-baucis-pink-50 to-white pt-16">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-2xl text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('title')}
            </h1>
            <p 
              className="text-baucis-green-600 text-sm mt-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('welcome')}, {customer?.first_name || customer?.email?.split('@')[0] || 'Friend'}!
            </p>
          </div>
          
          <SignOutButton>
            <button 
              className="flex items-center space-x-2 text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              <LogoutIcon className="w-5 h-5" />
              <span>{t('signOut')}</span>
            </button>
          </SignOutButton>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="md:w-56 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-lg p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = currentPath === item.href || 
                  (item.href !== '/account' && currentPath.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-baucis-green-100 text-baucis-green-800'
                        : 'text-baucis-green-600 hover:bg-baucis-green-50'
                    }`}
                  >
                    <item.Icon className="w-5 h-5" />
                    <span 
                      className="text-sm"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
