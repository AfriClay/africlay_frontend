import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { FormFrame } from '../../components/layout/FormFrame';
import { useAuth } from '../../hooks/useAuth';
import { storeService } from '../../services/storeService';
import { catalogKeys } from '../../services/catalogQueries';
import { theme } from '../../theme';

export const VerificationPending: React.FC = () => {
  const navigation = useNavigation<any>();
  const client = useQueryClient();
  const userId = useAuth().user?.id ?? '';
  const storeQuery = useQuery({ queryKey: ['owned-store', userId], queryFn: () => storeService.ownStore(userId), enabled: Boolean(userId) });
  const slug = storeQuery.data?.slug ?? '';
  const query = useQuery({ queryKey: ['store-kyc', slug], queryFn: () => storeService.kyc(slug), enabled: Boolean(slug), refetchOnMount: 'always' });
  if (storeQuery.isError || query.isError) return <ErrorState message="Unable to check verification status." onRetry={() => { void storeQuery.refetch(); void query.refetch(); }} />;
  const kyc = query.data;
  return <FormFrame style={styles.container}>
    <View style={styles.icon}><Clock3 color={theme.colors.secondary.DEFAULT} size={38} /></View>
    <Text style={styles.title}>{kyc?.status === 'approved' ? 'Verification approved' : kyc?.status === 'rejected' ? 'Verification rejected' : 'Verification pending'}</Text>
    <Text style={styles.copy}>{storeQuery.isLoading || query.isLoading ? 'Checking your submission...' :
      kyc?.status === 'approved' ? 'Your store can now publish products and services.' :
      kyc?.status === 'rejected' ? kyc.rejection_reason || 'Please review your documents and resubmit.' :
      kyc ? 'Your documents are awaiting review.' : 'No verification submission was found.'}</Text>
    <View style={styles.notice}><ShieldCheck color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.noticeText}>Only Django can approve a seller submission.</Text></View>
    {kyc?.status === 'rejected' || (!kyc && !query.isLoading) ? <Button onPress={() => navigation.navigate('KYCUpload')}>Submit Documents</Button> :
      <Button variant="outline" onPress={() => { void query.refetch(); if (userId) void client.invalidateQueries({ queryKey: catalogKeys.sellerAccess(userId) }); }}>Refresh Status</Button>}
  </FormFrame>;
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.cream },
  icon: { width: 76, height: 76, borderRadius: 38, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary.tint },
  title: { marginTop: theme.spacing.lg, color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center' },
  copy: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center', marginTop: theme.spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.tint, marginVertical: theme.spacing.xl },
  noticeText: { flex: 1, marginLeft: theme.spacing.sm, color: theme.colors.primary.dark },
});
