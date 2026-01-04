'use client';

import { useTranslations } from 'next-intl';
import { getStockStatus, formatLeadTime } from '@/lib/stock-utils';

/**
 * StockBadge - Displays stock status with optional lead time
 * 
 * @param {number|undefined} inventoryQuantity - Available inventory
 * @param {number} requestedQuantity - Quantity requested (default: 1)
 * @param {boolean} allowBackorder - Whether backorder is allowed
 * @param {boolean} showLeadTime - Whether to show lead time (default: true)
 * @param {'sm' | 'md' | 'lg'} size - Badge size (default: 'md')
 */
export default function StockBadge({
  inventoryQuantity,
  requestedQuantity = 1,
  allowBackorder = false,
  showLeadTime = true,
  size = 'md',
}) {
  const t = useTranslations('cart');

  const status = getStockStatus(inventoryQuantity, requestedQuantity, allowBackorder);

  const sizeClasses = {
    sm: 'text-[10px] gap-1',
    md: 'text-xs gap-1.5',
    lg: 'text-sm gap-2',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  // Get the status text
  const getStatusText = () => {
    if (status.showQuantity && status.quantity <= 4 && status.key === 'onlyXLeft') {
      return t('onlyXLeft', { count: status.quantity });
    }
    return t(status.key);
  };

  // Don't render anything for sold out items without the ability to show message
  if (status.key === 'soldOut' && !showLeadTime) {
    return (
      <div className={`flex items-center ${sizeClasses[size]}`}>
        <span className={`${dotSizes[size]} rounded-full ${status.dotColor}`} />
        <span className={status.textColor} style={{ fontFamily: 'Crimson Text, serif' }}>
          {t('soldOut')}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center flex-wrap ${sizeClasses[size]}`}>
      {/* Status dot */}
      <span className={`${dotSizes[size]} rounded-full ${status.dotColor} flex-shrink-0`} />

      {/* Status text */}
      <span className={status.textColor} style={{ fontFamily: 'Crimson Text, serif' }}>
        {getStatusText()}
      </span>

      {/* Lead time */}
      {showLeadTime && status.minDays && (
        <>
          <span className="text-baucis-green-400">•</span>
          <span className="text-baucis-green-500" style={{ fontFamily: 'Crimson Text, serif' }}>
            {formatLeadTime(status, t)}
          </span>
        </>
      )}

      {/* Pre-order indicator */}
      {status.isPreOrder && (
        <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">
          {t('preOrder')}
        </span>
      )}
    </div>
  );
}

