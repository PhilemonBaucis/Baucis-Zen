'use client';

import { useState, useEffect } from 'react';
import IntroAnimation from '@/components/ui/IntroAnimation';

export default function StoreWrapper({ children }) {
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false); // Start as false - content hidden
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if user has seen the intro before
    try {
      const hasSeenIntro = localStorage.getItem('baucis_intro_seen');
      
      if (!hasSeenIntro) {
        // First time visitor - show intro
        setShowIntro(true);
        setIntroComplete(false);
      } else {
        // Returning visitor - skip intro, show content
        setShowIntro(false);
        setIntroComplete(true);
      }
    } catch (e) {
      // localStorage might be blocked, skip intro
      setShowIntro(false);
      setIntroComplete(true);
    }
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    setIntroComplete(true);
  };

  // Before mounting, show nothing (prevents flash of content)
  if (!mounted) {
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: '#ffffff',
        zIndex: 99999 
      }} />
    );
  }

  return (
    <>
      {/* Intro Animation Overlay */}
      {showIntro && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}

      {/* Main Content - fades in after intro */}
      <div 
        className={`transition-opacity duration-500 
          ${introComplete ? 'opacity-100' : 'opacity-0'}`}
      >
        {children}
      </div>
    </>
  );
}

