import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BadgeCheck, BookOpenCheck, PackagePlus, Store, TrendingUp } from 'lucide-react-native';
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
  const reviewSellerPolicies = () => navigation.getParent()?.getParent()?.navigate('Policies', { policyId: 'seller-commission' });

  if (storeQuery.isError || kycQuery.isError) return <ErrorState message="Unable to check your seller account." onRetry={() => { void storeQuery.refetch(); void kycQuery.refetch(); }} />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView testID="start-selling-scroll" style={styles.scroll} contentContainerStyle={styles.content}>
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
        <View style={styles.policyBand}>
          <BookOpenCheck color={theme.colors.primary.dark} size={22} />
          <View style={styles.policyCopy}><Text style={styles.policyTitle}>Seller terms and commission</Text><Text style={styles.policyText}>Review the 10% commission policy and the terms that apply to marketplace partners.</Text></View>
          <Button size="sm" variant="tertiary" onPress={reviewSellerPolicies}>Review</Button>
        </View>
        {!isGuest && !seller && <Text style={styles.rejected}>This account has the buyer role. The backend does not support changing it to seller yet.</Text>}
        {seller && !user?.verified && <Text style={styles.rejected}>Verify your email before creating a store.</Text>}
        {kycQuery.data?.status === 'rejected' && <Text style={styles.rejected}>{kycQuery.data.rejection_reason || 'Your submission needs changes.'}</Text>}
        <Button onPress={start} disabled={(!isGuest && (!seller || !user?.verified)) || storeQuery.isLoading || kycQuery.isLoading}>
          {isGuest ? 'Create Account' : !slug ? 'Create Storefront' : kycQuery.data ? 'View Verification' : 'Submit Verification'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: theme.colors.cream },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, justifyContent: 'center', padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  hero: { alignItems: 'center' },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center', marginTop: theme.spacing.lg },
  copy: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center', marginTop: theme.spacing.sm },
  benefits: { marginVertical: theme.spacing.xl, gap: theme.spacing.md },
  benefit: { minHeight: 54, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  benefitText: { flex: 1, marginLeft: theme.spacing.md, color: theme.colors.ink },
  policyBand: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.smd, paddingVertical: theme.spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.lg },
  policyCopy: { flex: 1, minWidth: 190 },
  policyTitle: { color: theme.colors.ink, fontWeight: '800' },
  policyText: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight, marginTop: 2 },
  rejected: { color: theme.colors.error, marginBottom: theme.spacing.md, textAlign: 'center' },
});
