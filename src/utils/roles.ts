import { UserRole } from '../types/user';

export const canAccessSellerTools = (role?: UserRole): boolean => role === 'seller' || role === 'both';

export const canAccessBuyerTools = (role?: UserRole): boolean =>
  role === 'buyer' || role === 'seller' || role === 'both' || role === 'admin' || role === 'super_admin';
