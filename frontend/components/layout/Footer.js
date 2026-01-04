'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  
  return (
    <footer className="bg-baucis-green-800 text-white py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="/Baucis Zen - Logo.png" 
            alt="BAUCIS ZEN" 
            className="h-10 w-auto"
          />
          <p 
            className="text-baucis-green-200/40 text-[10px] tracking-[0.25em] uppercase"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            MINIMAL RITUALS — TIMELESS DETAILS
          </p>

          {/* Social Links */}
          <div className="flex items-center space-x-2 pt-1">
            <a 
              href="#" 
              className="w-8 h-8 rounded-full bg-baucis-green-700/50 hover:bg-baucis-green-600 flex items-center justify-center transition-all duration-300"
              aria-label="Instagram"
            >
              <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="w-8 h-8 rounded-full bg-baucis-green-700/50 hover:bg-baucis-green-600 flex items-center justify-center transition-all duration-300"
              aria-label="TikTok"
            >
              <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
            <a 
              href="#" 
              className="w-8 h-8 rounded-full bg-baucis-green-700/50 hover:bg-baucis-green-600 flex items-center justify-center transition-all duration-300"
              aria-label="YouTube"
            >
              <svg className="w-3.5 h-3.5 text-white/70" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </a>
          </div>
          
          {/* Legal Links - Grid for aligned separators */}
          <div className="pt-3 hidden sm:block">
            <div className="grid grid-cols-5 gap-y-2 items-center" style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr' }}>
              {/* Row 1 */}
              <Link 
                href="/legal/privacy" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('privacy')}
              </Link>
              <span className="text-baucis-green-200/20 px-3 text-center">|</span>
              <Link 
                href="/legal/terms" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('terms')}
              </Link>
              <span className="text-baucis-green-200/20 px-3 text-center">|</span>
              <Link 
                href="/legal/withdrawal" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('withdrawal')}
              </Link>
              
              {/* Row 2 */}
              <Link 
                href="/legal/shipping" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('shipping')}
              </Link>
              <span className="text-baucis-green-200/20 px-3 text-center">|</span>
              <Link 
                href="/legal/returns" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('returns')}
              </Link>
              <span className="text-baucis-green-200/20 px-3 text-center">|</span>
              <Link 
                href="/legal/imprint" 
                className="text-baucis-green-200/50 hover:text-baucis-green-200/80 transition-colors duration-300 text-[10px] text-center"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('imprint')}
              </Link>
            </div>
          </div>
          
          {/* Legal Links - Mobile (stacked) */}
          <div className="pt-3 sm:hidden flex flex-col items-center gap-1">
            <Link href="/legal/privacy" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('privacy')}</Link>
            <Link href="/legal/terms" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('terms')}</Link>
            <Link href="/legal/withdrawal" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('withdrawal')}</Link>
            <Link href="/legal/shipping" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('shipping')}</Link>
            <Link href="/legal/returns" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('returns')}</Link>
            <Link href="/legal/imprint" className="text-baucis-green-200/50 hover:text-baucis-green-200/80 text-[10px]" style={{ fontFamily: 'Crimson Text, serif' }}>{t('imprint')}</Link>
          </div>
          
          {/* Copyright */}
          <p 
            className="text-baucis-green-200/30 text-[10px] pt-2"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            © 2025 Baucis Zen. {t('rights')}.
          </p>
        </div>
      </div>
    </footer>
  );
}
