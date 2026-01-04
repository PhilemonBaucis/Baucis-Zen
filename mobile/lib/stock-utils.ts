/**
 * Stock status configuration for Baucis Zen Mobile
 * Uses dynamic config from backend with fallback defaults
 */

import { DEFAULT_CONFIG } from './store-config';

export interface StockStyle {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

export interface StockStatusInfo extends StockStyle {
  key: string;
  minDays: number | null;
  maxDays: number | null;
  unit: string | null;
}

export interface StockResult extends StockStatusInfo {
  quantity: number | null;
  showQuantity: boolean;
  canPurchase: boolean;
  isPreOrder: boolean;
  isBackorder: boolean;
  maxPurchasable?: number;
  partialBackorder?: boolean;
}

// Style configuration for each stock status
const STOCK_STYLES: Record<string, StockStyle> = {
  inStock: {
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    dotColor: 'bg-green-500',
  },
  lowStock: {
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  onlyXLeft: {
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-500',
  },
  madeToOrder: {
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  preOrder: {
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
  },
  soldOut: {
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-400',
  },
};

const DEFAULT_THRESHOLDS = DEFAULT_CONFIG.stock.thresholds;
const DEFAULT_LEAD_TIMES = DEFAULT_CONFIG.stock.leadTimes;

export const STOCK_STATUS: Record<string, StockStatusInfo> = {
  IN_STOCK: {
    key: 'inStock',
    ...STOCK_STYLES.inStock,
    ...DEFAULT_LEAD_TIMES.IN_STOCK,
  },
  LOW_STOCK: {
    key: 'lowStock',
    ...STOCK_STYLES.lowStock,
    ...DEFAULT_LEAD_TIMES.LOW_STOCK,
  },
  ONLY_X_LEFT: {
    key: 'onlyXLeft',
    ...STOCK_STYLES.onlyXLeft,
    ...DEFAULT_LEAD_TIMES.ONLY_X_LEFT,
  },
  MADE_TO_ORDER: {
    key: 'madeToOrder',
    ...STOCK_STYLES.madeToOrder,
    ...DEFAULT_LEAD_TIMES.MADE_TO_ORDER,
  },
  PRE_ORDER: {
    key: 'preOrder',
    ...STOCK_STYLES.preOrder,
    ...DEFAULT_LEAD_TIMES.PRE_ORDER,
  },
  SOLD_OUT: {
    key: 'soldOut',
    ...STOCK_STYLES.soldOut,
    minDays: null,
    maxDays: null,
    unit: null,
  },
};

/**
 * Get stock status for a product/variant
 */
export function getStockStatus(
  inventoryQuantity: number | undefined | null,
  requestedQuantity: number = 1,
  allowBackorder: boolean = false
): StockResult {
  // No inventory data = assume in stock
  if (inventoryQuantity === undefined || inventoryQuantity === null) {
    return {
      ...STOCK_STATUS.IN_STOCK,
      quantity: null,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
    };
  }

  // Sold out (no backorder)
  if (inventoryQuantity <= 0 && !allowBackorder) {
    return {
      ...STOCK_STATUS.SOLD_OUT,
      quantity: 0,
      showQuantity: false,
      canPurchase: false,
      isPreOrder: false,
      isBackorder: false,
    };
  }

  // Pre-order (out of stock but backorder allowed)
  if (inventoryQuantity <= 0 && allowBackorder) {
    return {
      ...STOCK_STATUS.PRE_ORDER,
      quantity: 0,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: true,
      isBackorder: true,
    };
  }

  // Made to order (not enough stock for requested quantity, but backorder allowed)
  if (inventoryQuantity < requestedQuantity && allowBackorder) {
    return {
      ...STOCK_STATUS.MADE_TO_ORDER,
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: true,
      partialBackorder: true,
    };
  }

  // Not enough stock (no backorder) - can only buy what's available
  if (inventoryQuantity < requestedQuantity) {
    return {
      ...STOCK_STATUS.ONLY_X_LEFT,
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      maxPurchasable: inventoryQuantity,
      isPreOrder: false,
      isBackorder: false,
    };
  }

  // Only X left (1-CRITICAL_STOCK_MAX)
  if (inventoryQuantity <= DEFAULT_THRESHOLDS.CRITICAL_STOCK_MAX) {
    return {
      ...STOCK_STATUS.ONLY_X_LEFT,
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
    };
  }

  // Low stock (CRITICAL_STOCK_MAX+1 to LOW_STOCK_MAX)
  if (inventoryQuantity <= DEFAULT_THRESHOLDS.LOW_STOCK_MAX) {
    return {
      ...STOCK_STATUS.LOW_STOCK,
      quantity: inventoryQuantity,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
    };
  }

  // In stock (> 10)
  return {
    ...STOCK_STATUS.IN_STOCK,
    quantity: inventoryQuantity,
    showQuantity: false,
    canPurchase: true,
    isPreOrder: false,
    isBackorder: false,
  };
}

/**
 * Format lead time for display
 */
export function formatLeadTime(
  status: StockResult,
  t: (key: string) => string
): string | null {
  if (!status.minDays) return null;

  const min = status.unit === 'weeks' ? Math.ceil(status.minDays / 7) : status.minDays;
  const max = status.maxDays
    ? status.unit === 'weeks'
      ? Math.ceil(status.maxDays / 7)
      : status.maxDays
    : min;

  return `${min}-${max} ${t(status.unit || 'days')}`;
}

/**
 * Check if cart has any pre-order or backorder items
 */
export interface PreOrderItem {
  id: string;
  title: string;
  quantity: number;
  available: number;
  backorderQty: number;
  isFullPreOrder?: boolean;
}

export function checkCartForPreOrders(items: any[]): {
  hasPreOrder: boolean;
  hasBackorder: boolean;
  preOrderItems: PreOrderItem[];
} {
  if (!items || items.length === 0) {
    return { hasPreOrder: false, hasBackorder: false, preOrderItems: [] };
  }

  const preOrderItems: PreOrderItem[] = [];
  let hasBackorder = false;

  items.forEach((item) => {
    const inventoryQty = item.variant?.inventory_quantity;
    const allowBackorder = item.variant?.allow_backorder || false;
    const requestedQty = item.quantity;

    if (inventoryQty !== undefined && inventoryQty !== null) {
      if (inventoryQty < requestedQty && allowBackorder) {
        hasBackorder = true;
        preOrderItems.push({
          id: item.id,
          title: item.title,
          quantity: requestedQty,
          available: inventoryQty,
          backorderQty: requestedQty - inventoryQty,
        });
      } else if (inventoryQty <= 0 && allowBackorder) {
        hasBackorder = true;
        preOrderItems.push({
          id: item.id,
          title: item.title,
          quantity: requestedQty,
          available: 0,
          backorderQty: requestedQty,
          isFullPreOrder: true,
        });
      }
    }
  });

  return {
    hasPreOrder: preOrderItems.some((item) => item.isFullPreOrder),
    hasBackorder,
    preOrderItems,
  };
}
