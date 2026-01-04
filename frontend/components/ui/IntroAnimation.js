'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Spline from '@splinetool/react-spline';

// Spline scene URL
// R2: https://pub-c38e558a5a5e4ecdbce8dfd1e185a8fe.r2.dev/spline/baucis_tin_/public/scene.splinecode
// Note: R2 requires CORS configuration. Using Spline CDN until CORS is set up.
const SPLINE_SCENE_URL = process.env.NEXT_PUBLIC_SPLINE_INTRO_URL || 
  'https://prod.spline.design/WaQq94a9PKQnK95i/scene.splinecode';

// Animation duration in milliseconds (7.5 seconds)
const ANIMATION_DURATION = 8000;

// Base resolution for scaling reference
const BASE_WIDTH = 1920;

export default function IntroAnimation({ onComplete }) {
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [showSkip, setShowSkip] = useState(false);
  const t = useTranslations('intro');

  // Show skip button after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Zoom out more on smaller screens
  useEffect(() => {
    const calculateZoom = () => {
      const width = window.innerWidth;
      if (width < BASE_WIDTH) {
        // Scale down for smaller screens
        // At 1280px: ~0.55, at 1024px: ~0.43, at 768px: ~0.33
        const ratio = width / BASE_WIDTH;
        const scale = 0.2 + ratio * ratio * 0.8; // Quadratic with base
        setZoomScale(Math.min(1, Math.max(0.3, scale)));
      } else {
        setZoomScale(1);
      }
    };

    calculateZoom();
    window.addEventListener('resize', calculateZoom);
    return () => window.removeEventListener('resize', calculateZoom);
  }, []);

  // Fallback: if loading takes too long, auto-complete
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.warn('Spline intro timeout - completing automatically');
      try {
        localStorage.setItem('baucis_intro_seen', 'true');
      } catch (e) {}
      setFadeOut(true);
      setTimeout(() => {
        onComplete?.();
        window.dispatchEvent(new CustomEvent('intro-animation-complete'));
      }, 600);
    }, 12000); // 12 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    // Mark as seen in localStorage
    try {
      localStorage.setItem('baucis_intro_seen', 'true');
      localStorage.setItem('baucis_intro_seen_at', new Date().toISOString());
    } catch (e) {
      // localStorage might be blocked
    }

    // Start fade out
    setFadeOut(true);

    // Call onComplete after fade animation
    setTimeout(() => {
      onComplete?.();
      
      // Dispatch event for CookieConsent to show
      window.dispatchEvent(new CustomEvent('intro-animation-complete'));
    }, 600);
  }, [onComplete]);

  const handleSplineLoad = useCallback(() => {
    // Small delay to let the animation start before showing
    // This prevents the static first frame from being visible
    setTimeout(() => {
      setIsLoading(false);
    }, 200);
    
    // Auto-complete after animation duration
    setTimeout(handleComplete, ANIMATION_DURATION + 200);
  }, [handleComplete]);

  const handleSplineError = useCallback((error) => {
    console.error('Spline failed to load:', error);
    setHasError(true);
    setIsLoading(false);
    // Auto-complete after a brief moment so user sees something
    setTimeout(handleComplete, 1500);
  }, [handleComplete]);

  // Get the background color from Spline scene (match your animation's background)
  const splineBackground = '#ffffff'; // Change this to match your Spline scene background
  
  return (
    <div 
      className={`fixed inset-0 z-[9999] transition-opacity duration-700 ease-out overflow-hidden
        ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ margin: 0, padding: 0, backgroundColor: splineBackground }}
    >
      {/* Spline 3D Scene - always full screen on all devices */}
      {!hasError ? (
        <div
          className="transition-opacity duration-500 ease-in"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${zoomScale})`,
            // Make container larger to compensate for zoom out
            width: `max(${100 / zoomScale}vw, ${177.78 / zoomScale}vh)`,
            height: `max(${100 / zoomScale}vh, ${56.25 / zoomScale}vw)`,
            minWidth: `${100 / zoomScale}vw`,
            minHeight: `${100 / zoomScale}vh`,
            // Fade in after load to hide initial static frame
            opacity: isLoading ? 0 : 1,
          }}
        >
          <Spline
            scene={SPLINE_SCENE_URL}
            onLoad={handleSplineLoad}
            onError={handleSplineError}
            style={{ 
              width: '100%',
              height: '100%',
            }}
          />
        </div>
      ) : (
        /* Fallback if Spline fails - show logo */
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/Baucis Zen - Logo.svg" 
            alt="Baucis Zen" 
            className="w-48 h-48 opacity-80 animate-pulse"
          />
        </div>
      )}

      {/* Skip Intro Button - appears after delay */}
      {showSkip && !isLoading && (
        <button
          onClick={handleComplete}
          className="fixed bottom-8 right-8 group
            px-6 py-3 rounded-full
            bg-baucis-green-600 
            shadow-xl shadow-baucis-green-900/30
            hover:bg-baucis-green-700 hover:scale-105
            transition-all duration-300 ease-out
            animate-fade-in"
          style={{ zIndex: 99999 }}
        >
          <span 
            className="flex items-center gap-2 text-white"
            style={{ fontFamily: 'Libre Baskerville, serif', fontSize: '0.9rem', letterSpacing: '0.05em' }}
          >
            {t('skip')}
            <svg 
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
