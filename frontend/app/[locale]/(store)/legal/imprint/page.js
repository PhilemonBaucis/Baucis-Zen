import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('imprint.title')} - Baucis Zen`,
    description: t('imprint.metaDescription'),
  };
}

export default async function ImprintPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('imprint.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Company Info */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.company.title')}
          </h2>
          <div className="bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 p-6 rounded-lg border border-baucis-green-100">
            <p className="text-lg font-medium text-baucis-green-800 mb-4">Baucis Zen</p>
            <div className="grid gap-4 text-sm">
              <div>
                <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.company.address')}</p>
                <p className="text-baucis-green-800">[Your Street Address]</p>
                <p className="text-baucis-green-800">[Postal Code] [City]</p>
                <p className="text-baucis-green-800">[Country]</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Contact */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.contact.title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.contact.email')}</p>
              <p className="text-baucis-green-800 font-medium">contact@baucis-zen.com</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.contact.phone')}</p>
              <p className="text-baucis-green-800 font-medium">[Your Phone Number]</p>
            </div>
          </div>
        </section>
        
        {/* Legal Representatives */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.representatives.title')}
          </h2>
          <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
            <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.representatives.managing')}</p>
            <p className="text-baucis-green-800 font-medium">[Managing Director Name]</p>
          </div>
        </section>
        
        {/* Registration */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.registration.title')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.registration.court')}</p>
              <p className="text-baucis-green-800 font-medium">[Registration Court]</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.registration.number')}</p>
              <p className="text-baucis-green-800 font-medium">[Registration Number]</p>
            </div>
          </div>
        </section>
        
        {/* VAT */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.vat.title')}
          </h2>
          <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
            <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('imprint.vat.number')}</p>
            <p className="text-baucis-green-800 font-medium">[VAT Identification Number]</p>
          </div>
        </section>
        
        {/* Dispute Resolution */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('imprint.dispute.title')}
          </h2>
          <div className="space-y-3 text-sm">
            <p>{t('imprint.dispute.para1')}</p>
            <p>{t('imprint.dispute.para2')}</p>
            <a 
              href="https://ec.europa.eu/consumers/odr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-baucis-green-600 hover:text-baucis-green-800 underline"
            >
              https://ec.europa.eu/consumers/odr
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </section>
        
        {/* Note */}
        <section className="bg-baucis-pink-50 p-4 rounded-lg border border-baucis-pink-200">
          <p className="text-sm text-baucis-green-700">
            <strong>{t('imprint.note.title')}:</strong> {t('imprint.note.desc')}
          </p>
        </section>
      </div>
    </div>
  );
}

