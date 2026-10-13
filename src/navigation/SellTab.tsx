import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { ErrorState } from '../components/ui/ErrorState';
import { catalogKeys } from '../services/catalogQueries';
import { productService } from '../services/productService';
import { SellerDashboardStack } from './SellerDashboardStack';
import { SellOnboardingStack } from './SellOnboardingStack';
import { EmptyState } from '../components/ui/EmptyState';
import { canAccessSellerTools } from '../utils/roles';
import { AuthRequiredState } from '../components/ui/AuthRequiredState';

export const SellTab: React.FC = () => {
  const { user } = useAuth();
  const sellerRole = canAccessSellerTools(user?.role);
  const ownerId = user?.id ?? '';
  const accessQuery = useQuery({
    queryKey: catalogKeys.sellerAccess(ownerId),
    queryFn: () => productService.hasApprovedSellerAccess(ownerId),
    enabled: sellerRole && Boolean(user?.verified),
  });

  if (!user) {
    return <AuthRequiredState title="Log in to sell on AfriClay" description="Seller onboarding, listings, orders, and store management require an account." />;
  }

  if (!sellerRole) {
    return <EmptyState title="Seller access required" description="Seller tools are available to accounts registered as sellers or buyers and sellers." />;
  }

  if (sellerRole && user?.verified && accessQuery.isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Checking seller access" /></View>;
  }
  if (sellerRole && accessQuery.isError) {
    return <ErrorState message="Unable to check seller access." onRetry={() => void accessQuery.refetch()} />;
  }
  return accessQuery.data ? <SellerDashboardStack /> : <SellOnboardingStack />;
};
