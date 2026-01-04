'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth, ZEN_POINTS_TIERS } from '@/lib/auth-context';

// Tier icon components
const TierIcons = {
  seed: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18c-4 0-6-3-6-6 0-4 3-8 6-10 3 2 6 6 6 10 0 3-2 6-6 6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v3" />
    </svg>
  ),
  sprout: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15c-3 0-5-2.5-5-5 0-3.5 2.5-6 5-8 2.5 2 5 4.5 5 8 0 2.5-2 5-5 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 18c0-2 2-3 5-3s5 1 5 3" />
    </svg>
  ),
  blossom: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c0 3-2 5-2 5s2 2 2 5c0-3 2-5 2-5s-2-2-2-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 12c-3 0-5-2-5-2s-2 2-5 2c3 0 5 2 5 2s2-2 5-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c0-3 2-5 2-5s-2-2-2-5c0 3-2 5-2 5s2 2 2 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c3 0 5 2 5 2s2-2 5-2c-3 0-5-2-5-2s-2 2-5 2z" />
    </svg>
  ),
  lotus: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-2 3-3 6-3 9s1 6 3 9c2-3 3-6 3-9s-1-6-3-9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12c2-1 4-1 7-1s5 0 7 1c-1 3-3 5-7 7-4-2-6-4-7-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10c3 0 5 1 6 2-1 2-3 3-6 3 0-2 0-4 0-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10c-3 0-5 1-6 2 1 2 3 3 6 3 0-2 0-4 0-5z" />
    </svg>
  ),
};

// Common icons
const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const PackageIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const ShoppingBagIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const TagIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const StarIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const ArrowTrendingUpIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const CurrencyDollarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LeafIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.5 0-8-3.5-8-8 0-6 5-10 8-11 3 1 8 5 8 11 0 4.5-3.5 8-8 8z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16c-2 0-3.5-1.5-3.5-3.5" />
  </svg>
);

export default function AccountDashboard() {
  const t = useTranslations('account');
  const { customer, currentTier, daysUntilReset, zenPoints } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);

  // Fetch addresses and orders from API
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await fetch('/api/addresses');
        const data = await response.json();
        setAddresses(data.addresses || []);
      } catch (err) {
        console.error('Failed to fetch addresses:', err);
      }
    };

    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders');
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      }
    };

    fetchAddresses();
    fetchOrders();
  }, []);

  // Helper to format price (prices stored in whole euros, not cents)
  const formatPrice = (amount, currency = 'EUR') => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'EUR',
    }).format(safeAmount);
  };

  // Generate formatted order number: BZ-YYYY-XXXXX
  const formatOrderNumber = (order) => {
    const year = new Date(order.created_at).getFullYear();
    const paddedId = String(order.display_id).padStart(5, '0');
    return `BZ-${year}-${paddedId}`;
  };

  // Map Medusa status to display status (3 stages: processing, shipped, delivered)
  const getDisplayStatus = (order) => {
    if (order.status === 'canceled') return 'cancelled';
    if (order.status === 'completed') return 'delivered';
    if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled') {
      return 'shipped';
    }
    // All other orders (pending, captured) are "processing"
    return 'processing';
  };

  // Helper to get order total from summary (handles nested structure)
  const getOrderTotal = (order) => {
    const summaryTotals = order.summary?.totals || order.summary || {};

    // Calculate from items as fallback
    const itemsTotal = (order.items || []).reduce((sum, item) => {
      return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    // Check for Zen tier discount in metadata
    const zenDiscount = order.metadata?.zen_tier_discount;
    // Get shipping - prioritize stored EUR price from metadata
    const customShipping = order.metadata?.custom_shipping;
    const shipping = customShipping?.priceEUR ||
                     Number(order.shipping_methods?.[0]?.amount) ||
                     Number(order.shipping_total) || 0;

    // If we have zen discount in metadata but not in discount_total, calculate manually
    if (zenDiscount?.amount && !Number(order.discount_total)) {
      return (itemsTotal - Number(zenDiscount.amount)) + shipping;
    }

    return Number(summaryTotals.current_order_total) ||
           Number(order.total) ||
           Number(summaryTotals.original_order_total) ||
           itemsTotal;
  };

  // Helper to get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      shipped: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      canceled: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const points = zenPoints?.current_balance || 0;
  const tierInfo = ZEN_POINTS_TIERS[currentTier] || ZEN_POINTS_TIERS.seed;
  
  // Calculate progress to next tier
  const nextTier = currentTier === 'lotus' ? null : 
    currentTier === 'blossom' ? 'lotus' :
    currentTier === 'sprout' ? 'blossom' : 'sprout';
  
  const nextTierInfo = nextTier ? ZEN_POINTS_TIERS[nextTier] : null;
  const pointsToNext = nextTierInfo ? nextTierInfo.min - points : 0;
  const progressPercent = nextTierInfo 
    ? Math.min(100, (points / nextTierInfo.min) * 100)
    : 100;

  // Enhanced tier styling with progressive beauty
  const tierStyles = {
    seed: { 
      gradient: 'from-stone-100 to-stone-50', 
      accent: 'text-stone-600',
      border: 'border-stone-200',
      progressBar: 'bg-stone-400',
      shadow: 'shadow-lg',
      iconBg: 'bg-stone-100',
      badge: 'bg-stone-200/50 text-stone-700',
      glow: '',
      pattern: '',
    },
    sprout: { 
      gradient: 'from-emerald-100 via-emerald-50 to-green-50', 
      accent: 'text-emerald-700',
      border: 'border-emerald-200',
      progressBar: 'bg-gradient-to-r from-emerald-400 to-green-500',
      shadow: 'shadow-lg shadow-emerald-100/50',
      iconBg: 'bg-emerald-100',
      badge: 'bg-emerald-200/50 text-emerald-800',
      glow: '',
      pattern: 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.08)_0%,transparent_50%)]',
    },
    blossom: { 
      gradient: 'from-pink-100 via-rose-50 to-fuchsia-50', 
      accent: 'text-pink-700',
      border: 'border-pink-200',
      progressBar: 'bg-gradient-to-r from-pink-400 via-rose-400 to-fuchsia-400',
      shadow: 'shadow-xl shadow-pink-100/50',
      iconBg: 'bg-gradient-to-br from-pink-100 to-rose-100',
      badge: 'bg-gradient-to-r from-pink-200/60 to-rose-200/60 text-pink-800',
      glow: 'ring-1 ring-pink-200/50',
      pattern: 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.08)_0%,transparent_40%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.08)_0%,transparent_40%)]',
    },
    lotus: { 
      gradient: 'from-amber-100 via-yellow-50 to-orange-50', 
      accent: 'text-amber-700',
      border: 'border-amber-300',
      progressBar: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400',
      shadow: 'shadow-2xl shadow-amber-200/60',
      iconBg: 'bg-gradient-to-br from-amber-200 to-yellow-100',
      badge: 'bg-gradient-to-r from-amber-200/70 to-yellow-200/70 text-amber-900 font-semibold',
      glow: 'ring-2 ring-amber-300/40',
      pattern: 'before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_10%_90%,rgba(251,191,36,0.12)_0%,transparent_35%),radial-gradient(circle_at_90%_10%,rgba(245,158,11,0.12)_0%,transparent_35%),radial-gradient(circle_at_50%_50%,rgba(252,211,77,0.06)_0%,transparent_50%)]',
      shimmer: true,
    },
  };
  const style = tierStyles[currentTier] || tierStyles.seed;
  const TierIcon = TierIcons[currentTier] || TierIcons.seed;
  const isLotus = currentTier === 'lotus';
  const isBlossom = currentTier === 'blossom';
  const isPremiumTier = isLotus || isBlossom;

  return (
    <div className="space-y-6">
      {/* Zen Points Card - Enhanced Tier-Based Styling */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} rounded-3xl ${style.shadow} ${style.glow} ${style.border} border p-6 transition-all duration-500 ${style.pattern}`}>
        {/* Lotus shimmer effect */}
        {style.shimmer && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
        )}
        
        {/* Decorative corner elements for premium tiers */}
        {isPremiumTier && (
          <>
            <div className={`absolute top-0 right-0 w-32 h-32 ${isLotus ? 'bg-gradient-to-bl from-amber-200/30' : 'bg-gradient-to-bl from-pink-200/30'} to-transparent rounded-bl-full`} />
            <div className={`absolute bottom-0 left-0 w-24 h-24 ${isLotus ? 'bg-gradient-to-tr from-yellow-200/20' : 'bg-gradient-to-tr from-rose-200/20'} to-transparent rounded-tr-full`} />
          </>
        )}

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 
                className={`text-lg ${isPremiumTier ? style.accent : 'text-baucis-green-800'}`}
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('zenPoints')}
              </h2>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-3">
                {/* Enhanced tier icon with background */}
                <div className={`p-2 rounded-xl ${style.iconBg} ${isPremiumTier ? 'shadow-md' : ''}`}>
                  <TierIcon className={`w-7 h-7 ${style.accent} ${isLotus ? 'drop-shadow-sm' : ''}`} />
                </div>
                <span 
                  className={`text-3xl font-bold ${style.accent} ${isLotus ? 'drop-shadow-sm' : ''}`}
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {points}
                </span>
              </div>
              {/* Enhanced tier badge */}
              <div className={`inline-block mt-1 px-3 py-0.5 rounded-full text-sm ${style.badge}`}>
                <span style={{ fontFamily: 'Crimson Text, serif' }}>
                  {tierInfo.name} {t('tier')}
                </span>
              </div>
            </div>
          </div>

          {/* Discount Badge - Enhanced for premium tiers */}
          {tierInfo.discount > 0 && (
            <div className={`${isPremiumTier ? style.badge : 'bg-white/50 text-baucis-green-800'} rounded-xl px-4 py-2.5 mb-4 inline-flex items-center space-x-2 ${isLotus ? 'shadow-md' : ''}`}>
              <TagIcon className={`w-4 h-4 ${isPremiumTier ? style.accent : 'text-baucis-green-600'}`} />
              <p 
                className="text-sm"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('currentDiscount')}: <span className="text-lg font-bold mx-1" style={{ fontFamily: 'Libre Baskerville, serif' }}>{tierInfo.discount}%</span> {t('offAllProducts')}
              </p>
            </div>
          )}

          {/* Progress to Next Tier - Enhanced progress bar */}
          {nextTier && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span 
                  className="text-baucis-green-600"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {pointsToNext} {t('pointsToNextTier')}
                </span>
                <div className="flex items-center space-x-1.5">
                  {TierIcons[nextTier] && (
                    <span className={tierStyles[nextTier]?.accent || 'text-stone-500'}>
                      {(() => {
                        const NextIcon = TierIcons[nextTier];
                        return <NextIcon className="w-4 h-4" />;
                      })()}
                    </span>
                  )}
                  <span 
                    className={tierStyles[nextTier]?.accent || 'text-baucis-green-700'}
                    style={{ fontFamily: 'Crimson Text, serif', fontWeight: 500 }}
                  >
                    {ZEN_POINTS_TIERS[nextTier].name}
                  </span>
                </div>
              </div>
              <div className={`h-2.5 bg-white/60 rounded-full overflow-hidden ${isPremiumTier ? 'shadow-inner' : ''}`}>
                <div 
                  className={`h-full ${style.progressBar} rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Max Tier Message for Lotus */}
          {currentTier === 'lotus' && (
            <div className="mb-4 flex items-center space-x-2 text-amber-700">
              <StarIcon className="w-4 h-4" />
              <span 
                className="text-sm font-medium"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('maxTierReached') || 'You\'ve reached the highest tier!'}
              </span>
            </div>
          )}

          {/* Reset Notice */}
          <div className={`flex items-center space-x-2 text-sm ${isPremiumTier ? style.accent : 'text-baucis-green-600'} opacity-80`}>
            <ClockIcon className="w-4 h-4" />
            <span style={{ fontFamily: 'Crimson Text, serif' }}>
              {t('resetsIn', { days: daysUntilReset })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Addresses Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPinIcon className="w-5 h-5 text-baucis-green-600" />
              <h3 
                className="text-lg text-baucis-green-800"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('addresses')}
              </h3>
            </div>
            <Link 
              href="/account/addresses"
              className="text-sm text-baucis-green-600 hover:text-baucis-green-800"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('manage')} →
            </Link>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-4">
              <p 
                className="text-baucis-green-500 mb-3"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('noAddressSaved')}
              </p>
              <Link
                href="/account/addresses"
                className="inline-block bg-baucis-green-600 text-white text-xs px-4 py-2 rounded-full hover:bg-baucis-green-700 transition-colors"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('addAddress')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.slice(0, 3).map((address) => (
                <div 
                  key={address.id}
                  className={`border rounded-xl p-3 ${
                    address.is_default_shipping 
                      ? 'border-baucis-green-400 bg-baucis-green-50' 
                      : 'border-baucis-green-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {address.address_name && (
                      <span 
                        className="text-baucis-green-800 text-sm font-medium"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {address.address_name}
                      </span>
                    )}
                    {address.is_default_shipping && (
                      <span className="bg-baucis-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {t('default')}
                      </span>
                    )}
                  </div>
                  <p 
                    className="text-baucis-green-600 text-xs"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {address.address_1}, {address.city}
                  </p>
                </div>
              ))}
              {addresses.length > 3 && (
                <Link
                  href="/account/addresses"
                  className="block text-center text-sm text-baucis-green-600 hover:text-baucis-green-800 py-2"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  +{addresses.length - 3} {t('moreAddresses')}
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions - Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <PackageIcon className="w-5 h-5 text-baucis-green-600" />
              <h3
                className="text-lg text-baucis-green-800"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('recentOrders')}
              </h3>
            </div>
            <Link
              href="/account/orders"
              className="text-sm text-baucis-green-600 hover:text-baucis-green-800"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('viewAll')} →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-4">
              <p
                className="text-baucis-green-500 mb-3"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('noOrdersYet')}
              </p>
              <Link
                href="/products"
                className="inline-block bg-baucis-green-600 text-white text-xs px-4 py-2 rounded-full hover:bg-baucis-green-700 transition-colors"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('startShopping')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 3).map((order) => (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block border border-baucis-green-200 rounded-xl p-3 hover:border-baucis-green-400 hover:bg-baucis-green-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-baucis-green-800 text-sm font-medium"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {formatOrderNumber(order)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(getDisplayStatus(order))}`}>
                      {t(`orderStatuses.${getDisplayStatus(order)}`)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-baucis-green-500 text-xs"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span
                      className="text-baucis-green-700 text-sm font-medium"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {formatPrice(getOrderTotal(order), order.currency_code)}
                    </span>
                  </div>
                </Link>
              ))}
              {orders.length > 3 && (
                <Link
                  href="/account/orders"
                  className="block text-center text-sm text-baucis-green-600 hover:text-baucis-green-800 py-2"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  +{orders.length - 3} {t('moreOrders') || 'more orders'}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* How Zen Points Work */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <LeafIcon className="w-5 h-5 text-baucis-green-600" />
          <h3 
            className="text-lg text-baucis-green-800"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('howItWorks')}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-baucis-green-50 rounded-xl">
            <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShoppingBagIcon className="w-5 h-5 text-baucis-green-600" />
            </div>
            <p 
              className="text-baucis-green-800 font-medium text-sm"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('step1Title')}
            </p>
            <p 
              className="text-baucis-green-600 text-xs mt-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('step1Desc')}
            </p>
          </div>
          
          <div className="text-center p-4 bg-baucis-green-50 rounded-xl">
            <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-baucis-green-600" />
            </div>
            <p 
              className="text-baucis-green-800 font-medium text-sm"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('step2Title')}
            </p>
            <p 
              className="text-baucis-green-600 text-xs mt-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('step2Desc')}
            </p>
          </div>
          
          <div className="text-center p-4 bg-baucis-green-50 rounded-xl">
            <div className="w-10 h-10 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-baucis-green-600" />
            </div>
            <p 
              className="text-baucis-green-800 font-medium text-sm"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('step3Title')}
            </p>
            <p 
              className="text-baucis-green-600 text-xs mt-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('step3Desc')}
            </p>
          </div>
        </div>

        {/* Tier Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-baucis-green-100">
                <th className="text-left py-2 text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>{t('tier')}</th>
                <th className="text-left py-2 text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>{t('pointsRequired')}</th>
                <th className="text-left py-2 text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>{t('discount')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ZEN_POINTS_TIERS).map(([key, tier]) => {
                const TIcon = TierIcons[key];
                const rowStyle = tierStyles[key];
                const isCurrentTier = currentTier === key;
                return (
                  <tr 
                    key={key} 
                    className={`border-b border-baucis-green-50 transition-colors ${
                      isCurrentTier 
                        ? `bg-gradient-to-r ${rowStyle?.gradient || 'from-baucis-green-50'} ${rowStyle?.border || ''} border-l-2` 
                        : 'hover:bg-baucis-green-25'
                    }`}
                  >
                    <td className="py-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                      <div className="flex items-center space-x-2">
                        <div className={`p-1 rounded-lg ${rowStyle?.iconBg || 'bg-stone-100'}`}>
                          <TIcon className={`w-4 h-4 ${rowStyle?.accent || 'text-stone-500'}`} />
                        </div>
                        <span className={isCurrentTier ? 'font-medium' : ''}>{tier.name}</span>
                        {isCurrentTier && (
                          <span className="text-xs bg-baucis-green-600 text-white px-2 py-0.5 rounded-full ml-2">
                            {t('current') || 'Current'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {tier.min}+
                    </td>
                    <td className="py-3" style={{ fontFamily: 'Crimson Text, serif' }}>
                      <span className={`px-2 py-0.5 rounded-full text-sm ${
                        tier.discount > 0 
                          ? `${rowStyle?.badge || 'bg-baucis-green-100 text-baucis-green-700'}`
                          : 'text-baucis-green-500'
                      }`}>
                        {tier.discount > 0 ? `${tier.discount}% off` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
