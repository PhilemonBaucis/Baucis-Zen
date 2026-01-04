import { create } from 'zustand';
import { storeApi, Order } from '@/lib/api/client';

interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  error: string | null;

  // Actions
  fetchOrders: (token: string, limit?: number) => Promise<void>;
  fetchOrderDetail: (orderId: string, token: string) => Promise<Order | null>;
  clearOrders: () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  currentOrder: null,
  isLoading: false,
  isLoadingDetail: false,
  error: null,

  fetchOrders: async (token: string, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const response = await storeApi.orders.list(token, limit);
      const orders = response.orders || [];

      // Sort by created_at descending
      orders.sort((a: Order, b: Order) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      set({ orders, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchOrderDetail: async (orderId: string, token: string) => {
    set({ isLoadingDetail: true, error: null });
    try {
      const response = await storeApi.orders.get(orderId, token);
      const order = response.order;
      set({ currentOrder: order, isLoadingDetail: false });
      return order;
    } catch (error: any) {
      set({ error: error.message, isLoadingDetail: false });
      return null;
    }
  },

  clearOrders: () => {
    set({ orders: [], currentOrder: null, error: null });
  },
}));

// Helper functions
export const getOrderStatusInfo = (order: Order) => {
  const status = order.fulfillment_status || order.status || 'pending';

  // Determine stage: 1 = Processing, 2 = Shipped, 3 = Delivered
  let stage = 1;
  let statusLabel = 'Processing';
  let statusColor = 'amber';

  if (status === 'shipped' || status === 'partially_shipped') {
    stage = 2;
    statusLabel = 'Shipped';
    statusColor = 'blue';
  } else if (status === 'delivered' || status === 'fulfilled' || status === 'completed') {
    stage = 3;
    statusLabel = 'Delivered';
    statusColor = 'green';
  } else if (status === 'canceled' || status === 'cancelled') {
    stage = 0;
    statusLabel = 'Cancelled';
    statusColor = 'red';
  }

  return { stage, statusLabel, statusColor };
};

export const formatOrderNumber = (order: Order) => {
  const year = new Date(order.created_at).getFullYear();
  const displayId = String(order.display_id || '').padStart(5, '0');
  return `BZ-${year}-${displayId}`;
};

export const formatOrderDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
