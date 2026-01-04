import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'maintenance' });
  
  return {
    title: `${t('title')} | Baucis Zen`,
  };
}

export default async function MaintenancePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations('maintenance');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-baucis-pink-50 via-white to-baucis-green-50">
      <div className="text-center px-4">
        <div className="w-24 h-24 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg 
            className="w-12 h-12 text-baucis-green-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
        </div>
        
        <h1 
          className="text-3xl md:text-4xl text-baucis-green-800 mb-4"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {t('title')}
        </h1>
        
        <p 
          className="text-baucis-green-600 text-lg mb-2"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('message')}
        </p>
        
        <p 
          className="text-baucis-green-500"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('checkBack')}
        </p>
        
        <div className="mt-8">
          <img 
            src="/Baucis Zen - Logo.svg" 
            alt="Baucis Zen" 
            className="h-8 w-auto mx-auto opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

