'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

const languages = [
  { code: 'en', name: 'English', country: 'GB' },
  { code: 'de', name: 'Deutsch', country: 'DE' },
  { code: 'fr', name: 'Français', country: 'FR' },
  { code: 'it', name: 'Italiano', country: 'IT' },
  { code: 'es', name: 'Español', country: 'ES' },
  { code: 'tr', name: 'Türkçe', country: 'TR' },
  { code: 'el', name: 'Ελληνικά', country: 'GR' },
  { code: 'sq', name: 'Shqip', country: 'AL' },
];

// Flag component using flagcdn.com for reliable flag images
function Flag({ country, size = 20 }) {
  return (
    <img 
      src={`https://flagcdn.com/w40/${country.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${country.toLowerCase()}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={country}
      className="rounded-sm object-cover"
      style={{ minWidth: size }}
    />
  );
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === locale) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLocale = (newLocale) => {
    const segments = pathname.split('/').filter(Boolean);
    const isFirstSegmentLocale = languages.some(l => l.code === segments[0]);
    
    let newPath;
    if (isFirstSegmentLocale) {
      segments[0] = newLocale;
      newPath = '/' + segments.join('/');
    } else {
      newPath = '/' + newLocale + pathname;
    }
    
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.push(newPath);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Single flag button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all duration-300 group"
        aria-label="Change language"
      >
        <Flag country={currentLang.country} size={20} />
        <svg 
          className={`w-3 h-3 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-lg overflow-hidden z-50 border border-baucis-green-200/30 min-w-[140px]">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLocale(lang.code)}
                className={`w-full flex items-center space-x-2 px-3 py-1.5 transition-all duration-200 ${
                  lang.code === locale 
                    ? 'bg-baucis-green-50 text-baucis-green-700' 
                    : 'text-baucis-green-800 hover:bg-baucis-green-50/50'
                }`}
              >
                <Flag country={lang.country} size={16} />
                <span 
                  className="text-xs font-medium flex-1 text-left"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {lang.name}
                </span>
                {lang.code === locale && (
                  <svg className="w-3 h-3 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
