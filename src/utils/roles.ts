import { StaffRole, User, UserRole } from '../types/user';

export const canAccessSellerTools = (role?: UserRole): boolean => role === 'seller' || role === 'both';

export const canAccessBuyerTools = (role?: UserRole): boolean =>
  role === 'buyer' || role === 'seller' || role === 'both' || role === 'admin' || role === 'super_admin';

export const isSuperAdmin = (user?: User): boolean => user?.role === 'super_admin';

export const hasStaffRole = (user: User | undefined, role: StaffRole): boolean =>
  isSuperAdmin(user) || Boolean(user?.staffRoles.includes(role));

export const canAccessOperations = (user?: User): boolean =>
  isSuperAdmin(user) || Boolean(user?.staffRoles.length);
