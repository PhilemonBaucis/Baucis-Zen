'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';

/**
 * DEV TOOL: Set Zen Points for testing different tiers
 * Updates actual Medusa metadata when DEV_SECRET is configured
 * Only renders in development mode AND when user is logged in on account pages
 */
export default function ZenPointsDevTool() {
  const { zenPoints, isLoggedIn, customer, updateCustomer, refreshCustomer } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Only show when logged in
  if (!isLoggedIn || !customer) {
    return null;
  }

  // Only show on account pages
  const isAccountPage = pathname?.includes('/account');
  if (!isAccountPage) {
    return null;
  }

  const setPoints = async (points) => {
    setLoading(true);
    setMessage('');
    
    const tier = points >= 500 ? 'lotus' : 
                 points >= 250 ? 'blossom' : 
                 points >= 100 ? 'sprout' : 'seed';
    
    try {
      const response = await fetch('/api/admin/zen-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state immediately
        updateCustomer({
          metadata: {
            zen_points: {
              current_balance: points,
              lifetime_earned: points,
              cycle_start_date: new Date().toISOString(),
            }
          }
        });
        setMessage(`✓ ${tier}`);
        
        // Refresh from backend
        await refreshCustomer();
      } else {
        setMessage(`✗ ${data.error}`);
      }
    } catch (err) {
      setMessage(`✗ Error`);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const presets = [
    { label: 'Seed', points: 0, color: 'bg-gray-500' },
    { label: 'Sprout', points: 100, color: 'bg-emerald-500' },
    { label: 'Blossom', points: 250, color: 'bg-pink-500' },
    { label: 'Lotus', points: 500, color: 'bg-amber-500' },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl max-w-[180px] border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-yellow-400">🛠 SET POINTS</span>
        <span className="text-sm font-bold text-emerald-400">
          {zenPoints?.current_balance ?? 0}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map(({ label, points, color }) => (
          <button
            key={points}
            onClick={() => setPoints(points)}
            disabled={loading}
            className={`${color} hover:opacity-80 disabled:opacity-50 text-white text-[10px] py-1 px-1.5 rounded transition-opacity`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <p className={`text-[10px] mt-1.5 text-center ${message.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
      
      {loading && (
        <p className="text-[10px] mt-1.5 text-gray-400 text-center animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
}

