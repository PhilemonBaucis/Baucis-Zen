import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('terms.title')} - Baucis Zen`,
    description: t('terms.metaDescription'),
  };
}

export default async function TermsPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('terms.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Introduction */}
        <section>
          <p className="text-base leading-relaxed">
            {t('terms.intro')}
          </p>
        </section>
        
        {/* Definitions */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.definitions.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>"{t('terms.definitions.we')}"</strong> - {t('terms.definitions.weDesc')}</li>
            <li><strong>"{t('terms.definitions.you')}"</strong> - {t('terms.definitions.youDesc')}</li>
            <li><strong>"{t('terms.definitions.products')}"</strong> - {t('terms.definitions.productsDesc')}</li>
            <li><strong>"{t('terms.definitions.order')}"</strong> - {t('terms.definitions.orderDesc')}</li>
          </ul>
        </section>
        
        {/* Orders */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.orders.title')}
          </h2>
          <div className="space-y-3 text-sm">
            <p>{t('terms.orders.para1')}</p>
            <p>{t('terms.orders.para2')}</p>
            <p>{t('terms.orders.para3')}</p>
          </div>
        </section>
        
        {/* Prices */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.prices.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('terms.prices.item1')}</li>
            <li>{t('terms.prices.item2')}</li>
            <li>{t('terms.prices.item3')}</li>
          </ul>
        </section>
        
        {/* Payment */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.payment.title')}
          </h2>
          <p className="text-sm mb-3">{t('terms.payment.intro')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('terms.payment.item1')}</li>
            <li>{t('terms.payment.item2')}</li>
          </ul>
        </section>
        
        {/* Delivery */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.delivery.title')}
          </h2>
          <p className="text-sm">{t('terms.delivery.desc')}</p>
        </section>
        
        {/* Intellectual Property */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.ip.title')}
          </h2>
          <p className="text-sm">{t('terms.ip.desc')}</p>
        </section>
        
        {/* Liability */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.liability.title')}
          </h2>
          <p className="text-sm mb-3">{t('terms.liability.desc')}</p>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">{t('terms.liability.shippingTitle')}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
              <li>{t('terms.liability.registeredLetters')}</li>
              <li>{t('terms.liability.parcels')}</li>
            </ul>
          </div>
        </section>
        
        {/* Governing Law */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.law.title')}
          </h2>
          <p className="text-sm">{t('terms.law.desc')}</p>
        </section>
        
        {/* Changes */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.changes.title')}
          </h2>
          <p className="text-sm">{t('terms.changes.desc')}</p>
        </section>
        
        {/* Contact */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('terms.contact.title')}
          </h2>
          <p className="text-sm">{t('terms.contact.desc')}</p>
          <div className="mt-3 p-4 bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-lg">
            <p className="font-medium text-baucis-green-800">support@baucis-zen.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}

