'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function ChatMascot({ onClick }) {
  const t = useTranslations('chat');
  const [mounted, setMounted] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Ensure component only renders dynamic content after mounting (fixes hydration)
  useEffect(() => {
    setMounted(true);
    setShowTooltip(true);
  }, []);
  
  // Winking animation loop - wink every 4 seconds
  useEffect(() => {
    if (!mounted) return;
    const winkInterval = setInterval(() => {
      setIsWinking(true);
      setTimeout(() => setIsWinking(false), 200);
    }, 4000);
    
    return () => clearInterval(winkInterval);
  }, [mounted]);
  
  // Wave animation loop - wave every 3 seconds
  useEffect(() => {
    if (!mounted) return;
    const waveInterval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 3000);
    
    return () => clearInterval(waveInterval);
  }, [mounted]);
  
  // Tooltip visibility - show initially, then periodically
  useEffect(() => {
    if (!mounted) return;
    const hideTimer = setTimeout(() => setShowTooltip(false), 5000);
    
    const showInterval = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 3000);
    }, 15000);
    
    return () => {
      clearTimeout(hideTimer);
      clearInterval(showInterval);
    };
  }, [mounted]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) return null;

  const tooltipClasses = showTooltip 
    ? 'opacity-100 translate-y-0 scale-100' 
    : 'opacity-0 translate-y-2 scale-95 pointer-events-none';

  const waveClasses = isWaving 
    ? 'animate-[wave_0.5s_ease-in-out_2]' 
    : '';
  
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Simple speech bubble tooltip */}
      <div className={`bg-white rounded-2xl shadow-lg px-4 py-3 mr-4 transition-all duration-300 transform relative ${tooltipClasses}`}>
        <p 
          className="text-sm text-baucis-green-800"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {t('zenGreeting')}
        </p>
        <p 
          className="text-xs text-baucis-green-600 mt-0.5"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('zenSubtext')}
        </p>
        {/* Speech bubble tail */}
        <div className="absolute -bottom-2 right-10 w-4 h-4 bg-white shadow-lg transform rotate-45" />
      </div>
      
      {/* Mascot button - with white background for visibility */}
      <button
        onClick={onClick}
        className="relative w-28 h-28 cursor-pointer hover:scale-105 transition-transform duration-300 focus:outline-none focus:ring-4 focus:ring-baucis-green-300 focus:ring-offset-2 rounded-full animate-[mascotFloat_3s_ease-in-out_infinite] group"
        aria-label={t('openChat')}
      >
        {/* Glow effect on hover - brand green */}
        <div className="absolute inset-0 rounded-full bg-baucis-green-400/20 blur-xl scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* White background circle for visibility on images */}
        <div className="absolute inset-2 bg-white rounded-full shadow-lg" />
        
        {/* Shadow/ground effect */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/10 rounded-full blur-sm" />
        
        {/* Base body - Image 1 */}
        <div className="absolute inset-0 z-10">
          <Image
            src="/Chat/1.png"
            alt="Baucis Zen Support"
            fill
            className="object-contain drop-shadow-2xl"
            priority
            sizes="112px"
          />
        </div>
        
        {/* Eyes layer - toggle between open (3.png) and closed (4.png) */}
        <div className="absolute inset-0 z-10">
          <Image
            src={isWinking ? "/Chat/4.png" : "/Chat/3.png"}
            alt=""
            fill
            className="object-contain"
            sizes="112px"
          />
        </div>
        
        {/* Waving arm - Image 2 */}
        <div className={`absolute inset-0 z-10 transition-transform duration-300 origin-[60%_70%] ${waveClasses}`}>
          <Image
            src="/Chat/2.png"
            alt=""
            fill
            className="object-contain"
            sizes="112px"
          />
        </div>
      </button>
    </div>
  );
}
