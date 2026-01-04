import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('returns.title')} - Baucis Zen`,
    description: t('returns.metaDescription'),
  };
}

export default async function ReturnsPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('returns.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Intro */}
        <section>
          <p className="text-base leading-relaxed">
            {t('returns.intro')}
          </p>
        </section>
        
        {/* Return Policy */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.policy.title')}
          </h2>
          <div className="bg-baucis-green-50 p-4 rounded-lg border border-baucis-green-200">
            <p className="text-sm">{t('returns.policy.desc')}</p>
          </div>
          <p className="text-sm mt-3">
            {t('returns.policy.withdrawal')}{' '}
            <Link href="/legal/withdrawal" className="text-baucis-green-600 underline hover:text-baucis-green-800">
              {t('returns.policy.withdrawalLink')}
            </Link>
          </p>
        </section>

        {/* Return Shipping Costs */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.shippingCosts.title')}
          </h2>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <span>{t('returns.shippingCosts.customerPays')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <span>{t('returns.shippingCosts.refused')}</span>
              </li>
            </ul>
          </div>
        </section>
        
        {/* Conditions */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.conditions.title')}
          </h2>
          <p className="text-sm mb-3">{t('returns.conditions.intro')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('returns.conditions.item1')}</li>
            <li>{t('returns.conditions.item2')}</li>
            <li>{t('returns.conditions.item3')}</li>
            <li>{t('returns.conditions.item4')}</li>
          </ul>
        </section>
        
        {/* Non-Returnable */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.nonReturnable.title')}
          </h2>
          <div className="bg-baucis-pink-50 p-4 rounded-lg border border-baucis-pink-200">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>{t('returns.nonReturnable.item1')}</li>
              <li>{t('returns.nonReturnable.item2')}</li>
              <li>{t('returns.nonReturnable.item3')}</li>
            </ul>
          </div>
        </section>
        
        {/* Return Process */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.process.title')}
          </h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 bg-baucis-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-baucis-green-800">{t(`returns.process.step${step}.title`)}</p>
                  <p className="text-sm text-baucis-green-600">{t(`returns.process.step${step}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Refunds */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.refunds.title')}
          </h2>
          <div className="space-y-3 text-sm">
            <p>{t('returns.refunds.para1')}</p>
            <p>{t('returns.refunds.para2')}</p>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('returns.refunds.method')}</p>
              <p className="font-medium text-baucis-green-800">{t('returns.refunds.methodDesc')}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-baucis-green-100">
              <p className="text-baucis-green-500 text-xs uppercase tracking-wide mb-1">{t('returns.refunds.timeline')}</p>
              <p className="font-medium text-baucis-green-800">{t('returns.refunds.timelineDesc')}</p>
            </div>
          </div>
        </section>
        
        {/* Damaged Items */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.damaged.title')}
          </h2>
          <p className="text-sm mb-3">{t('returns.damaged.desc')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('returns.damaged.item1')}</li>
            <li>{t('returns.damaged.item2')}</li>
            <li>{t('returns.damaged.item3')}</li>
          </ul>
        </section>
        
        {/* Contact */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('returns.contact.title')}
          </h2>
          <p className="text-sm mb-3">{t('returns.contact.desc')}</p>
          <div className="p-4 bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-lg">
            <p className="font-medium text-baucis-green-800">returns@baucis-zen.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}

