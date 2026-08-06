import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { SellerDashboardStack } from './SellerDashboardStack';
import { SellOnboardingStack } from './SellOnboardingStack';

export const SellTab: React.FC = () => {
  const { role, verificationStatus, storefront } = useAuth();
  const sellerAccess = (role === 'seller' || role === 'both') && verificationStatus === 'approved' && Boolean(storefront);
  return sellerAccess ? <SellerDashboardStack /> : <SellOnboardingStack />;
};
