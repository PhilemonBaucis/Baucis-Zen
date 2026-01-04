import { View, Text, Image } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useCartStore } from '@/store/cart-store';
import { useCheckoutStore } from '@/store/checkout-store';

interface OrderSummaryProps {
  showDiscount?: boolean;
}

// Helper for consistent 2-decimal rounding
const round2 = (n: number) => Math.round(n * 100) / 100;

export function OrderSummary({ showDiscount = false }: OrderSummaryProps) {
  const { t } = useTranslation();
  const { cart } = useCartStore();
  const { shippingOption, tierDiscount } = useCheckoutStore();

  if (!cart || !cart.items || cart.items.length === 0) {
    return null;
  }

  // Calculate totals
  const itemsTotal = cart.items.reduce(
    (sum, item) => sum + (item.unit_price || 0) * (item.quantity || 1),
    0
  );

  const discountAmount = showDiscount && tierDiscount ? tierDiscount.amount : 0;
  const shippingAmount = shippingOption?.priceEUR || 0;
  const total = round2(itemsTotal - discountAmount + shippingAmount);

  return (
    <View className="px-4 py-4">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        {t('checkout.orderSummary') || 'Order Summary'}
      </Text>

      <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Items */}
        <View className="p-4 border-b border-gray-100 dark:border-gray-700">
          {cart.items.slice(0, 3).map((item, index) => (
            <View
              key={item.id || index}
              className={`flex-row items-center ${index > 0 ? 'mt-3' : ''}`}
            >
              {/* Product Image */}
              <View className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {item.thumbnail ? (
                  <Image
                    source={{ uri: item.thumbnail }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Text className="text-gray-400 text-xs">No img</Text>
                  </View>
                )}
              </View>

              {/* Product Info */}
              <View className="flex-1 ml-3">
                <Text
                  className="text-gray-900 dark:text-white font-medium text-sm"
                  numberOfLines={1}
                >
                  {item.title || item.product_title}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {t('cart.qty') || 'Qty'}: {item.quantity}
                </Text>
              </View>

              {/* Price */}
              <Text className="text-gray-900 dark:text-white font-medium">
                €{round2((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}
              </Text>
            </View>
          ))}

          {/* Show "and X more items" if more than 3 */}
          {cart.items.length > 3 && (
            <Text className="text-gray-500 text-sm mt-2">
              {t('checkout.andMore', { count: cart.items.length - 3 }) ||
                `and ${cart.items.length - 3} more items`}
            </Text>
          )}
        </View>

        {/* Totals */}
        <View className="p-4 space-y-2">
          {/* Subtotal */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">
              {t('checkout.subtotal') || 'Subtotal'}
            </Text>
            <Text className="text-gray-900 dark:text-white">
              €{round2(itemsTotal).toFixed(2)}
            </Text>
          </View>

          {/* Discount */}
          {showDiscount && tierDiscount && tierDiscount.amount > 0 && (
            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Text className="text-primary-600">
                  {tierDiscount.tier} {t('checkout.discount') || 'Discount'} (-{tierDiscount.percent}%)
                </Text>
              </View>
              <Text className="text-primary-600 font-medium">
                -€{round2(discountAmount).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Shipping */}
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">
              {t('checkout.shipping') || 'Shipping'}
            </Text>
            {shippingOption ? (
              <Text className="text-gray-900 dark:text-white">
                €{round2(shippingAmount).toFixed(2)}
              </Text>
            ) : (
              <Text className="text-gray-400 italic">
                {t('checkout.calculatedAtNextStep') || 'Calculated next'}
              </Text>
            )}
          </View>

          {/* Total */}
          <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              {t('checkout.total') || 'Total'}
            </Text>
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              €{total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
