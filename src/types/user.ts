export interface Stats {
  orders: number;
  wishlist: number;
  reviews: number;
}

export type UserRole = 'buyer' | 'seller' | 'both' | 'admin' | 'super_admin';
export type StaffRole = 'sales_reviewer' | 'finance' | 'logistics';
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
  approvedRider?: boolean;
  avatarUrl?: string;
  notificationPreferences?: {
    email_order_updates: boolean;
    email_seller_sales: boolean;
    email_booking_updates: boolean;
    email_seller_bookings: boolean;
    email_wallet_updates: boolean;
    email_promotions: boolean;
    sms_order_updates: boolean;
    sms_seller_sales: boolean;
    sms_booking_updates: boolean;
    sms_seller_bookings: boolean;
    sms_wallet_updates: boolean;
  };
}
