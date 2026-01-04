import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import LegalNav from '@/components/legal/LegalNav';

export default async function LegalLayout({ children, params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-baucis-pink-50">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-baucis-green-700 to-baucis-green-800 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/"
            className="inline-flex items-center text-baucis-green-200 hover:text-white transition-colors mb-4 text-sm"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToStore')}
          </Link>
          <h1 
            className="text-3xl md:text-4xl text-white"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('title')}
          </h1>
          <p 
            className="text-baucis-green-200 mt-2"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('subtitle')}
          </p>
        </div>
      </div>
      
      {/* Navigation + Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Navigation - Client Component for active state */}
        <LegalNav />
        
        {/* Page Content */}
        <article className="prose prose-green max-w-none">
          {children}
        </article>
        
        {/* Last Updated */}
        <div className="mt-12 pt-6 border-t border-baucis-green-100">
          <p 
            className="text-xs text-baucis-green-500"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('lastUpdated')}: December 2025
          </p>
        </div>
      </div>
    </div>
  );
}

