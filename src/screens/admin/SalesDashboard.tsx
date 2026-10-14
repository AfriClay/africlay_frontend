import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, X, XCircle } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService, AdminKycStatus } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { hasStaffRole } from '../../utils/roles';
import { formatOperationsDate, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

export const SalesDashboard = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState<'all' | AdminKycStatus>('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number>();
  const [decision, setDecision] = useState<'approved' | 'rejected'>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const allowed = hasStaffRole(auth.user, 'sales_reviewer');
  const queue = useQuery({
    queryKey: adminKeys.kyc(status, search),
    queryFn: () => adminService.listKyc({ status: status === 'all' ? undefined : status, search: search.trim(), limit: 100 }),
    enabled: allowed,
  });
  const rows = queue.data?.results ?? [];
  const selected = useMemo(() => rows.find(item => item.id === selectedId) ?? rows[0], [rows, selectedId]);

  if (!allowed) return <ErrorState message="Sales reviewer access is required for this dashboard." />;

  const submit = async () => {
    if (!selected || !decision || busy) return;
    if (decision === 'rejected' && !reason.trim()) { setError('A rejection reason is required.'); return; }
    setBusy(true); setError(undefined);
    try {
      await adminService.reviewKyc(selected.storeSlug, decision, reason);
      await client.invalidateQueries({ queryKey: ['operations', 'kyc'] });
      setDecision(undefined); setReason('');
    } catch (value) { setError(getApiErrorMessage(value, 'Unable to record this KYC decision.')); }
    finally { setBusy(false); }
  };

  return <OperationsScaffold title="Seller verification" subtitle="Review identity and business documents. This workspace cannot access finance, account administration, taxonomy, or suspension controls.">
    <View style={styles.toolbar}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search store, seller or registration" accessibilityLabel="Search KYC submissions" containerStyle={styles.search} />
      <View style={styles.filters}>{(['pending', 'approved', 'rejected', 'all'] as const).map(value => <Pressable key={value} onPress={() => setStatus(value)} style={[styles.filter, status === value && styles.filterActive]} accessibilityRole="tab" accessibilityState={{ selected: status === value }}><Text style={[styles.filterText, status === value && styles.filterTextActive]}>{value}</Text></Pressable>)}</View>
    </View>
    {queue.isError ? <ErrorState message="Unable to load the seller verification queue." onRetry={() => void queue.refetch()} /> : <View style={styles.layout}>
      <View style={styles.queue}>
        <Text style={styles.panelHeading}>{queue.isLoading ? 'Loading submissions...' : `${queue.data?.count ?? 0} submissions`}</Text>
        {!queue.isLoading && rows.length === 0 ? <Text style={styles.empty}>No submissions match these filters.</Text> : rows.map(item => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.row, selected?.id === item.id && styles.rowActive]} accessibilityRole="button">
          <View style={styles.rowMain}><Text style={styles.rowTitle}>{item.storeName}</Text><Text style={styles.meta}>{item.ownerEmail}</Text><Text style={styles.meta}>{formatOperationsDate(item.submittedAt)}</Text></View><StatusPill value={item.status} />
        </Pressable>)}
      </View>
      <View style={styles.detail}>{selected ? <>
        <View style={styles.detailHeading}><View><Text style={styles.detailTitle}>{selected.storeName}</Text><Text style={styles.meta}>{selected.businessName}</Text></View><StatusPill value={selected.status} /></View>
        <View style={styles.fields}>
          <Field label="Seller" value={selected.ownerEmail} /><Field label="Submitted" value={formatOperationsDate(selected.submittedAt)} />
          <Field label="Registration" value={selected.registrationNumber} /><Field label="Tax number" value={selected.taxNumber} />
          <Field label="Document type" value={selected.documentType.replaceAll('_', ' ')} /><Field label="Reviewed" value={formatOperationsDate(selected.reviewedAt)} />
        </View>
        {selected.reviewerEmail ? <Text style={styles.audit}>Reviewed by {selected.reviewerEmail}</Text> : null}
        {selected.rejectionReason ? <Text style={styles.rejection}>{selected.rejectionReason}</Text> : null}
        <View style={styles.actions}>
          <Button variant="outline" disabled={!selected.documentUrl} onPress={() => selected.documentUrl && void Linking.openURL(selected.documentUrl)} icon={<ExternalLink size={17} color={operationsColors.ink} />}>Open document</Button>
          {selected.status === 'pending' ? <><Button variant="outline" onPress={() => setDecision('rejected')} icon={<XCircle size={17} color={operationsColors.red} />}>Reject</Button><Button onPress={() => setDecision('approved')} icon={<CheckCircle2 size={17} color="#FFF" />}>Approve</Button></> : null}
        </View>
      </> : <Text style={styles.empty}>Select a submission to inspect.</Text>}</View>
    </View>}
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={() => setDecision(undefined)}>
      <View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal>
        <View style={styles.modalHeading}><Text style={styles.detailTitle}>{decision === 'approved' ? 'Approve submission' : 'Reject submission'}</Text><Button variant="icon" size="sm" accessibilityLabel="Close" onPress={() => setDecision(undefined)} icon={<X size={18} color={operationsColors.ink} />} /></View>
        <Text style={styles.meta}>{selected?.storeName}</Text>
        {decision === 'rejected' ? <TextInput value={reason} onChangeText={setReason} multiline placeholder="Reason and correction required" accessibilityLabel="Rejection reason" style={styles.reason} /> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        <View style={styles.actions}><Button variant="outline" disabled={busy} onPress={() => setDecision(undefined)}>Cancel</Button><Button loading={busy} onPress={() => void submit()}>Confirm</Button></View>
      </View></View>
    </Modal>
  </OperationsScaffold>;
};

const Field = ({ label, value }: { label: string; value: string }) => <View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;

const styles = StyleSheet.create({
  toolbar: { gap: 12, marginBottom: 14 }, search: { width: '100%', maxWidth: 560 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green },
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }, queue: { flex: 1, minWidth: 280, backgroundColor: operationsColors.panel, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, overflow: 'hidden' }, detail: { flex: 1.35, minWidth: 300, backgroundColor: operationsColors.panel, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, padding: 18 }, panelHeading: { color: operationsColors.ink, fontSize: 14, fontWeight: '800', padding: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border },
  row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, rowActive: { backgroundColor: operationsColors.greenSoft, borderLeftWidth: 3, borderLeftColor: operationsColors.green }, rowMain: { flex: 1, minWidth: 0 }, rowTitle: { color: operationsColors.ink, fontSize: 14, fontWeight: '800' }, meta: { color: operationsColors.muted, fontSize: 12, marginTop: 3 }, empty: { color: operationsColors.muted, padding: 18 },
  detailHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, detailTitle: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' }, fields: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, field: { width: '50%', minWidth: 190, paddingVertical: 11, paddingRight: 12 }, label: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, value: { color: operationsColors.ink, fontSize: 13, marginTop: 4, textTransform: 'capitalize' }, audit: { color: operationsColors.green, backgroundColor: operationsColors.greenSoft, padding: 11, marginTop: 8 }, rejection: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 11, marginTop: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16,28,22,0.62)' }, modal: { width: '100%', maxWidth: 520, padding: 18, borderRadius: 6, backgroundColor: operationsColors.panel }, modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, reason: { minHeight: 110, marginTop: 14, padding: 12, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, textAlignVertical: 'top' }, error: { color: operationsColors.red, marginTop: 10 },
});
