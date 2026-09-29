import { z } from 'zod';
import { Review } from '../types/review';
import { apiClient } from './api';
import { parseCommerce, parseCommerceList } from './commerceContract';

export type ReviewTarget = { type: 'product' | 'service' | 'store'; id: string };

const reviewSchema = z.object({
  id: z.string().uuid(),
  reviewer_email: z.string().email(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  product: z.string().uuid().nullish(),
  service: z.string().uuid().nullish(),
  store: z.string().uuid().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});

const toReview = (value: z.infer<typeof reviewSchema>): Review => ({
  id: value.id,
  reviewerEmail: value.reviewer_email,
  rating: value.rating,
  comment: value.comment,
  productId: value.product ?? undefined,
  serviceId: value.service ?? undefined,
  storeId: value.store ?? undefined,
  createdAt: value.created_at,
  updatedAt: value.updated_at,
});

export const reviewKeys = {
  target: (target: ReviewTarget) => ['reviews', target.type, target.id] as const,
};

export const reviewService = {
  list: async (target: ReviewTarget): Promise<Review[]> =>
    parseCommerceList(reviewSchema, await apiClient(`/reviews/?${target.type}=${encodeURIComponent(target.id)}`, { auth: false })).map(toReview),
  create: async (target: ReviewTarget, rating: number, comment: string): Promise<Review> =>
    toReview(parseCommerce(reviewSchema, await apiClient('/reviews/', {
      method: 'POST', body: { [target.type]: target.id, rating, comment },
    }))),
  update: async (id: string, rating: number, comment: string): Promise<Review> =>
    toReview(parseCommerce(reviewSchema, await apiClient(`/reviews/${encodeURIComponent(id)}/`, {
      method: 'PATCH', body: { rating, comment },
    }))),
  remove: async (id: string): Promise<void> => {
    await apiClient(`/reviews/${encodeURIComponent(id)}/`, { method: 'DELETE' });
  },
};
