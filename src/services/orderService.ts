import { orders } from '../mock/orders';
import { Order } from '../types/order';
import { simulateNetwork } from './api';

let currentOrders = [...orders];

export const orderService = {
  fetchOrders: async (): Promise<Order[]> => {
    return simulateNetwork(currentOrders);
  },

  fetchOrderById: async (id: string): Promise<Order | undefined> => {
    const order = currentOrders.find(item => item.id === id);
    return simulateNetwork(order);
  },

  createOrder: async (order: Order): Promise<Order> => {
    currentOrders = [order, ...currentOrders];
    return simulateNetwork(order);
  },
};
