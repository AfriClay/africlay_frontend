import { UserRole } from '../types/user';

export const canAccessSellerTools = (role?: UserRole): boolean => role === 'seller' || role === 'both';
