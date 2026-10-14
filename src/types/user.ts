export interface Stats {
  orders: number;
  wishlist: number;
  reviews: number;
}

export type UserRole = 'buyer' | 'seller' | 'both' | 'admin' | 'super_admin';
export type StaffRole = 'sales_reviewer' | 'finance';
export type RegistrationRole = Extract<UserRole, 'buyer' | 'seller' | 'both'>;

export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  location: string;
  verified: boolean;
  onboardingCompleted: boolean;
  stats: Stats;
  role: UserRole;
  staffRoles: StaffRole[];
  avatarUrl?: string;
}
