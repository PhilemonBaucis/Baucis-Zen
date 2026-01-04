import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations('legal');
  return {
    title: `${t('shipping.title')} - Baucis Zen`,
    description: t('shipping.metaDescription'),
  };
}

export default async function ShippingPage() {
  const t = await getTranslations('legal');
  
  return (
    <div className="legal-content">
      <h1 
        className="text-2xl md:text-3xl text-baucis-green-800 mb-6"
        style={{ fontFamily: 'Libre Baskerville, serif' }}
      >
        {t('shipping.title')}
      </h1>
      
      <div className="space-y-8 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
        {/* Intro */}
        <section>
          <p className="text-base leading-relaxed">
            {t('shipping.intro')}
          </p>
        </section>

        {/* Shipping Partner */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.partner.title')}
          </h2>
          <div className="p-4 bg-baucis-green-50 rounded-lg border border-baucis-green-100">
            <p className="font-medium text-baucis-green-800">{t('shipping.partner.name')}</p>
            <p className="text-sm text-baucis-green-600 mt-1">{t('shipping.partner.desc')}</p>
          </div>
        </section>
        
        {/* Delivery Areas */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.areas.title')}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-baucis-green-50 p-4 rounded-lg border border-baucis-green-100">
              <div className="flex items-center gap-2 mb-2">
                {/* Tirana - City/location icon */}
                <svg className="w-5 h-5 text-baucis-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="font-medium text-baucis-green-800">{t('shipping.areas.tirana.title')}</p>
              </div>
              <p className="text-sm text-baucis-green-600">{t('shipping.areas.tirana.desc')}</p>
            </div>
            <div className="bg-baucis-pink-50 p-4 rounded-lg border border-baucis-pink-100">
              <div className="flex items-center gap-2 mb-2">
                {/* Albanian flag */}
                <img 
                  src="https://flagcdn.com/w40/al.png" 
                  srcSet="https://flagcdn.com/w80/al.png 2x" 
                  width="20" 
                  height="15" 
                  alt="Albania" 
                  className="rounded-sm object-cover flex-shrink-0"
                  style={{ minWidth: '20px' }}
                />
                <p className="font-medium text-baucis-green-800">{t('shipping.areas.albania.title')}</p>
              </div>
              <p className="text-sm text-baucis-green-600">{t('shipping.areas.albania.desc')}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                {/* Kosovo flag */}
                <img 
                  src="https://flagcdn.com/w40/xk.png" 
                  srcSet="https://flagcdn.com/w80/xk.png 2x" 
                  width="20" 
                  height="15" 
                  alt="Kosovo" 
                  className="rounded-sm object-cover flex-shrink-0"
                  style={{ minWidth: '20px' }}
                />
                <p className="font-medium text-baucis-green-800">{t('shipping.areas.kosovo.title')}</p>
              </div>
              <p className="text-sm text-baucis-green-600">{t('shipping.areas.kosovo.desc')}</p>
            </div>
          </div>
        </section>
        
        {/* Delivery Times & Costs */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.times.title')}
          </h2>
          <div className="overflow-hidden rounded-lg border border-baucis-green-200">
            <table className="w-full text-sm">
              <thead className="bg-baucis-green-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-baucis-green-800">{t('shipping.times.destination')}</th>
                  <th className="px-4 py-3 text-left font-medium text-baucis-green-800">{t('shipping.times.deliveryTime')}</th>
                  <th className="px-4 py-3 text-left font-medium text-baucis-green-800">{t('shipping.times.cost')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-baucis-green-100">
                <tr className="bg-white">
                  <td className="px-4 py-3">{t('shipping.times.tirana')}</td>
                  <td className="px-4 py-3">{t('shipping.times.tiranaTime')}</td>
                  <td className="px-4 py-3 font-medium">{t('shipping.times.tiranaCost')}</td>
                </tr>
                <tr className="bg-baucis-green-50/50">
                  <td className="px-4 py-3">{t('shipping.times.albaniaCity')}</td>
                  <td className="px-4 py-3">{t('shipping.times.albaniaCityTime')}</td>
                  <td className="px-4 py-3 font-medium" rowSpan={2}>{t('shipping.times.albaniaCost')}</td>
                </tr>
                <tr className="bg-baucis-green-50/50">
                  <td className="px-4 py-3">{t('shipping.times.albaniaRural')}</td>
                  <td className="px-4 py-3">{t('shipping.times.albaniaRuralTime')}</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-4 py-3">{t('shipping.times.kosovo')}</td>
                  <td className="px-4 py-3">{t('shipping.times.kosovoTime')}</td>
                  <td className="px-4 py-3 font-medium">{t('shipping.times.kosovoCost')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-baucis-green-500 mt-2">{t('shipping.times.note')}</p>
        </section>

        {/* Weight & Surcharges */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.weight.title')}
          </h2>
          <div className="space-y-2 text-sm">
            <p>{t('shipping.weight.baseWeight')}</p>
            <p className="font-medium text-baucis-green-800">{t('shipping.weight.surcharge')}</p>
            <p className="text-baucis-green-500 italic">{t('shipping.weight.example')}</p>
          </div>
        </section>
        
        {/* Order Processing */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.processing.title')}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('shipping.processing.item1')}</li>
            <li>{t('shipping.processing.item2')}</li>
            <li>{t('shipping.processing.item3')}</li>
          </ul>
        </section>
        
        {/* Tracking */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.tracking.title')}
          </h2>
          <p className="text-sm">{t('shipping.tracking.desc')}</p>
        </section>

        {/* Liability */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.liability.title')}
          </h2>
          <p className="text-sm mb-3">{t('shipping.liability.intro')}</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{t('shipping.liability.letters')}</li>
            <li>{t('shipping.liability.parcels')}</li>
            <li>{t('shipping.liability.delays')}</li>
            <li>{t('shipping.liability.insurance')}</li>
          </ul>
        </section>
        
        {/* Issues */}
        <section>
          <h2 className="text-xl text-baucis-green-800 mb-3" style={{ fontFamily: 'Libre Baskerville, serif' }}>
            {t('shipping.issues.title')}
          </h2>
          <p className="text-sm mb-3">{t('shipping.issues.desc')}</p>
          <div className="p-4 bg-gradient-to-r from-baucis-green-50 to-baucis-pink-50 rounded-lg">
            <p className="font-medium text-baucis-green-800">logistics@bauciszen.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}
