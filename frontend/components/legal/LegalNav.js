'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LegalNav() {
  const pathname = usePathname();
  const t = useTranslations('legal');
  
  const legalLinks = [
    { href: '/legal/privacy', label: t('nav.privacy') },
    { href: '/legal/terms', label: t('nav.terms') },
    { href: '/legal/imprint', label: t('nav.imprint') },
    { href: '/legal/withdrawal', label: t('nav.withdrawal') },
    { href: '/legal/shipping', label: t('nav.shipping') },
    { href: '/legal/returns', label: t('nav.returns') },
  ];
  
  // Check if current path matches link (handles locale prefix)
  const isActive = (href) => {
    return pathname.endsWith(href) || pathname.includes(href + '/');
  };
  
  return (
    <nav className="mb-8 pb-6 border-b border-baucis-green-100">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
        {legalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 text-xs text-center rounded-full border transition-all duration-200 ${
              isActive(link.href)
                ? 'bg-baucis-green-600 border-baucis-green-600 text-white shadow-md'
                : 'border-baucis-green-200 text-baucis-green-700 hover:bg-baucis-green-50 hover:border-baucis-green-300'
            }`}
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

