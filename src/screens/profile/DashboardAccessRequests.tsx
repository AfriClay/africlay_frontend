import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import type { StaffRole } from '../../types/user';
import { theme } from '../../theme';

export const DashboardAccessRequests = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const [role, setRole] = useState<StaffRole>('sales_reviewer');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const requests = useQuery({ queryKey: adminKeys.ownAccessRequests, queryFn: adminService.listOwnAccessRequests, enabled: Boolean(auth.user) });
  if (!auth.user) return <ErrorState message="Log in before requesting dashboard access." />;
  const submit = async () => {
    if (!reason.trim() || busy) { setError('Explain why you need this dashboard access.'); return; }
    setBusy(true); setError(undefined);
    try { await adminService.requestDashboardAccess(role, reason); await client.invalidateQueries({ queryKey: adminKeys.ownAccessRequests }); setReason(''); }
    catch (value) { setError(getApiErrorMessage(value, 'Unable to submit this access request.')); }
    finally { setBusy(false); }
  };
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Text style={styles.title}>Operations access</Text><Text style={styles.copy}>Request only the workspace required for your assigned duties. A super administrator reviews every request before access is granted.</Text>
    <View style={styles.selector}>{(['sales_reviewer', 'finance'] as StaffRole[]).map(value => <Pressable key={value} onPress={() => setRole(value)} style={[styles.option, role === value && styles.optionActive]} accessibilityRole="radio" accessibilityState={{ checked: role === value }}><Text style={[styles.optionText, role === value && styles.optionTextActive]}>{value === 'sales_reviewer' ? 'Sales / seller verification' : 'Finance'}</Text></Pressable>)}</View>
    <TextInput value={reason} onChangeText={setReason} multiline placeholder="Describe your responsibility and why access is needed" accessibilityLabel="Dashboard access request reason" style={styles.reason} />
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}<Button loading={busy} onPress={() => void submit()}>Submit request</Button>
    <Text style={styles.heading}>Request history</Text>{requests.isError ? <ErrorState message="Unable to load your access requests." onRetry={() => void requests.refetch()} /> : requests.data?.results.length ? requests.data.results.map(item => <View key={item.id} style={styles.row}><View style={styles.main}><Text style={styles.rowTitle}>{item.requestedRole.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('en-KE')} - {item.status}</Text><Text style={styles.meta}>{item.reviewReason || item.requestReason}</Text></View></View>) : <Text style={styles.empty}>No requests submitted.</Text>}
  </ScrollView>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.cream }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: theme.spacing.lg, paddingBottom: 60 }, title: { color: theme.colors.ink, fontSize: 25, fontWeight: '800' }, copy: { color: theme.colors.muted, lineHeight: 21, marginTop: 7, marginBottom: 18 }, selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, backgroundColor: theme.colors.white }, optionActive: { borderColor: theme.colors.primary.dark, backgroundColor: theme.colors.primary.tint }, optionText: { color: theme.colors.muted, fontWeight: '700' }, optionTextActive: { color: theme.colors.primary.dark }, reason: { minHeight: 120, marginVertical: 14, padding: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, backgroundColor: theme.colors.white, color: theme.colors.ink }, error: { color: theme.colors.error, marginBottom: 10 }, heading: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 8 }, row: { minHeight: 72, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }, main: { flex: 1 }, rowTitle: { color: theme.colors.ink, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: theme.colors.muted, fontSize: 12, marginTop: 4 }, empty: { color: theme.colors.muted, paddingVertical: 14 },
});
