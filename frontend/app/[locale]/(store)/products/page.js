import ProductGrid from '@/components/products/ProductGrid';
import { getProducts } from '@/lib/data';
import { getSampleProducts } from '@/lib/sampleProducts';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'products' });
  
  return {
    title: `${t('title')} | Baucis Zen`,
    description: t('subtitle'),
  };
}

export default async function ProductsPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations('products');
  
  // Try to fetch from Medusa with locale for translations, fallback to sample products
  let products = await getProducts(undefined, locale);
  if (!products || products.length === 0) {
    products = getSampleProducts();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-baucis-pink-50 via-white to-baucis-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-20">
        {/* Page Header */}
        <div className="text-center mb-16">
          <span 
            className="text-baucis-green-500 text-sm tracking-[0.3em] uppercase mb-4 block"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('title')}
          </span>
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl text-baucis-green-800 mb-6"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('title')}
          </h1>
          <p 
            className="text-baucis-green-600 max-w-2xl mx-auto text-lg"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            {t('subtitle')}
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-baucis-green-400 to-baucis-green-600 mx-auto mt-8 rounded-full" />
        </div>

        {/* Products Grid */}
        <ProductGrid products={products} />
      </div>
    </div>
  );
}

