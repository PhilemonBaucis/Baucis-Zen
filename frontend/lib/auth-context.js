'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useStoreConfig, DEFAULT_CONFIG } from './store-config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Clerk hooks
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerkAuth();
  
  // Store config for Zen Points calculations
  const { calculateTier, getTierInfo, getDaysUntilReset, zenPointsTiers } = useStoreConfig();
  
  // Customer state (synced with Medusa)
  const [customer, setCustomer] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [hasSynced, setHasSynced] = useState(false);

  // Points animation state
  const [pointsDelta, setPointsDelta] = useState(null);

  // Show points animation when points increase
  const showPointsAnimation = useCallback((delta) => {
    if (delta > 0) {
      setPointsDelta(delta);
      // Clear after animation completes (3 seconds)
      setTimeout(() => setPointsDelta(null), 3000);
    }
  }, []);

  // Sync Clerk user with Medusa customer via API
  const syncWithMedusa = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setCustomer(null);
      setHasSynced(false);
      return null;
    }

    // Don't sync again if already synced for this session
    if (hasSynced && customer) {
      return customer;
    }

    setSyncLoading(true);
    setSyncError(null);

    try {
      // Get cart ID from localStorage
      const cartId = typeof window !== 'undefined' 
        ? localStorage.getItem('baucis_cart_id') 
        : null;

      // Call our sync API
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cartId }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync with server');
      }

      const data = await response.json();

      if (data.success && data.customer) {
        setCustomer(data.customer);
        setHasSynced(true);
        
        // Dispatch event for cart context to pick up
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customer-synced', { 
            detail: { customer: data.customer, cartId: data.cartId } 
          }));
        }
        
        return data.customer;
      } else {
        throw new Error(data.error || 'Sync failed');
      }

    } catch (error) {
      console.error('Failed to sync with Medusa:', error);
      setSyncError(error.message);
      
      // Fallback to Clerk data only
      const fallbackCustomer = {
        id: `clerk_${clerkUser.id}`,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        first_name: clerkUser.firstName || '',
        last_name: clerkUser.lastName || '',
        phone: clerkUser.primaryPhoneNumber?.phoneNumber || '',
        metadata: {
          clerk_id: clerkUser.id,
          zen_points: {
            current_balance: 0,
            tier: 'seed',
            discount_percent: 0,
            cycle_start_date: new Date().toISOString(),
            lifetime_points: 0,
          },
        },
        has_account: true,
        clerk_id: clerkUser.id,
      };
      setCustomer(fallbackCustomer);
      return fallbackCustomer;
    } finally {
      setSyncLoading(false);
    }
  }, [isSignedIn, clerkUser, hasSynced, customer]);

  // Trigger animation with known points delta
  // Takes pointsAwarded for animation, and newBalance from API for accurate state update
  const triggerPointsAnimation = useCallback((pointsAwarded, newBalance = null) => {
    if (pointsAwarded > 0) {
      console.log('[ZenPoints] Triggering animation for +' + pointsAwarded + ' points, new balance:', newBalance);
      showPointsAnimation(pointsAwarded);

      // Update customer state with the actual balance from API (not additive)
      if (newBalance !== null) {
        setCustomer(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            metadata: {
              ...prev.metadata,
              zen_points: {
                ...prev.metadata?.zen_points,
                current_balance: newBalance,
              },
            },
          };
        });
      }

      // Also refresh from server after delay to ensure full sync
      setTimeout(async () => {
        try {
          const cartId = typeof window !== 'undefined'
            ? localStorage.getItem('baucis_cart_id')
            : null;
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cartId }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.customer) {
              console.log('[ZenPoints] Server refresh, balance:', data.customer?.metadata?.zen_points?.current_balance);
              setCustomer(data.customer);
              setHasSynced(true);
            }
          }
        } catch (error) {
          console.error('Failed to refresh customer after points animation:', error);
        }
      }, 3000);
    }
  }, [showPointsAnimation]);

  // Sync when Clerk user signs in
  useEffect(() => {
    if (clerkLoaded) {
      if (isSignedIn && clerkUser) {
        syncWithMedusa();
      } else {
        setCustomer(null);
        setHasSynced(false);
      }
    }
  }, [clerkLoaded, isSignedIn, clerkUser?.id]); // Only re-run when user ID changes

  const logout = useCallback(async () => {
    try {
      // Clear customer state first
      setCustomer(null);
      setHasSynced(false);
      
      // Sign out from Clerk
      await clerkSignOut();
      
      // Dispatch event for cart context
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('customer-signed-out'));
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [clerkSignOut]);

  const refreshCustomer = useCallback(async () => {
    // Store current points before refresh
    const previousPoints = customer?.metadata?.zen_points?.current_balance || 0;

    setHasSynced(false);
    const refreshedCustomer = await syncWithMedusa();

    // Check if points increased and show animation
    if (refreshedCustomer) {
      const newPoints = refreshedCustomer?.metadata?.zen_points?.current_balance || 0;
      const delta = newPoints - previousPoints;
      if (delta > 0) {
        showPointsAnimation(delta);
      }
    }

    return refreshedCustomer;
  }, [syncWithMedusa, customer?.metadata?.zen_points?.current_balance, showPointsAnimation]);

  // Update customer state directly (for immediate UI updates after saves)
  const updateCustomer = useCallback((updatedCustomer) => {
    if (updatedCustomer) {
      setCustomer(prev => ({
        ...prev,
        ...updatedCustomer,
        metadata: {
          ...prev?.metadata,
          ...updatedCustomer.metadata,
        },
      }));
    }
  }, []);

  // Computed values for Zen Points (using store config)
  const zenPoints = customer?.metadata?.zen_points || null;
  const currentTier = zenPoints ? calculateTier(zenPoints.current_balance) : 'seed';
  const tierInfo = getTierInfo(currentTier);
  const daysUntilReset = zenPoints ? getDaysUntilReset(zenPoints.cycle_start_date) : 30;

  const value = {
    // Customer state
    customer,
    loading: !clerkLoaded || syncLoading,
    isLoggedIn: isSignedIn && !!clerkUser,

    // Clerk user for advanced usage
    clerkUser,

    // Auth actions
    logout,
    refreshCustomer,
    updateCustomer,
    syncWithMedusa,

    // Sync state
    syncError,
    hasSynced,

    // Zen Points
    zenPoints,
    currentTier,
    tierInfo,
    daysUntilReset,

    // Zen Points animation
    pointsDelta,
    showPointsAnimation,
    triggerPointsAnimation,

    // Zen Points config (for components that need full tier info)
    zenPointsTiers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export from store-config for backwards compatibility
// Components should migrate to using useStoreConfig() or useAuth().zenPointsTiers
export { DEFAULT_CONFIG };
export const ZEN_POINTS_TIERS = DEFAULT_CONFIG.zenPoints.tiers;
export const POINTS_PER_EURO = DEFAULT_CONFIG.zenPoints.pointsPerEuro;
