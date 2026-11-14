import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppErrorPage } from '../../components/ui/AppErrorPage';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { canAccessOperations, hasStaffRole, isApprovedRider, isSuperAdmin } from '../../utils/roles';

export const NotFoundScreen = ({ title = 'We could not find this page', message = 'The link may be outdated or the page may have moved.' }: { title?: string; message?: string }) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const operations = canAccessOperations(user);
  const openHome = () => {
    if (operations) {
      const dashboard = isSuperAdmin(user) ? 'SuperAdminDashboard'
        : hasStaffRole(user, 'sales_reviewer') ? 'SalesDashboard'
        : hasStaffRole(user, 'finance') ? 'FinanceDashboard'
        : isApprovedRider(user) ? 'RiderDashboard' : 'LogisticsDashboard';
      navigation.navigate(dashboard);
    } else {
      navigation.navigate('AppTabs', { screen: 'Home', params: { screen: 'HomeFeed' } });
    }
  };
  return <AppErrorPage
    kind="not-found"
    title={title}
    message={message}
    fullPage
    onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    onHome={openHome}
    homeLabel={operations ? 'Open dashboard' : 'Browse marketplace'}
  />;
};
