'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';

// Icons
const ArrowLeftIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PackageIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
);

const TruckIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const CreditCardIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
);

const DocumentIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const DownloadIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PhotoIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export default function OrderDetailPage({ params }) {
  const { id } = use(params);
  const t = useTranslations('account');
  const { customer } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (customer?.email && id) {
      fetchOrder();
    }
  }, [customer?.email, id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data.order);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (amount, currency = 'EUR') => {
    // Handle null, undefined, or invalid amounts
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

  // Helper to round to 2 decimal places (avoids floating-point precision issues)
  const round2 = (n) => Math.round(n * 100) / 100;

  // Helper to get order totals - Medusa v2 returns totals in summary.totals or summary directly
  const getOrderTotals = (order) => {
    // Try summary.totals first (nested structure from DB), then summary directly (API might flatten)
    const summaryTotals = order.summary?.totals || order.summary || {};

    // Calculate subtotal from items (items only, before shipping)
    const itemsSubtotal = (order.items || []).reduce((sum, item) => {
      return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    }, 0);

    // Get shipping - prioritize stored EUR price from metadata (calculated with exchange rate)
    // Fall back to Medusa's shipping_methods amount (may be in ALL)
    const customShipping = order.metadata?.custom_shipping;
    const shipping = customShipping?.priceEUR ||
                     Number(order.shipping_methods?.[0]?.amount) ||
                     Number(order.shipping_total) || 0;

    // Get discount - first try discount_total, then check metadata for Zen tier discount
    const zenDiscount = order.metadata?.zen_tier_discount;
    const discount = Number(order.discount_total) || Number(zenDiscount?.amount) || 0;

    // Calculate total - if we have zen discount in metadata, use discounted subtotal
    let total;
    if (zenDiscount?.amount && !Number(order.discount_total)) {
      // Zen tier discount was applied via metadata
      total = round2((itemsSubtotal - Number(zenDiscount.amount)) + shipping);
    } else {
      total = round2(
        Number(summaryTotals.current_order_total) ||
        Number(order.total) ||
        Number(summaryTotals.original_order_total) ||
        (itemsSubtotal + shipping - discount)
      );
    }

    // Subtotal is items only (before shipping) - apply rounding for consistency
    const discountPercent = zenDiscount?.percent || 0;
    return {
      subtotal: round2(itemsSubtotal),
      shipping: round2(shipping),
      discount: round2(discount),
      discountPercent,
      total
    };
  };

  const getDisplayStatus = (order) => {
    if (order.status === 'canceled') return 'cancelled';
    if (order.status === 'completed') return 'delivered';
    if (order.fulfillment_status === 'fulfilled' || order.fulfillment_status === 'partially_fulfilled') {
      return 'shipped';
    }
    // All other orders (pending, captured) are "processing"
    return 'processing';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
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
        return { hours: 24, text: '24 hours' };
      }
      return { hours: 72, text: '24-72 hours' };
    }
    return null;
  };

  const getPaymentMethod = (order) => {
    // Check payment collection for payment method
    const payments = order.payment_collections?.[0]?.payments || [];
    if (payments.length > 0) {
      const provider = payments[0].provider_id;
      if (provider === 'pp_system_default' || provider === 'manual') {
        return 'cod';
      }
      return 'card';
    }
    return 'cod'; // Default for Albanian market
  };

  // Download PDF invoice from server
  const downloadInvoicePdf = async () => {
    if (!order) return;

    setDownloadingPdf(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/invoice`);

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Get filename from Content-Disposition header (format: "Fatura - FirstName LastName.pdf")
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Fatura - ${order.display_id}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-baucis-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link
          href="/account/orders"
          className="inline-flex items-center space-x-2 text-baucis-green-600 hover:text-baucis-green-800"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{t('backToOrders')}</span>
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error || 'Order not found'}
        </div>
      </div>
    );
  }

  const status = getDisplayStatus(order);
  const deliveryEstimate = getDeliveryEstimate(order);
  const paymentMethod = getPaymentMethod(order);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/account/orders"
        className="inline-flex items-center space-x-2 text-baucis-green-600 hover:text-baucis-green-800 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('backToOrders')}</span>
      </Link>

      {/* Order Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-2xl text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('order')} {formatOrderNumber(order)}
            </h1>
            <p
              className="text-baucis-green-500 text-sm mt-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('placedOn')} {formatDate(order.created_at)}
            </p>
          </div>
          <span className={`text-sm px-4 py-2 rounded-full border ${getStatusColor(status)}`}>
            {t(`orderStatuses.${status}`) || status}
          </span>
        </div>

        {/* Delivery Estimate */}
        {deliveryEstimate && status !== 'delivered' && status !== 'cancelled' && (
          <div className="relative overflow-hidden bg-gradient-to-r from-baucis-green-50 via-white to-baucis-green-50 border border-baucis-green-200 rounded-2xl p-5 mb-6">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-baucis-green-100/30 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-baucis-green-100/20 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-baucis-green-400 to-baucis-green-600 rounded-full flex items-center justify-center shadow-lg">
                <TruckIcon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-baucis-green-800 font-semibold text-lg" style={{ fontFamily: 'Libre Baskerville, serif' }}>
                  {t('estimatedDelivery')}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-baucis-green-100 text-baucis-green-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                    <ClockIcon className="w-4 h-4 mr-1.5" />
                    {deliveryEstimate.text}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Timeline - Lightning Effect */}
        <div className="relative pt-8 pb-2 mb-6">
          {/* Timeline Steps Row - Circles centered with line through them */}
          <div className="relative flex justify-between items-start px-4">
            {/* Timeline Background Track - Positioned at circle center (24px = half of 48px circle) */}
            <div className="absolute top-6 left-8 right-8 h-1.5 bg-gray-200 rounded-full z-0" />

            {/* Animated Lightning Progress Bar */}
            <div
              className="absolute top-6 left-8 h-1.5 rounded-full transition-all duration-1000 ease-out z-0"
              style={{
                width: `calc(${(['processing', 'shipped', 'delivered'].indexOf(status)) * 50}%)`,
                background: 'linear-gradient(90deg, #6a8a55 0%, #8ab76e 50%, #a8d890 100%)',
                boxShadow: '0 0 10px rgba(106, 138, 85, 0.6), 0 0 20px rgba(106, 138, 85, 0.4)',
              }}
            >
              {/* Lightning Pulse at end */}
              {status !== 'processing' && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"
                  style={{
                    boxShadow: '0 0 10px #8ab76e, 0 0 20px #6a8a55',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              )}
            </div>

            {/* Step Nodes */}
            {['processing', 'shipped', 'delivered'].map((step, index) => {
              const statusIndex = ['processing', 'shipped', 'delivered'].indexOf(status);
              const isCompleted = statusIndex > index;
              const isCurrent = status === step;

              return (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  {/* Step Circle - Centered on the line */}
                  <div className="relative">
                    {/* Glow effect for current step */}
                    {isCurrent && (
                      <>
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: 'rgba(106, 138, 85, 0.3)',
                            animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                          }}
                        />
                        <div
                          className="absolute -inset-2 rounded-full opacity-60"
                          style={{
                            background: 'conic-gradient(from 0deg, transparent, #8ab76e, transparent, #6a8a55, transparent)',
                            animation: 'spin 3s linear infinite',
                          }}
                        />
                      </>
                    )}
                    <div
                      className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
                        isCompleted
                          ? 'bg-gradient-to-br from-baucis-green-400 to-baucis-green-600 text-white border-baucis-green-300 shadow-lg'
                          : isCurrent
                            ? 'bg-gradient-to-br from-baucis-green-500 to-baucis-green-700 text-white border-baucis-green-400 shadow-xl'
                            : 'bg-white text-gray-400 border-gray-200'
                      }`}
                      style={isCurrent ? {
                        boxShadow: '0 0 20px rgba(106, 138, 85, 0.5), 0 0 40px rgba(106, 138, 85, 0.3)',
                      } : isCompleted ? {
                        boxShadow: '0 4px 15px rgba(106, 138, 85, 0.3)',
                      } : {}}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="w-6 h-6" />
                      ) : isCurrent ? (
                        <div className="relative">
                          <CheckCircleIcon className="w-6 h-6" />
                          {step === 'delivered' && (
                            <svg className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                            </svg>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* Step Label - Below circle */}
                  <span
                    className={`mt-3 text-xs font-semibold whitespace-nowrap transition-colors duration-300 ${
                      isCompleted || isCurrent ? 'text-baucis-green-700' : 'text-gray-400'
                    }`}
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {t(`orderStatuses.${step}`)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CSS for animations */}
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
              50% { opacity: 0.5; transform: translateY(-50%) scale(1.5); }
            }
            @keyframes ping {
              75%, 100% { transform: scale(2); opacity: 0; }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <PackageIcon className="w-5 h-5 text-baucis-green-600" />
          <h2
            className="text-lg text-baucis-green-800"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('orderItems')}
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 flex items-start space-x-4">
              <div className="w-16 h-16 bg-baucis-green-50 rounded-lg overflow-hidden flex-shrink-0">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-baucis-green-400">
                    <PhotoIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-baucis-green-800 font-medium truncate"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {item.title}
                </h3>
                {item.variant?.title && item.variant.title !== 'Default' && (
                  <p className="text-baucis-green-500 text-sm">{item.variant.title}</p>
                )}
                <p className="text-baucis-green-500 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('qty')}: {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-baucis-green-800 font-medium"
                  style={{ fontFamily: 'Libre Baskerville, serif' }}
                >
                  {formatPrice(item.unit_price * item.quantity, order.currency_code)}
                </p>
                <p className="text-baucis-green-400 text-sm">
                  {formatPrice(item.unit_price, order.currency_code)} {t('each')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Totals */}
        {(() => {
          const totals = getOrderTotals(order);
          return (
            <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-baucis-green-600">
                <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('subtotal')}</span>
                <span>{formatPrice(totals.subtotal, order.currency_code)}</span>
              </div>
              <div className="flex justify-between text-baucis-green-600">
                <span style={{ fontFamily: 'Crimson Text, serif' }}>{t('shipping')}</span>
                <span>{formatPrice(totals.shipping, order.currency_code)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('discount')}{totals.discountPercent > 0 && ` (${totals.discountPercent}%)`}
                  </span>
                  <span>-{formatPrice(totals.discount, order.currency_code)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-medium text-baucis-green-800 pt-2 border-t border-gray-100">
                <span style={{ fontFamily: 'Libre Baskerville, serif' }}>{t('total')}</span>
                <span style={{ fontFamily: 'Libre Baskerville, serif' }}>
                  {formatPrice(totals.total, order.currency_code)}
                </span>
              </div>
              <p className="text-right text-xs text-baucis-green-500 mt-1" style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('vatIncluded')}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Shipping & Payment */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPinIcon className="w-5 h-5 text-baucis-green-600" />
            <h2
              className="text-lg text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('shippingAddress')}
            </h2>
          </div>
          {order.shipping_address ? (
            <div className="text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
              <p className="font-medium text-baucis-green-800">
                {order.shipping_address.first_name} {order.shipping_address.last_name}
              </p>
              <p>{order.shipping_address.address_1}</p>
              {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
              <p>
                {order.shipping_address.city}
                {order.shipping_address.postal_code && `, ${order.shipping_address.postal_code}`}
              </p>
              <p>{order.shipping_address.country_code?.toUpperCase()}</p>
              {order.shipping_address.phone && (
                <p className="mt-2">{order.shipping_address.phone}</p>
              )}
            </div>
          ) : (
            <p className="text-baucis-green-400">{t('noAddress')}</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CreditCardIcon className="w-5 h-5 text-baucis-green-600" />
            <h2
              className="text-lg text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('paymentMethod')}
            </h2>
          </div>
          <div className="text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
            {paymentMethod === 'cod' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="font-medium text-yellow-800">{t('cashOnDelivery')}</p>
                <p className="text-yellow-700 text-sm mt-1">
                  {t('codAmount')}: {formatPrice(getOrderTotals(order).total, order.currency_code)}
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-medium text-green-800">{t('cardPayment')}</p>
                <p className="text-green-700 text-sm mt-1">{t('paymentProcessed')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Download */}
      <div className="bg-baucis-green-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentIcon className="w-6 h-6 text-baucis-green-600" />
            <div>
              <h3
                className="text-baucis-green-800 font-medium"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('invoice')}
              </h3>
              <p
                className="text-baucis-green-600 text-sm"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {t('downloadInvoice')}
              </p>
            </div>
          </div>
          <button
            onClick={downloadInvoicePdf}
            disabled={downloadingPdf}
            className="inline-flex items-center space-x-2 bg-baucis-green-600 text-white px-4 py-2 rounded-full hover:bg-baucis-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {downloadingPdf ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('generating')}</span>
              </>
            ) : (
              <>
                <DownloadIcon className="w-4 h-4" />
                <span>PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
