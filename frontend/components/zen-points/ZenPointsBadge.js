'use client';

import Link from 'next/link';
import { useAuth, ZEN_POINTS_TIERS } from '@/lib/auth-context';

// Tier icons as SVG components
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

export default function ZenPointsBadge() {
  const { isLoggedIn, customer, currentTier, daysUntilReset, loading, pointsDelta } = useAuth();

  // Don't show if not logged in or still loading
  if (!isLoggedIn || loading) return null;

  const zenPoints = customer?.metadata?.zen_points;
  const points = zenPoints?.current_balance || 0;
  const tierInfo = ZEN_POINTS_TIERS[currentTier] || ZEN_POINTS_TIERS.seed;

  // Tier colors
  const tierStyles = {
    seed: {
      bg: 'bg-baucis-pink-500/20',
      text: 'text-baucis-pink-200',
      icon: 'text-baucis-pink-300',
    },
    sprout: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      icon: 'text-emerald-400',
    },
    blossom: {
      bg: 'bg-pink-500/20',
      text: 'text-pink-300',
      icon: 'text-pink-400',
    },
    lotus: {
      bg: 'bg-amber-400/20',
      text: 'text-amber-200',
      icon: 'text-amber-300',
    },
  };

  const style = tierStyles[currentTier] || tierStyles.seed;
  const TierIcon = TierIcons[currentTier] || TierIcons.seed;

  return (
    <Link
      href="/account"
      className={`relative flex items-center space-x-1.5 pr-2.5 pl-3 py-1 rounded-full ${style.bg} hover:opacity-80 transition-opacity`}
      title={`${points} Zen Points • ${tierInfo.name} tier • ${tierInfo.discount}% off • Resets in ${daysUntilReset} days`}
    >
      <TierIcon className={`w-4 h-4 ${style.icon}`} />
      <span
        className={`text-xs font-medium ${style.text}`}
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {points}
      </span>

      {/* Points increase animation */}
      {pointsDelta && pointsDelta > 0 && (
        <span
          key={`points-${Date.now()}`}
          className="absolute -top-4 -right-2 font-bold text-base pointer-events-none"
          style={{
            fontFamily: 'Libre Baskerville, serif',
            animation: 'zenPointsFloat 2.5s ease-out forwards',
            color: '#fbbf24',
            textShadow: '0 0 10px rgba(251, 191, 36, 0.7), 0 0 20px rgba(251, 191, 36, 0.4), 0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          +{pointsDelta}
        </span>
      )}

      <style jsx global>{`
        @keyframes zenPointsFloat {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-12px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateY(-24px) scale(0.9);
          }
        }
      `}</style>
    </Link>
  );
}
