'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { sdk } from '@/lib/config';

// Icon components
const PackageIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const PhotoIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const EnvelopeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const QuestionMarkCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function OrdersPage() {
  const t = useTranslations('account');
  const { customer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customer?.email) {
      fetchOrders();
    }
  }, [customer?.email]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/orders?limit=50');

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Map Medusa status to display status (3 stages: processing, shipped, delivered)
  const getDisplayStatus = (order) => {
    // Check if order is cancelled
    if (order.status === 'canceled') return 'cancelled';

    // Check if delivered (order completed)
    if (order.status === 'completed') return 'delivered';

    // Check fulfillment status
    if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled') {
      return 'shipped';
    }

    // All other orders (pending, captured) are "processing"
    return 'processing';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (amount, currency = 'EUR') => {
    // Prices are stored in whole euros (not cents)
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency?.toUpperCase() || 'EUR',
    }).format(safeAmount);
  };

  // Generate formatted order number: BZ-YYYY-XXXXX
  const formatOrderNumber = (order) => {
    const year = new Date(order.created_at).getFullYear();
    const paddedId = String(order.display_id).padStart(5, '0');
    return `BZ-${year}-${paddedId}`;
  };

  // Round to 2 decimal places (avoids floating-point precision issues)
  const round2 = (n) => Math.round(n * 100) / 100;

  // Get order total from Medusa v2 summary object or direct property
  const getOrderTotal = (order) => {
    // Try summary.totals first (nested structure), then summary directly
    const summaryTotals = order.summary?.totals || order.summary || {};

    // Calculate from items as fallback
    const itemsTotal = (order.items || []).reduce((sum, item) => {
      return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    // Check for Zen tier discount in metadata
    const zenDiscount = order.metadata?.zen_tier_discount;
    // Get shipping - prioritize stored EUR price from metadata
    const customShipping = order.metadata?.custom_shipping;
    const shipping = customShipping?.priceEUR ||
                     Number(order.shipping_methods?.[0]?.amount) ||
                     Number(order.shipping_total) || 0;

    // If we have zen discount in metadata but not in discount_total, calculate manually
    if (zenDiscount?.amount && !Number(order.discount_total)) {
      return round2((itemsTotal - Number(zenDiscount.amount)) + shipping);
    }

    return round2(
      Number(summaryTotals.current_order_total) ||
      Number(order.total) ||
      Number(summaryTotals.original_order_total) ||
      itemsTotal
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDeliveryEstimate = (order) => {
    const shippingAddress = order.shipping_address;
    if (!shippingAddress) return null;

    const city = shippingAddress.city?.toLowerCase() || '';
    const country = shippingAddress.country_code?.toUpperCase() || '';

    if (country === 'XK') {
      return { hours: 96, text: '4 days' };
    }
    if (country === 'AL') {
      if (city.includes('tiran')) {
        return { hours: 24, text: '24h' };
      }
      return { hours: 72, text: '24-72h' };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <PackageIcon className="w-5 h-5 text-baucis-green-600" />
          <h2 
            className="text-xl text-baucis-green-800"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('orders')}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-baucis-green-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageIcon className="w-8 h-8 text-baucis-green-400" />
            </div>
            <p 
              className="text-baucis-green-600 mb-4"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('noOrdersYet')}
            </p>
            <p 
              className="text-baucis-green-500 text-sm mb-6"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('noOrdersHint')}
            </p>
            <Link
              href="/products"
              className="inline-block bg-baucis-green-600 text-white text-sm px-6 py-3 rounded-full hover:bg-baucis-green-700 transition-colors"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('startShopping')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = getDisplayStatus(order);
              const deliveryEstimate = getDeliveryEstimate(order);
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className="block border border-baucis-green-200 rounded-xl p-4 hover:border-baucis-green-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className="text-baucis-green-800 font-medium"
                        style={{ fontFamily: 'Libre Baskerville, serif' }}
                      >
                        {t('order')} {formatOrderNumber(order)}
                      </p>
                      <p
                        className="text-baucis-green-500 text-sm"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(status)}`}>
                      {t(`orderStatuses.${status}`) || status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span
                        className="text-baucis-green-600 text-sm"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {order.items?.length || 0} {t('items')}
                      </span>
                      {deliveryEstimate && status !== 'delivered' && status !== 'cancelled' && (
                        <span
                          className="text-blue-600 text-sm flex items-center space-x-1"
                          style={{ fontFamily: 'Crimson Text, serif' }}
                        >
                          <ClockIcon className="w-4 h-4" />
                          <span>{deliveryEstimate.text}</span>
                        </span>
                      )}
                    </div>
                    <p
                      className="text-baucis-green-800 font-medium"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      {formatPrice(getOrderTotal(order), order.currency_code)}
                    </p>
                  </div>

                  {/* Order Items Preview */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex space-x-2 overflow-x-auto">
                      {order.items?.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="w-12 h-12 bg-baucis-green-50 rounded-lg overflow-hidden flex-shrink-0"
                        >
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-baucis-green-400">
                              <PhotoIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="w-12 h-12 bg-baucis-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-baucis-green-600 text-xs">+{order.items.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-baucis-green-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Help */}
      <div className="bg-baucis-green-50 rounded-2xl p-6">
        <div className="flex items-center space-x-2 mb-3">
          <QuestionMarkCircleIcon className="w-5 h-5 text-baucis-green-600" />
          <h3 
            className="text-lg text-baucis-green-800"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('needHelp')}
          </h3>
        </div>
        <p 
          className="text-baucis-green-600 text-sm mb-4"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('orderHelpText')}
        </p>
        <a
          href="mailto:support@bauciszen.com"
          className="inline-flex items-center space-x-2 text-baucis-green-700 hover:text-baucis-green-900"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          <EnvelopeIcon className="w-5 h-5" />
          <span>support@bauciszen.com</span>
        </a>
      </div>
    </div>
  );
}
