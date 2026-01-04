import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('withdrawal.title')} - Baucis Zen`,
    description: t('withdrawal.metaDescription'),
  };
}

export default async function WithdrawalPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('withdrawal.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Right of Withdrawal */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.right.title')}
          </h2>
          <div className="bg-baucis-green-50 p-4 rounded-lg border border-baucis-green-200">
            <p className="text-sm leading-relaxed">{t('withdrawal.right.desc')}</p>
          </div>
        </section>
        
        {/* Withdrawal Period */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.period.title')}
          </h2>
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-baucis-green-100 to-baucis-pink-100 rounded-lg">
            <div className="w-16 h-16 bg-baucis-green-600 rounded-full flex items-center justify-center text-white font-bold text-2xl" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              14
            </div>
            <div>
              <p className="font-medium text-baucis-green-800">{t('withdrawal.period.days')}</p>
              <p className="text-sm text-baucis-green-600">{t('withdrawal.period.desc')}</p>
            </div>
          </div>
        </section>
        
        {/* How to Withdraw */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.how.title')}
          </h2>
          <div className="space-y-3 text-sm">
            <p>{t('withdrawal.how.para1')}</p>
            <p>{t('withdrawal.how.para2')}</p>
          </div>
        </section>
        
        {/* Effects of Withdrawal */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.effects.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('withdrawal.effects.item1')}</li>
            <li>{t('withdrawal.effects.item2')}</li>
            <li>{t('withdrawal.effects.item3')}</li>
            <li>{t('withdrawal.effects.item4')}</li>
          </ul>
        </section>
        
        {/* Exclusions */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.exclusions.title')}
          </h2>
          <p className="text-sm mb-3">{t('withdrawal.exclusions.intro')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('withdrawal.exclusions.item1')}</li>
            <li>{t('withdrawal.exclusions.item2')}</li>
            <li>{t('withdrawal.exclusions.item3')}</li>
          </ul>
        </section>
        
        {/* Withdrawal Form */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.form.title')}
          </h2>
          <div className="bg-white p-6 rounded-lg border-2 border-dashed border-baucis-green-300">
            <p className="text-sm text-baucis-green-600 mb-4">{t('withdrawal.form.intro')}</p>
            <div className="space-y-4 text-sm">
              <p className="font-medium text-baucis-green-800">{t('withdrawal.form.to')}:</p>
              <div className="pl-4 border-l-2 border-baucis-green-200">
                <p>Baucis Zen</p>
                <p>[Address]</p>
                <p>Email: returns@baucis-zen.com</p>
              </div>
              <p className="pt-2">{t('withdrawal.form.body1')}</p>
              <div className="space-y-2 pl-4">
                <p>• {t('withdrawal.form.ordered')}: _______________</p>
                <p>• {t('withdrawal.form.received')}: _______________</p>
                <p>• {t('withdrawal.form.name')}: _______________</p>
                <p>• {t('withdrawal.form.address')}: _______________</p>
                <p>• {t('withdrawal.form.date')}: _______________</p>
                <p>• {t('withdrawal.form.signature')}: _______________</p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Contact */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('withdrawal.contact.title')}
          </h2>
          <p className="text-sm mb-3">{t('withdrawal.contact.desc')}</p>
          <div className="p-4 bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-lg">
            <p className="font-medium text-baucis-green-800">returns@baucis-zen.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}

