import { getProductByHandle, getProducts } from '@/lib/data';
import { getSampleProductByHandle, getSampleProducts } from '@/lib/sampleProducts';
import Link from 'next/link';
import ProductGrid from '@/components/products/ProductGrid';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import AddToCartButton from '@/components/products/AddToCartButton';
import ProductDetailPrice from '@/components/products/ProductDetailPrice';
import { getTranslations } from 'next-intl/server';

// SEO Generation
export async function generateMetadata({ params }) {
  const { handle, locale } = await params;
  
  // Try Medusa first with locale for translated metadata, then fallback
  let product = await getProductByHandle(handle, undefined, locale);
  if (!product) {
    product = getSampleProductByHandle(handle);
  }
  
  if (!product) {
    return { title: 'Product Not Found | Baucis Zen' };
  }

  return {
    title: `${product.title} | Baucis Zen`,
    description: product.description?.slice(0, 160) || 'Premium wellness products from Baucis Zen',
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 160),
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

// Price formatter (divides by 100 for cents)
const formatPrice = (amount, currency) => {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency?.toUpperCase() || 'EUR',
  }).format(amount);
};

// Country names mapping (code -> name)
const countryNames = {
  JP: 'Japan', CN: 'China', KR: 'South Korea', IN: 'India',
  US: 'United States', FR: 'France', IT: 'Italy', DE: 'Germany',
  GB: 'United Kingdom', ES: 'Spain', GR: 'Greece', TR: 'Turkey',
  AL: 'Albania', NL: 'Netherlands', BE: 'Belgium', CH: 'Switzerland',
  AT: 'Austria', PT: 'Portugal', BR: 'Brazil', MX: 'Mexico',
  AU: 'Australia', NZ: 'New Zealand', TH: 'Thailand', VN: 'Vietnam',
  ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines', TW: 'Taiwan',
  HK: 'Hong Kong', SG: 'Singapore', CA: 'Canada', SE: 'Sweden',
  NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
  CZ: 'Czech Republic', RO: 'Romania', HU: 'Hungary', IE: 'Ireland',
};

// Reverse lookup: name -> code
const nameToCode = {
  'japan': 'JP', 'china': 'CN', 'south korea': 'KR', 'korea': 'KR',
  'india': 'IN', 'united states': 'US', 'usa': 'US', 'france': 'FR',
  'italy': 'IT', 'germany': 'DE', 'united kingdom': 'GB', 'uk': 'GB',
  'spain': 'ES', 'greece': 'GR', 'turkey': 'TR', 'albania': 'AL',
  'netherlands': 'NL', 'belgium': 'BE', 'switzerland': 'CH', 'austria': 'AT',
  'portugal': 'PT', 'brazil': 'BR', 'mexico': 'MX', 'australia': 'AU',
  'new zealand': 'NZ', 'thailand': 'TH', 'vietnam': 'VN', 'indonesia': 'ID',
  'malaysia': 'MY', 'philippines': 'PH', 'taiwan': 'TW', 'hong kong': 'HK',
  'singapore': 'SG', 'canada': 'CA', 'sweden': 'SE', 'norway': 'NO',
  'denmark': 'DK', 'finland': 'FI', 'poland': 'PL', 'czech republic': 'CZ',
  'romania': 'RO', 'hungary': 'HU', 'ireland': 'IE',
};

const getCountryInfo = (countryInput) => {
  if (!countryInput) return null;
  
  let code = countryInput.toUpperCase();
  let name = countryNames[code];
  
  // If not found by code, try by name
  if (!name) {
    const foundCode = nameToCode[countryInput.toLowerCase()];
    if (foundCode) {
      code = foundCode;
      name = countryNames[code];
    } else {
      // Unknown country
      return { code: null, name: countryInput };
    }
  }
  
  return { code: code.toLowerCase(), name };
};

// Page Component
export default async function ProductPage({ params }) {
  const { handle, locale } = await params;
  const t = await getTranslations('productDetail');
  const tCommon = await getTranslations('common');
  const tProducts = await getTranslations('products');
  
  // Try Medusa first with locale for translations, then fallback to sample
  let product = await getProductByHandle(handle, undefined, locale);
  if (!product) {
    product = getSampleProductByHandle(handle);
  }
  
  // Get related products with locale for translations (exclude current product, take 4)
  let allProducts = await getProducts(undefined, locale);
  if (!allProducts || allProducts.length === 0) {
    allProducts = getSampleProducts();
  }
  const relatedProducts = allProducts
    .filter(p => p.handle !== handle)
    .slice(0, 4);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-baucis-pink-50 to-white">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-baucis-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 
            className="text-3xl text-baucis-green-800 mb-4"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {tProducts('notFoundTitle') || 'Product not found'}
          </h1>
          <p className="text-baucis-green-600 mb-8" style={{ fontFamily: 'Crimson Text, serif' }}>
            {tProducts('notFoundDescription') || "The product you're looking for doesn't exist or has been removed."}
          </p>
          <Link 
            href="/products" 
            className="inline-flex items-center space-x-2 bg-baucis-green-500 text-white px-8 py-3 rounded-full hover:bg-baucis-green-600 transition-colors duration-300"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.1em' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>{(tProducts('backToProducts') || 'Back to products').toUpperCase()}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-baucis-pink-50 via-white to-baucis-pink-100 pt-20">
      {/* Breadcrumb */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center space-x-2 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
          <li>
            <Link href="/" className="text-baucis-green-500 hover:text-baucis-green-700 transition-colors">
              {tCommon('home')}
            </Link>
          </li>
          <li className="text-baucis-green-300">/</li>
          <li>
            <Link href="/products" className="text-baucis-green-500 hover:text-baucis-green-700 transition-colors">
              {tCommon('shop')}
            </Link>
          </li>
          <li className="text-baucis-green-300">/</li>
          <li className="text-baucis-green-800 font-medium">{product.title}</li>
        </ol>
      </nav>

      {/* Product Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Product Image Gallery */}
          <div className="relative">
            <ProductImageGallery 
              images={product.images || [product.image]} 
              title={product.title} 
            />
            
            {/* Sold Out Badge */}
            {product.isSoldOut && (
              <div className="absolute top-6 right-6 bg-baucis-green-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-10">
                {tCommon('soldOut')}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col justify-center">
            <div className="mb-6">
              <h1 
                className="text-2xl md:text-3xl text-baucis-green-800 mb-2"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {product.title}
              </h1>
              
              {product.subtitle && (
                <p 
                  className="text-baucis-green-500 text-base mb-3"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {product.subtitle}
                </p>
              )}
              
              {/* Price with Tier Discount */}
              <ProductDetailPrice price={product.price} currency={product.currency} />

              {product.description && (
                <p 
                  className="text-baucis-green-600 text-sm leading-relaxed mb-4"
                  style={{ fontFamily: 'Crimson Text, serif' }}
                >
                  {product.description}
                </p>
              )}
            </div>

            {/* Add to Cart */}
            <AddToCartButton product={product} />
            
            {/* Product Specifications */}
            {(product.weight || product.length || product.originCountry) && (
              <div className="mt-8 pt-6 border-t border-baucis-green-100">
                <h3 
                  className="text-sm text-baucis-green-700 mb-4 tracking-wide"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {t('detailsHeading') || 'Product Details'}
                </h3>
                <div className="space-y-3">
                  {/* Origin Country - Full width row */}
                  {product.originCountry && (() => {
                    const countryInfo = getCountryInfo(product.originCountry);
                    return (
                      <div className="flex items-center gap-3 bg-gradient-to-r from-baucis-green-50 to-transparent p-3 rounded-xl">
                        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-baucis-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[10px] text-baucis-green-500 uppercase tracking-wider" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                            {t('origin') || 'Origin'}
                          </p>
                          <p className="text-sm text-baucis-green-700 flex items-center gap-1.5" style={{ fontFamily: 'Crimson Text, serif' }}>
                            {countryInfo?.code && (
                              <img 
                                src={`https://flagcdn.com/w40/${countryInfo.code}.png`}
                                srcSet={`https://flagcdn.com/w80/${countryInfo.code}.png 2x`}
                                width={20}
                                height={15}
                                alt={countryInfo.name}
                                className="rounded-sm object-cover"
                              />
                            )}
                            <span>{countryInfo?.name}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Weight & Dimensions - Same row */}
                  {(product.weight || product.length || product.width || product.height) && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Weight */}
                      {product.weight && (
                        <div className="flex items-center gap-3 bg-gradient-to-r from-baucis-green-50 to-transparent p-3 rounded-xl">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-baucis-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-baucis-green-500 uppercase tracking-wider" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                              {t('weight') || 'Weight'}
                            </p>
                            <p className="text-sm text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                              {product.weight}g
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Dimensions */}
                      {(product.length || product.width || product.height) && (
                        <div className="flex items-center gap-3 bg-gradient-to-r from-baucis-green-50 to-transparent p-3 rounded-xl">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-4 h-4 text-baucis-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[10px] text-baucis-green-500 uppercase tracking-wider" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                              {t('dimensions') || 'Dimensions'}
                            </p>
                            <p className="text-sm text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                              {product.length && <span><span className="text-baucis-green-500 text-xs">L:</span>{product.length}</span>}
                              {product.length && product.width && <span className="text-baucis-green-400 mx-1">×</span>}
                              {product.width && <span><span className="text-baucis-green-500 text-xs">W:</span>{product.width}</span>}
                              {(product.length || product.width) && product.height && <span className="text-baucis-green-400 mx-1">×</span>}
                              {product.height && <span><span className="text-baucis-green-500 text-xs">H:</span>{product.height}</span>}
                              <span className="text-baucis-green-500 text-xs ml-1">{t('unitMm') || 'mm'}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 
                className="text-3xl text-baucis-green-800 mb-4"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('youMayAlsoLike')}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-baucis-green-400 to-baucis-green-600 mx-auto rounded-full" />
            </div>
            <ProductGrid products={relatedProducts} />
          </div>
        </section>
      )}
    </div>
  );
}

