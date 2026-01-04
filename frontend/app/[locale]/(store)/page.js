import HeroCarousel from '@/components/ui/HeroCarousel';
import AboutSection from '@/components/sections/AboutSection';
import ProductGrid from '@/components/products/ProductGrid';
import MemoryGame from '@/components/game/MemoryGame';
import { getProducts } from '@/lib/data';
import { getSampleProducts } from '@/lib/sampleProducts';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function HomePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations('products');
  const tCommon = await getTranslations('common');
  
  // Try to fetch from Medusa with locale for translations, fallback to sample products
  let products = await getProducts(undefined, locale);
  if (!products || products.length === 0) {
    products = getSampleProducts();
  }

  return (
    <div className="bg-white">
      {/* Hero Section - 3D Carousel with Spline + Images */}
      <HeroCarousel />

      {/* About Us Section - Mission/Vision/Values/Story */}
      <AboutSection />

      {/* Featured Products Section */}
      <section className="pt-12 md:pt-16 pb-14 md:pb-20 bg-gradient-to-b from-white to-baucis-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span 
              className="text-baucis-green-500 text-sm tracking-[0.3em] uppercase mb-4 block"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('featured')}
            </span>
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl text-baucis-green-800 mb-4"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('title')}
            </h2>
            <p 
              className="text-baucis-green-600 max-w-2xl mx-auto"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('subtitle')}
            </p>
            <div className="w-16 h-1 bg-gradient-to-r from-baucis-green-400 to-baucis-green-600 mx-auto mt-4 rounded-full" />
          </div>

          {/* Products Grid - Show first 3 */}
          <ProductGrid products={products.slice(0, 3)} />

          {/* View All CTA */}
          <div className="text-center mt-10">
            <Link 
              href="/products"
              className="inline-flex items-center space-x-3 bg-gradient-to-r from-baucis-green-500 to-baucis-green-600 text-white px-8 py-3 rounded-full hover:from-baucis-green-600 hover:to-baucis-green-700 transition-all duration-300 hover:scale-105 hover:shadow-xl text-sm"
              style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.12em' }}
            >
              <span>{tCommon('viewAll').toUpperCase()}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Memory Game Section */}
      <MemoryGame />
    </div>
  );
}

