'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const CONSENT_KEY = 'baucis_cookie_consent';

export default function CookieConsent() {
  const t = useTranslations('cookies');
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
  });
  
  useEffect(() => {
    setMounted(true);
    
    const checkAndShowBanner = () => {
      try {
        const consent = localStorage.getItem(CONSENT_KEY);
        if (!consent) {
          // Small delay after intro completes
          const timer = setTimeout(() => setShowBanner(true), 500);
          return () => clearTimeout(timer);
        } else {
          const savedPrefs = JSON.parse(consent);
          setPreferences(savedPrefs);
          setShowBanner(false);
        }
      } catch (e) {
        console.warn('Cookie consent localStorage error:', e);
        const timer = setTimeout(() => setShowBanner(true), 500);
        return () => clearTimeout(timer);
      }
    };
    
    // Check if intro animation has already been seen
    try {
      const introSeen = localStorage.getItem('baucis_intro_seen');
      if (introSeen) {
        // Intro already seen, show banner normally (with slight delay)
        const timer = setTimeout(checkAndShowBanner, 1000);
        return () => clearTimeout(timer);
      } else {
        // Intro not seen yet - wait for it to complete
        // Listen for custom event from IntroAnimation
        const handleIntroComplete = () => {
          setTimeout(checkAndShowBanner, 800); // Wait a bit after intro fades
        };
        
        window.addEventListener('intro-animation-complete', handleIntroComplete);
        
        // Fallback: if intro takes too long or doesn't fire event, show after 15s
        const fallbackTimer = setTimeout(checkAndShowBanner, 15000);
        
        return () => {
          window.removeEventListener('intro-animation-complete', handleIntroComplete);
          clearTimeout(fallbackTimer);
        };
      }
    } catch (e) {
      // localStorage blocked, show banner after delay
      const timer = setTimeout(checkAndShowBanner, 2000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) return null;
  
  const saveConsent = (prefs) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    
    // Dispatch event for analytics scripts to listen to
    window.dispatchEvent(new CustomEvent('cookie-consent-update', { detail: prefs }));
  };
  
  const acceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };
  
  const acceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };
  
  const saveCustom = () => {
    saveConsent(preferences);
  };
  
  if (!showBanner) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
        onClick={() => setShowSettings(false)}
      />
      
      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-baucis-green-100 overflow-hidden">
          {!showSettings ? (
            // Main Banner
            <div className="p-6">
              {/* Logo centered at top */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/Baucis Zen - Logo.png" 
                  alt="Baucis Zen" 
                  className="h-10 w-auto"
                />
              </div>
              
              <div className="text-center">
                <h3 
                  className="text-lg text-baucis-green-800 mb-2"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('title')}
                </h3>
                <p 
                  className="text-sm text-baucis-green-600 mb-4 max-w-xl mx-auto"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {t('description')}{' '}
                  <Link href="/legal/privacy" className="underline hover:text-baucis-green-800">
                    {t('learnMore')}
                  </Link>
                </p>
                
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={acceptAll}
                    className="px-5 py-2 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-sm hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105"
                    style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
                  >
                    {t('acceptAll')}
                  </button>
                  <button
                    onClick={acceptEssential}
                    className="px-5 py-2 bg-baucis-green-100 text-baucis-green-700 rounded-full text-sm hover:bg-baucis-green-200 transition-colors"
                    style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
                  >
                    {t('essentialOnly')}
                  </button>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-5 py-2 text-baucis-green-600 hover:text-baucis-green-800 text-sm underline transition-colors"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {t('customize')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Settings Panel
            <div className="p-6">
              {/* Logo centered at top */}
              <div className="flex justify-center mb-4">
                <img 
                  src="/Baucis Zen - Logo.png" 
                  alt="Baucis Zen" 
                  className="h-10 w-auto"
                />
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <h3 
                  className="text-lg text-baucis-green-800"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('settings.title')}
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-baucis-green-500 hover:text-baucis-green-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between p-4 bg-baucis-green-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-baucis-green-800 text-sm">{t('settings.essential.title')}</p>
                      <span className="px-2 py-0.5 bg-baucis-green-600 text-white text-xs rounded">{t('settings.required')}</span>
                    </div>
                    <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('settings.essential.desc')}
                    </p>
                  </div>
                  <div className="w-12 h-6 bg-baucis-green-600 rounded-full flex items-center px-1 cursor-not-allowed">
                    <div className="w-4 h-4 bg-white rounded-full ml-auto" />
                  </div>
                </div>
                
                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-baucis-green-100">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-baucis-green-800 text-sm mb-1">{t('settings.analytics.title')}</p>
                    <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('settings.analytics.desc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                      preferences.analytics ? 'bg-baucis-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.analytics ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
                
                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-baucis-green-100">
                  <div className="flex-1 pr-4">
                    <p className="font-medium text-baucis-green-800 text-sm mb-1">{t('settings.marketing.title')}</p>
                    <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                      {t('settings.marketing.desc')}
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${
                      preferences.marketing ? 'bg-baucis-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences.marketing ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={saveCustom}
                  className="flex-1 px-5 py-2 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white rounded-full text-sm hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all"
                  style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
                >
                  {t('settings.save')}
                </button>
                <button
                  onClick={acceptAll}
                  className="px-5 py-2 bg-baucis-green-100 text-baucis-green-700 rounded-full text-sm hover:bg-baucis-green-200 transition-colors"
                  style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.05em' }}
                >
                  {t('acceptAll')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

