/**
 * Stock Configuration
 * Centralized configuration for inventory thresholds and lead times
 */

export interface LeadTime {
  minDays: number
  maxDays: number
  unit: 'days' | 'weeks'
}

export interface StockThresholds {
  LOW_STOCK_MAX: number      // Stock <= this is considered "low stock"
  CRITICAL_STOCK_MAX: number // Stock <= this shows exact count "Only X left"
}

export interface StockLeadTimes {
  IN_STOCK: LeadTime
  LOW_STOCK: LeadTime
  ONLY_X_LEFT: LeadTime
  MADE_TO_ORDER: LeadTime
  PRE_ORDER: LeadTime
}

export interface StockConfig {
  THRESHOLDS: StockThresholds
  LEAD_TIMES: StockLeadTimes
}

export const STOCK_CONFIG: StockConfig = {
  THRESHOLDS: {
    LOW_STOCK_MAX: 10,       // 5-10 items = "Low Stock"
    CRITICAL_STOCK_MAX: 4,   // 1-4 items = "Only X left"
  },
  LEAD_TIMES: {
    IN_STOCK: { minDays: 2, maxDays: 3, unit: 'days' },
    LOW_STOCK: { minDays: 2, maxDays: 4, unit: 'days' },
    ONLY_X_LEFT: { minDays: 2, maxDays: 3, unit: 'days' },
    MADE_TO_ORDER: { minDays: 14, maxDays: 21, unit: 'weeks' },
    PRE_ORDER: { minDays: 21, maxDays: 35, unit: 'weeks' },
  },
}

export type StockStatusKey = 
  | 'inStock' 
  | 'lowStock' 
  | 'onlyXLeft' 
  | 'madeToOrder' 
  | 'preOrder' 
  | 'soldOut'

export interface StockStatus {
  key: StockStatusKey
  quantity: number | null
  showQuantity: boolean
  canPurchase: boolean
  isPreOrder: boolean
  isBackorder: boolean
  leadTime: LeadTime | null
}

/**
 * Get stock status for a product variant
 */
export function getStockStatus(
  inventoryQuantity: number | null | undefined,
  requestedQuantity: number = 1,
  allowBackorder: boolean = false
): StockStatus {
  const { THRESHOLDS, LEAD_TIMES } = STOCK_CONFIG

  // No inventory data = assume in stock
  if (inventoryQuantity === undefined || inventoryQuantity === null) {
    return {
      key: 'inStock',
      quantity: null,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
      leadTime: LEAD_TIMES.IN_STOCK,
    }
  }

  // Sold out (no backorder)
  if (inventoryQuantity <= 0 && !allowBackorder) {
    return {
      key: 'soldOut',
      quantity: 0,
      showQuantity: false,
      canPurchase: false,
      isPreOrder: false,
      isBackorder: false,
      leadTime: null,
    }
  }

  // Pre-order (out of stock but backorder allowed)
  if (inventoryQuantity <= 0 && allowBackorder) {
    return {
      key: 'preOrder',
      quantity: 0,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: true,
      isBackorder: true,
      leadTime: LEAD_TIMES.PRE_ORDER,
    }
  }

  // Made to order (not enough stock for requested quantity, but backorder allowed)
  if (inventoryQuantity < requestedQuantity && allowBackorder) {
    return {
      key: 'madeToOrder',
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: true,
      leadTime: LEAD_TIMES.MADE_TO_ORDER,
    }
  }

  // Not enough stock (no backorder) - can only buy what's available
  if (inventoryQuantity < requestedQuantity) {
    return {
      key: 'onlyXLeft',
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
      leadTime: LEAD_TIMES.ONLY_X_LEFT,
    }
  }

  // Only 1-4 left (critical stock)
  if (inventoryQuantity <= THRESHOLDS.CRITICAL_STOCK_MAX) {
    return {
      key: 'onlyXLeft',
      quantity: inventoryQuantity,
      showQuantity: true,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
      leadTime: LEAD_TIMES.ONLY_X_LEFT,
    }
  }

  // Low stock (5-10)
  if (inventoryQuantity <= THRESHOLDS.LOW_STOCK_MAX) {
    return {
      key: 'lowStock',
      quantity: inventoryQuantity,
      showQuantity: false,
      canPurchase: true,
      isPreOrder: false,
      isBackorder: false,
      leadTime: LEAD_TIMES.LOW_STOCK,
    }
  }

  // In stock (> 10)
  return {
    key: 'inStock',
    quantity: inventoryQuantity,
    showQuantity: false,
    canPurchase: true,
    isPreOrder: false,
    isBackorder: false,
    leadTime: LEAD_TIMES.IN_STOCK,
  }
}

/**
 * Check if a cart has any pre-order or backorder items
 */
export interface CartItemForBackorderCheck {
  id: string
  title?: string
  quantity: number
  variant?: {
    inventory_quantity?: number
    allow_backorder?: boolean
  }
}

export interface BackorderCheckResult {
  hasPreOrder: boolean
  hasBackorder: boolean
  preOrderItems: Array<{
    id: string
    title: string
    quantity: number
    available: number
    backorderQty: number
    isFullPreOrder: boolean
  }>
}

export function checkCartForBackorders(items: CartItemForBackorderCheck[]): BackorderCheckResult {
  if (!items || items.length === 0) {
    return { hasPreOrder: false, hasBackorder: false, preOrderItems: [] }
  }

  const preOrderItems: BackorderCheckResult['preOrderItems'] = []
  let hasBackorder = false

  for (const item of items) {
    const inventoryQty = item.variant?.inventory_quantity
    const allowBackorder = item.variant?.allow_backorder || false
    const requestedQty = item.quantity

    if (inventoryQty !== undefined && inventoryQty !== null) {
      // Full pre-order (no stock, backorder allowed)
      if (inventoryQty <= 0 && allowBackorder) {
        hasBackorder = true
        preOrderItems.push({
          id: item.id,
          title: item.title || 'Unknown Product',
          quantity: requestedQty,
          available: 0,
          backorderQty: requestedQty,
          isFullPreOrder: true,
        })
      }
      // Partial backorder (some stock, need more)
      else if (inventoryQty < requestedQty && allowBackorder) {
        hasBackorder = true
        preOrderItems.push({
          id: item.id,
          title: item.title || 'Unknown Product',
          quantity: requestedQty,
          available: inventoryQty,
          backorderQty: requestedQty - inventoryQty,
          isFullPreOrder: false,
        })
      }
    }
  }

  return {
    hasPreOrder: preOrderItems.some((item) => item.isFullPreOrder),
    hasBackorder,
    preOrderItems,
  }
}

