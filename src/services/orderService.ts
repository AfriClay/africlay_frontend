import { apiClient } from './api';
import { Order, OrderStatus } from '../types/order';

type BackendOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: string | number;
  seller_id: string;
};

type BackendOrder = {
  id: string;
  total_amount: string | number;
  currency: string;
  status: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  items: BackendOrderItem[];
  created_at: string;
};

const statusMap: Record<string, OrderStatus> = {
  pending: 'Processing',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const asOrder = (order: BackendOrder): Order => ({
  id: order.id,
  date: order.created_at,
  status: statusMap[order.status] ?? 'Processing',
  sellerId: order.items[0]?.seller_id ?? '',
  deliveryAddress: `${order.shipping_address}, ${order.shipping_city}`,
  deliveryFee: 0,
  shippingPostalCode: order.shipping_postal_code,
  shippingCountry: order.shipping_country,
  total: Number(order.total_amount),
  items: order.items.map(item => ({
    id: item.id,
    productId: item.product_id,
    name: item.product_name,
    quantity: item.quantity,
    price: Number(item.price_at_purchase),
    sellerId: item.seller_id,
  })),
});

export const orderService = {
  fetchOrders: async (): Promise<Order[]> => {
    const orders = await apiClient<BackendOrder[]>('/cart/orders/');
    return orders.map(asOrder);
  },

  fetchOrderById: async (id: string): Promise<Order | undefined> => {
    const order = await apiClient<BackendOrder>(`/cart/orders/${id}/`);
    return asOrder(order);
  },

  createOrder: async (order: Order): Promise<Order> => {
    for (const item of order.items) {
      await apiClient('/cart/items/', {
        method: 'POST',
        body: { product: item.productId, quantity: item.quantity },
      });
    }

    const addressParts = order.deliveryAddress.split('\n');
    const created = await apiClient<BackendOrder>('/cart/checkout/', {
      method: 'POST',
      body: {
        shipping_address: addressParts[1] ?? addressParts[0],
        shipping_city: addressParts[1]?.split(',').pop()?.trim() ?? 'Nairobi',
        shipping_postal_code: order.shippingPostalCode ?? '',
        shipping_country: order.shippingCountry ?? '',
      },
    });
    return asOrder(created);
  },

  initializeSellerOrders: async (_sellerId: string): Promise<Order[]> => [],
  fetchSellerOrders: async (_sellerId: string): Promise<Order[]> => [],
  updateSellerOrderStatus: async (_sellerId: string, _orderId: string, _status: OrderStatus): Promise<Order> => {
    throw new Error('The backend does not expose seller order management endpoints.');
  },
  expireSellerOrders: async (_sellerId: string): Promise<string[]> => [],
};
