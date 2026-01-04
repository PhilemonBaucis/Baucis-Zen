import { useTranslations } from 'next-intl';
import ProductCard from './ProductCard';

export default function ProductGrid({ products, loading = false }) {
  const tProducts = useTranslations('products');

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-3xl shadow-lg border border-baucis-green-200/30">
            <div className="bg-baucis-green-100 aspect-square rounded-t-3xl"></div>
            <div className="p-6 space-y-4">
              <div className="h-6 bg-baucis-green-100 rounded w-3/4"></div>
              <div className="h-4 bg-baucis-green-100 rounded w-1/2"></div>
              <div className="h-12 bg-baucis-green-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-baucis-green-800 mb-2">
          {tProducts('noProductsFound') || 'No products found'}
        </h3>
        <p className="text-baucis-green-600">
          {tProducts('checkBackSoon') || 'Check back soon for new arrivals.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
