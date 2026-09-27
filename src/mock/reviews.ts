import { Review } from '../types/review';

export const reviews: Review[] = [
  {
    id: 'review-1',
    reviewerEmail: 'james@example.com',
    rating: 5,
    comment: 'Beautiful quality and fast service from Zuri Crafts.',
    productId: '00000000-0000-0000-0000-000000000001',
    createdAt: '2026-07-21T00:00:00Z',
    updatedAt: '2026-07-21T00:00:00Z',
  },
  {
    id: 'review-2',
    reviewerEmail: 'amara@example.com',
    rating: 4,
    comment: 'The necklace exceeded my expectations.',
    productId: '00000000-0000-0000-0000-000000000002',
    createdAt: '2026-06-30T00:00:00Z',
    updatedAt: '2026-06-30T00:00:00Z',
  },
];
