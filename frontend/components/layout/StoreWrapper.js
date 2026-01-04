'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import IntroAnimation from '@/components/ui/IntroAnimation';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Detect mobile/touch devices with comprehensive checks
function isMobileDevice() {
  if (typeof window === 'undefined') return false;

  // Check for touch support
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0;

  // Check for coarse pointer (touch)
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Check for small screen
  const isSmallScreen = window.innerWidth < 768;

  // Check user agent for mobile patterns
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Return true if any strong mobile indicator is present
  return hasCoarsePointer || (hasTouch && isSmallScreen) || mobileUA;
}

// Detect low-power or problematic conditions
function shouldSkipIntro() {
  if (typeof window === 'undefined') return true;

  // Always skip on mobile for reliability
  if (isMobileDevice()) return true;

  // Check for reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

  // Check for low memory
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return true;

  // Check for slow connection
  if (navigator.connection) {
    const conn = navigator.connection;
    if (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
      return true;
    }
  }

  return false;
}

export default function StoreWrapper({ children }) {
  // CRITICAL: Start with introComplete=true for SSR to prevent blank screen
  // This ensures content is visible even if JavaScript is slow to hydrate
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(true); // Changed: default to true for SSR safety
  const [mounted, setMounted] = useState(false);
  const failsafeTimerRef = useRef(null);
  const mountTimerRef = useRef(null);

  // Force complete intro - used as failsafe
  const forceCompleteIntro = useCallback(() => {
    console.log('[StoreWrapper] Force completing intro');
    setShowIntro(false);
    setIntroComplete(true);
    try {
      localStorage.setItem('baucis_intro_seen', 'true');
    } catch (e) {}
  }, []);

  useEffect(() => {
    // Mark as mounted immediately
    setMounted(true);

    // Failsafe: Ensure content is visible after 2 seconds regardless
    mountTimerRef.current = setTimeout(() => {
      if (!introComplete) {
        console.log('[StoreWrapper] Mount failsafe triggered');
        setIntroComplete(true);
        setShowIntro(false);
      }
    }, 2000);

    // Check if we should show intro
    try {
      const hasSeenIntro = localStorage.getItem('baucis_intro_seen');

      if (!hasSeenIntro && !shouldSkipIntro()) {
        // First-time desktop visitor - show intro
        console.log('[StoreWrapper] First visit on desktop - showing intro');
        setShowIntro(true);
        setIntroComplete(false);
      } else if (!hasSeenIntro) {
        // Mobile/low-power - skip intro but mark as seen
        console.log('[StoreWrapper] Skipping intro (mobile/low-power)');
        localStorage.setItem('baucis_intro_seen', 'true');
        setShowIntro(false);
        setIntroComplete(true);
      } else {
        // Returning visitor - content already visible (introComplete defaulted to true)
        console.log('[StoreWrapper] Returning visitor');
        setShowIntro(false);
        setIntroComplete(true);
      }
    } catch (e) {
      // localStorage might be blocked, show content immediately
      console.log('[StoreWrapper] localStorage error, showing content');
      setShowIntro(false);
      setIntroComplete(true);
    }

    return () => {
      if (mountTimerRef.current) clearTimeout(mountTimerRef.current);
    };
  }, []);

  // Failsafe: If intro is showing but hasn't completed after 8 seconds, force complete
  // This prevents the site from being stuck on a blank screen
  useEffect(() => {
    if (showIntro && !introComplete) {
      failsafeTimerRef.current = setTimeout(() => {
        console.warn('[StoreWrapper] Failsafe triggered - intro took too long');
        forceCompleteIntro();
      }, 8000);
    }

    return () => {
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
      }
    };
  }, [showIntro, introComplete, forceCompleteIntro]);

  const handleIntroComplete = useCallback(() => {
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current);
    }
    setShowIntro(false);
    setIntroComplete(true);
  }, []);

  // Handle ErrorBoundary fallback triggering completion
  const handleErrorFallback = useCallback(() => {
    console.log('[StoreWrapper] ErrorBoundary fallback triggered');
    // Auto-complete after a short delay on error fallback
    setTimeout(() => {
      forceCompleteIntro();
    }, 1500);
  }, [forceCompleteIntro]);

  // CRITICAL: Always render children for SSR compatibility
  // On mobile/SSR, content should be visible immediately without waiting for mount
  // We no longer block rendering until mount - instead we show content with a subtle fade

  return (
    <>
      {/* Intro Animation Overlay - wrapped in ErrorBoundary to handle Spline failures gracefully */}
      {showIntro && (
        <ErrorBoundary
          fallback={
            // If Spline/IntroAnimation fails, show clickable logo and auto-complete
            <div
              className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
              onClick={handleIntroComplete}
              ref={(el) => el && handleErrorFallback()}
            >
              <img
                src="/Baucis Zen - Logo.svg"
                alt="Baucis Zen"
                className="w-32 h-32 opacity-80 animate-pulse cursor-pointer"
              />
            </div>
          }
        >
          <IntroAnimation onComplete={handleIntroComplete} />
        </ErrorBoundary>
      )}

      {/* Main Content - always visible for SSR, fades in nicely after intro on desktop */}
      {/* CRITICAL: data-content-loaded is set immediately to prevent CSS spinner on SSR */}
      {/* CRITICAL: On mobile, we force opacity:1 via inline style to prevent blank screens */}
      <div
        data-content-loaded="true"
        className={`transition-opacity duration-500
          ${introComplete ? 'opacity-100' : 'opacity-0'}`}
        style={{
          // Ensure content is interactive even during fade
          pointerEvents: 'auto',
          // CRITICAL: Force visibility on mobile - CSS media query in globals.css also handles this
          // but inline style as backup for edge cases
          ...(mounted && isMobileDevice() ? { opacity: 1, visibility: 'visible' } : {}),
        }}
      >
        {children}
      </div>
    </>
  );
}

