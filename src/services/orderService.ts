import AsyncStorage from '@react-native-async-storage/async-storage';
import { orders } from '../mock/orders';
import { Order, OrderStatus } from '../types/order';
import { simulateNetwork } from './api';

const SELLER_ORDERS_KEY = 'africlay-seller-orders-v1';
let currentOrders = [...orders];

interface SellerOrderState {
  initializedSellerIds: string[];
  orders: Order[];
}

const emptySellerOrders: SellerOrderState = { initializedSellerIds: [], orders: [] };

const readSellerOrders = async (): Promise<SellerOrderState> => {
  const stored = await AsyncStorage.getItem(SELLER_ORDERS_KEY);
  if (!stored) return emptySellerOrders;
  try {
    const parsed = JSON.parse(stored) as SellerOrderState;
    return {
      initializedSellerIds: Array.isArray(parsed.initializedSellerIds) ? parsed.initializedSellerIds : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return emptySellerOrders;
  }
};

const writeSellerOrders = async (state: SellerOrderState): Promise<void> => {
  await AsyncStorage.setItem(SELLER_ORDERS_KEY, JSON.stringify(state));
};

const seedOrders = (sellerId: string): Order[] => {
  const now = new Date();
  const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: `SELL-${sellerId.slice(-6).toUpperCase()}-01`,
      date: now.toISOString(),
      status: 'New',
      sellerId,
      customerName: 'David K.',
      acceptanceDeadline: deadline,
      deliveryAddress: 'Kilimani, Nairobi',
      deliveryFee: 150,
      total: 1950,
      items: [{
        id: `${sellerId}-order-kitenge`,
        productId: `${sellerId}-kitenge-bundle`,
        name: 'Kitenge Fabric Bundle',
        quantity: 1,
        price: 1800,
        sellerId,
        thumbnailUrl: 'https://images.unsplash.com/photo-1604514628550-37477afdf4e3?auto=format&fit=crop&w=400&q=80',
      }],
    },
    {
      id: `SELL-${sellerId.slice(-6).toUpperCase()}-02`,
      date: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      status: 'Accepted',
      sellerId,
      customerName: 'Grace W.',
      deliveryAddress: 'Westlands, Nairobi',
      deliveryFee: 180,
      total: 3380,
      items: [{
        id: `${sellerId}-order-sisal`,
        productId: `${sellerId}-sisal-rug`,
        name: 'Handmade Sisal Rug',
        quantity: 1,
        price: 3200,
        sellerId,
        thumbnailUrl: 'https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=400&q=80',
      }],
    },
  ];
};

export const orderService = {
  initializeSellerOrders: async (sellerId: string): Promise<Order[]> => {
    const state = await readSellerOrders();
    if (!state.initializedSellerIds.includes(sellerId)) {
      state.initializedSellerIds.push(sellerId);
      state.orders.push(...seedOrders(sellerId));
      await writeSellerOrders(state);
    }
    return simulateNetwork(state.orders.filter(order => order.sellerId === sellerId));
  },

  fetchSellerOrders: async (sellerId: string): Promise<Order[]> => {
    const state = await readSellerOrders();
    return simulateNetwork(state.orders.filter(order => order.sellerId === sellerId));
  },

  updateSellerOrderStatus: async (sellerId: string, orderId: string, status: OrderStatus): Promise<Order> => {
    const state = await readSellerOrders();
    const index = state.orders.findIndex(order => order.id === orderId && order.sellerId === sellerId);
    if (index < 0) throw new Error('Order not found.');
    const updated = { ...state.orders[index], status } as Order;
    state.orders[index] = updated;
    await writeSellerOrders(state);
    return simulateNetwork(updated);
  },

  expireSellerOrders: async (sellerId: string): Promise<string[]> => {
    const state = await readSellerOrders();
    const now = Date.now();
    const expiredIds: string[] = [];
    state.orders = state.orders.map(order => {
      if (order.sellerId === sellerId && order.status === 'New' && order.acceptanceDeadline && new Date(order.acceptanceDeadline).getTime() <= now) {
        expiredIds.push(order.id);
        return { ...order, status: 'Cancelled' as const };
      }
      return order;
    });
    if (expiredIds.length) await writeSellerOrders(state);
    return expiredIds;
  },

  fetchOrders: async (): Promise<Order[]> => simulateNetwork(currentOrders),
  fetchOrderById: async (id: string): Promise<Order | undefined> => {
    const sellerState = await readSellerOrders();
    return simulateNetwork(currentOrders.find(item => item.id === id) ?? sellerState.orders.find(item => item.id === id));
  },
  createOrder: async (order: Order): Promise<Order> => {
    currentOrders = [order, ...currentOrders];
    return simulateNetwork(order);
  },
};
