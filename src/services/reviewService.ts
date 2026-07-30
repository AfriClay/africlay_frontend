import { reviews } from '../mock/reviews';
import { Review } from '../types/review';
import { simulateNetwork } from './api';

export const reviewService = {
  fetchReviews: async (): Promise<Review[]> => {
    return simulateNetwork(reviews);
  },
};
