'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function PromoBanner() {
  const pathname = usePathname();
  const t = useTranslations('promo');
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Hide only on legal pages
  const isLegal = pathname?.includes('/legal');
  
  // Sync visibility with scroll - exactly like header
  useEffect(() => {
    const handleScroll = (e) => {
      const target = e.target;
      const currentScrollY = target.scrollTop !== undefined ? target.scrollTop : window.scrollY;
      
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, []);
  
  if (isLegal) {
    return null;
  }

  return (
    <div 
      className={`fixed left-0 right-0 z-40 overflow-hidden transition-all duration-300 ${
        isVisible ? 'top-12 opacity-100' : '-top-8 opacity-0'
      }`}
      style={{
        background: 'linear-gradient(90deg, #fcd34d 0%, #fef3c7 50%, #fcd34d 100%)',
      }}
    >
      <div className="flex animate-marquee whitespace-nowrap py-1 relative">
        {/* First set of messages */}
        <div className="flex items-center shrink-0">
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            {t('freeShipping')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            {t('discount')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
        </div>
        {/* Duplicate for seamless loop */}
        <div className="flex items-center shrink-0">
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            {t('freeShipping')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            {t('discount')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
        </div>
        {/* Third duplicate for extra wide screens */}
        <div className="flex items-center shrink-0">
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            {t('freeShipping')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
          <span 
            className="mx-5 flex items-center gap-1 text-[11px] font-medium"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.02em', color: '#5a7448' }}
          >
            <svg className="w-3 h-3" style={{ color: '#6a8a55' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            {t('discount')}
          </span>
          <span style={{ color: '#7ca163' }} className="text-[10px]">✦</span>
        </div>
      </div>
    </div>
  );
}
