import { Order } from '../types/order';

export const orders: Order[] = [
  {
    id: 'AFR12345',
    date: '2026-07-24',
    status: 'Processing',
    sellerId: 'seller-zuri',
    deliveryAddress: 'Kilimani, Nairobi',
    deliveryFee: 150,
    total: 1500,
    items: [
      {
        id: 'item-necklace',
        productId: 'prod-necklace',
        name: 'Maasai Beaded Necklace',
        quantity: 1,
        price: 1500,
        sellerId: 'seller-zuri',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
  {
    id: 'AFR12344',
    date: '2026-07-20',
    status: 'Shipped',
    sellerId: 'seller-zuri',
    deliveryAddress: 'Westlands, Nairobi',
    deliveryFee: 100,
    total: 400,
    items: [
      {
        id: 'item-avocado',
        productId: 'prod-avocado',
        name: 'Organic Avocados',
        quantity: 2,
        price: 200,
        sellerId: 'seller-zuri',
        thumbnailUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
  {
    id: 'AFR12343',
    date: '2026-07-12',
    status: 'Delivered',
    sellerId: 'seller-zuri',
    deliveryAddress: 'Karen, Nairobi',
    deliveryFee: 120,
    total: 2120,
    items: [
      {
        id: 'item-basket',
        productId: 'prod-basket',
        name: 'Handwoven Basket',
        quantity: 1,
        price: 2000,
        sellerId: 'seller-zuri',
        thumbnailUrl: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=400&q=80',
      },
    ],
  },
];
