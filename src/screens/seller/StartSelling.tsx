import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BadgeCheck, PackagePlus, Store, TrendingUp } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { useQuery } from '@tanstack/react-query';
import { storeService } from '../../services/storeService';
import { ErrorState } from '../../components/ui/ErrorState';

const benefits = [
  { icon: Store, text: 'Create your own AfriClay storefront' },
  { icon: PackagePlus, text: 'List and manage products from your phone' },
  { icon: TrendingUp, text: 'Manage your products and services' },
];

export const StartSelling: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isGuest, user } = useAuth();
  const seller = user?.role === 'seller' || user?.role === 'both';
  const userId = user?.id ?? '';
  const storeQuery = useQuery({ queryKey: ['owned-store', userId], queryFn: () => storeService.ownStore(userId), enabled: Boolean(userId && seller) });
  const slug = storeQuery.data?.slug ?? '';
  const kycQuery = useQuery({ queryKey: ['store-kyc', slug], queryFn: () => storeService.kyc(slug), enabled: Boolean(slug) });

  const start = () => {
    if (isGuest) {
      navigation.getParent()?.getParent()?.navigate('AuthStack');
      return;
    }
    if (!seller || !user?.verified) return;
    navigation.navigate(!slug ? 'StorefrontSetup' : kycQuery.data ? 'VerificationPending' : 'KYCUpload');
  };

  if (storeQuery.isError || kycQuery.isError) return <ErrorState message="Unable to check your seller account." onRetry={() => { void storeQuery.refetch(); void kycQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.icon}><BadgeCheck color={theme.colors.secondary.DEFAULT} size={38} /></View>
        <Text style={styles.title}>Start Selling on AfriClay</Text>
        <Text style={styles.copy}>Create a storefront and submit verification documents before publishing.</Text>
      </View>
      <View style={styles.benefits}>
        {benefits.map(item => {
          const Icon = item.icon;
          return <View key={item.text} style={styles.benefit}><Icon color={theme.colors.primary.DEFAULT} size={22} /><Text style={styles.benefitText}>{item.text}</Text></View>;
        })}
      </View>
      {!isGuest && !seller && <Text style={styles.rejected}>This account has the buyer role. The backend does not support changing it to seller yet.</Text>}
      {seller && !user?.verified && <Text style={styles.rejected}>Verify your email before creating a store.</Text>}
      {kycQuery.data?.status === 'rejected' && <Text style={styles.rejected}>{kycQuery.data.rejection_reason || 'Your submission needs changes.'}</Text>}
      <Button onPress={start} disabled={(!isGuest && (!seller || !user?.verified)) || storeQuery.isLoading || kycQuery.isLoading}>
        {isGuest ? 'Create Account' : !slug ? 'Create Storefront' : kycQuery.data ? 'View Verification' : 'Submit Verification'}
      </Button>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.cream },
  hero: { alignItems: 'center' },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center', marginTop: theme.spacing.lg },
  copy: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center', marginTop: theme.spacing.sm },
  benefits: { marginVertical: theme.spacing.xl, gap: theme.spacing.md },
  benefit: { minHeight: 54, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  benefitText: { flex: 1, marginLeft: theme.spacing.md, color: theme.colors.ink },
  rejected: { color: theme.colors.error, marginBottom: theme.spacing.md, textAlign: 'center' },
});
