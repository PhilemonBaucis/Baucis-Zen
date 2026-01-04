import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('privacy.title')} - Baucis Zen`,
    description: t('privacy.metaDescription'),
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('privacy.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Introduction */}
        <section>
          <p className="text-base leading-relaxed">
            {t('privacy.intro')}
          </p>
        </section>
        
        {/* Data Controller */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.controller.title')}
          </h2>
          <div className="bg-baucis-green-50 p-4 rounded-lg border border-baucis-green-100">
            <p className="font-medium text-baucis-green-800">Baucis Zen</p>
            <p className="text-sm mt-1">{t('privacy.controller.note')}</p>
          </div>
        </section>
        
        {/* Data We Collect */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.collect.title')}
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-baucis-green-800 mb-2">{t('privacy.collect.account.title')}</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>{t('privacy.collect.account.item1')}</li>
                <li>{t('privacy.collect.account.item2')}</li>
                <li>{t('privacy.collect.account.item3')}</li>
                <li>{t('privacy.collect.account.item4')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-baucis-green-800 mb-2">{t('privacy.collect.order.title')}</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>{t('privacy.collect.order.item1')}</li>
                <li>{t('privacy.collect.order.item2')}</li>
                <li>{t('privacy.collect.order.item3')}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-baucis-green-800 mb-2">{t('privacy.collect.technical.title')}</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>{t('privacy.collect.technical.item1')}</li>
                <li>{t('privacy.collect.technical.item2')}</li>
                <li>{t('privacy.collect.technical.item3')}</li>
              </ul>
            </div>
          </div>
        </section>
        
        {/* How We Use Data */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.use.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('privacy.use.item1')}</li>
            <li>{t('privacy.use.item2')}</li>
            <li>{t('privacy.use.item3')}</li>
            <li>{t('privacy.use.item4')}</li>
            <li>{t('privacy.use.item5')}</li>
          </ul>
        </section>
        
        {/* Third Parties */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.thirdParties.title')}
          </h2>
          <p className="mb-3 text-sm">{t('privacy.thirdParties.intro')}</p>
          <div className="grid gap-3">
            {['clerk', 'cloudflare', 'vercel', 'railway', 'ultra'].map((provider) => (
              <div key={provider} className="bg-white p-3 rounded border border-baucis-green-100">
                <p className="font-medium text-baucis-green-800 text-sm">{t(`privacy.thirdParties.${provider}.name`)}</p>
                <p className="text-xs text-baucis-green-600 mt-1">{t(`privacy.thirdParties.${provider}.purpose`)}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* Cookies */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.cookies.title')}
          </h2>
          <p className="mb-3 text-sm">{t('privacy.cookies.intro')}</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-baucis-green-50 rounded">
              <span className="px-2 py-0.5 bg-baucis-green-600 text-white text-xs rounded">{t('privacy.cookies.essential.badge')}</span>
              <div>
                <p className="font-medium text-sm text-baucis-green-800">{t('privacy.cookies.essential.title')}</p>
                <p className="text-xs text-baucis-green-600">{t('privacy.cookies.essential.desc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-baucis-pink-50 rounded">
              <span className="px-2 py-0.5 bg-baucis-pink-500 text-white text-xs rounded">{t('privacy.cookies.analytics.badge')}</span>
              <div>
                <p className="font-medium text-sm text-baucis-green-800">{t('privacy.cookies.analytics.title')}</p>
                <p className="text-xs text-baucis-green-600">{t('privacy.cookies.analytics.desc')}</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Your Rights */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.rights.title')}
          </h2>
          <p className="mb-3 text-sm">{t('privacy.rights.intro')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>{t('privacy.rights.access.title')}:</strong> {t('privacy.rights.access.desc')}</li>
            <li><strong>{t('privacy.rights.rectification.title')}:</strong> {t('privacy.rights.rectification.desc')}</li>
            <li><strong>{t('privacy.rights.erasure.title')}:</strong> {t('privacy.rights.erasure.desc')}</li>
            <li><strong>{t('privacy.rights.portability.title')}:</strong> {t('privacy.rights.portability.desc')}</li>
            <li><strong>{t('privacy.rights.object.title')}:</strong> {t('privacy.rights.object.desc')}</li>
          </ul>
        </section>
        
        {/* Data Retention */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.retention.title')}
          </h2>
          <p className="text-sm">{t('privacy.retention.desc')}</p>
        </section>
        
        {/* Contact */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('privacy.contact.title')}
          </h2>
          <p className="text-sm">{t('privacy.contact.desc')}</p>
          <div className="mt-3 p-4 bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-lg">
            <p className="font-medium text-baucis-green-800">privacy@baucis-zen.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}

