import { User } from '../types/user';

export const currentUser: User = {
  id: 'user-1',
  name: 'Wanjiku M.',
  location: 'Nairobi, Kenya',
  verified: true,
  onboardingCompleted: true,
  role: 'buyer',
  staffRoles: [],
  stats: {
    orders: 12,
    wishlist: 8,
    reviews: 5,
  },
};
