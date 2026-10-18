import React, { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, X, XCircle } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService, AdminKycStatus } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { hasStaffRole } from '../../utils/roles';
import { DataFreshness, formatOperationsDate, formatQueueAge, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

export const SalesDashboard = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const [status, setStatus] = useState<'all' | AdminKycStatus>('pending');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rangeDays, setRangeDays] = useState(0);
  const [selectedId, setSelectedId] = useState<number>();
  const [decision, setDecision] = useState<'approved' | 'rejected'>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const allowed = hasStaffRole(auth.user, 'sales_reviewer');
  const queueFilters = { status: status === 'all' ? undefined : status, search: search.trim(), submitted_from: dateFrom, submitted_to: dateTo, limit: 100 };
  const queue = useQuery({ queryKey: adminKeys.kyc(status, search, dateFrom, dateTo), queryFn: () => adminService.listKyc(queueFilters), enabled: allowed });
  const summary = useQuery({ queryKey: adminKeys.kycSummary(dateFrom, dateTo), queryFn: () => adminService.kycSummary({ submitted_from: dateFrom, submitted_to: dateTo }), enabled: allowed });
  const rows = queue.data?.results ?? [];
  const selected = useMemo(() => rows.find(item => item.id === selectedId) ?? rows[0], [rows, selectedId]);

  if (!allowed) return <ErrorState message="Sales reviewer access is required for this dashboard." />;

  const submit = async () => {
    if (!selected || !decision || busy) return;
    if (decision === 'rejected' && !reason.trim()) { setError('A rejection reason is required.'); return; }
    setBusy(true); setError(undefined);
    try {
      await adminService.reviewKyc(selected.storeSlug, decision, reason);
      await Promise.all([client.invalidateQueries({ queryKey: ['operations', 'kyc'] }), client.invalidateQueries({ queryKey: ['operations', 'kyc-summary'] })]);
      setDecision(undefined); setReason('');
    } catch (value) { setError(getApiErrorMessage(value, 'Unable to record this KYC decision.')); }
    finally { setBusy(false); }
  };
  const setRange = (days: number) => {
    const to = new Date(); const from = new Date(); from.setDate(to.getDate() - days + 1);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    setDateFrom(localDate(from)); setDateTo(localDate(to)); setRangeDays(days);
  };

  return <OperationsScaffold title="Seller verification" subtitle="Onboarding funnel, queue aging, reviewer workload, and direct KYC decisions. Finance and account administration remain separate.">
    <DataFreshness updatedAt={Math.max(queue.dataUpdatedAt, summary.dataUpdatedAt)} refreshing={queue.isFetching || summary.isFetching} onRefresh={() => void Promise.all([queue.refetch(), summary.refetch()])} />
    {summary.isError ? <ErrorState message="Unable to load seller verification totals." onRetry={() => void summary.refetch()} /> : <>
      <View style={styles.metrics}>
        <Metric label="Submitted" value={summary.data?.counts.total ?? '...'} note="Selected period" onPress={() => setStatus('all')} />
        <Metric label="Pending" value={summary.data?.counts.pending ?? '...'} note="Awaiting review" onPress={() => setStatus('pending')} />
        <Metric label="Approved" value={summary.data?.counts.approved ?? '...'} note="Selected period" onPress={() => setStatus('approved')} />
        <Metric label="Rejected" value={summary.data?.counts.rejected ?? '...'} note="Selected period" onPress={() => setStatus('rejected')} />
        <Metric label="Over 7 days" value={summary.data?.pendingAging.over7Days ?? '...'} note="High-priority backlog" onPress={() => { setStatus('pending'); setDateFrom(''); setDateTo(''); setRangeDays(0); }} urgent />
      </View>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryPanel}><Text style={styles.panelHeading}>Current pending age</Text><SummaryLine label="Under 3 days" value={summary.data?.pendingAging.under3Days ?? 0} /><SummaryLine label="3 to 7 days" value={summary.data?.pendingAging.days3To7 ?? 0} /><SummaryLine label="Over 7 days" value={summary.data?.pendingAging.over7Days ?? 0} /></View>
        <View style={styles.summaryPanel}><Text style={styles.panelHeading}>Reviewer workload</Text>{summary.data?.reviewerWorkload.length ? summary.data.reviewerWorkload.map(item => <View key={item.reviewerEmail} style={styles.workload}><View style={styles.rowMain}><Text style={styles.rowTitle}>{item.reviewerEmail}</Text><Text style={styles.meta}>{item.approved} approved - {item.rejected} rejected</Text></View><Text style={styles.workloadValue}>{item.reviewed}</Text></View>) : <Text style={styles.empty}>No reviews in this period.</Text>}</View>
      </View>
    </>}
    <View style={styles.toolbar}>
      <SearchField value={search} onChangeText={setSearch} placeholder="Search store, seller or registration" accessibilityLabel="Search KYC submissions" containerStyle={styles.search} />
      <View style={styles.filters}>{(['pending', 'approved', 'rejected', 'all'] as const).map(value => <Filter key={value} label={value} active={status === value} onPress={() => setStatus(value)} />)}</View>
      <View style={styles.filters}>{[7, 30, 90].map(days => <Filter key={days} label={`${days} days`} active={rangeDays === days} onPress={() => setRange(days)} />)}<Filter label="All time" active={!dateFrom && !dateTo} onPress={() => { setDateFrom(''); setDateTo(''); setRangeDays(0); }} /></View>
      <View style={styles.dateRow}><Input label="From" optional value={dateFrom} onChangeText={value => { setDateFrom(value); setRangeDays(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="KYC start date" containerStyle={styles.dateField} /><Input label="To" optional value={dateTo} onChangeText={value => { setDateTo(value); setRangeDays(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="KYC end date" containerStyle={styles.dateField} /></View>
    </View>
    {queue.isError ? <ErrorState message="Unable to load the seller verification queue." onRetry={() => void queue.refetch()} /> : <View style={styles.layout}>
      <View style={styles.queue}>
        <Text style={styles.panelHeading}>{queue.isLoading ? 'Loading submissions...' : `${queue.data?.count ?? 0} submissions`}</Text>
        {!queue.isLoading && rows.length === 0 ? <Text style={styles.empty}>No submissions match these filters.</Text> : rows.map(item => { const age = queueAge(item.submittedAt); return <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.row, selected?.id === item.id && styles.rowActive]} accessibilityRole="button">
          <View style={styles.rowMain}><Text style={styles.rowTitle}>{item.storeName}</Text><Text style={styles.meta}>{item.ownerEmail}</Text><Text style={styles.meta}>{formatOperationsDate(item.submittedAt)} - {formatQueueAge(item.submittedAt)}</Text></View><View style={styles.rowState}><StatusPill value={item.status} />{item.status === 'pending' ? <Text style={[styles.priority, age === 'high' && styles.priorityHigh]}>{age} priority</Text> : null}</View>
        </Pressable>; })}
      </View>
      <View style={styles.detail}>{selected ? <>
        <View style={styles.detailHeading}><View><Text style={styles.detailTitle}>{selected.storeName}</Text><Text style={styles.meta}>{selected.businessName}</Text></View><StatusPill value={selected.status} /></View>
        <View style={styles.fields}><Field label="Seller" value={selected.ownerEmail} /><Field label="Submitted" value={`${formatOperationsDate(selected.submittedAt)} (${formatQueueAge(selected.submittedAt)})`} /><Field label="Registration" value={selected.registrationNumber} /><Field label="Tax number" value={selected.taxNumber} /><Field label="Document type" value={selected.documentType.replaceAll('_', ' ')} /><Field label="Reviewed" value={formatOperationsDate(selected.reviewedAt)} /></View>
        {selected.reviewerEmail ? <Text style={styles.audit}>Reviewed by {selected.reviewerEmail}</Text> : null}
        {selected.rejectionReason ? <Text style={styles.rejection}>{selected.rejectionReason}</Text> : null}
        <View style={styles.actions}><Button variant="outline" disabled={!selected.documentUrl} onPress={() => selected.documentUrl && void Linking.openURL(selected.documentUrl)} icon={<ExternalLink size={17} color={operationsColors.ink} />}>Open document</Button>{selected.status === 'pending' ? <><Button variant="outline" onPress={() => setDecision('rejected')} icon={<XCircle size={17} color={operationsColors.red} />}>Reject</Button><Button onPress={() => setDecision('approved')} icon={<CheckCircle2 size={17} color="#FFF" />}>Approve</Button></> : null}</View>
      </> : <Text style={styles.empty}>Select a submission to inspect.</Text>}</View>
    </View>}
    <View style={styles.recent}><Text style={styles.panelHeading}>Recent review activity</Text>{summary.data?.recentActivity.length ? summary.data.recentActivity.map(item => <View key={item.id} style={styles.activityRow}><View style={styles.rowMain}><Text style={styles.rowTitle}>{item.storeName}</Text><Text style={styles.meta}>{item.reviewerEmail || 'Reviewer unavailable'} - {formatOperationsDate(item.reviewedAt)}</Text></View><StatusPill value={item.status} /></View>) : <Text style={styles.empty}>No review activity in this period.</Text>}</View>
    <Modal visible={Boolean(decision)} transparent animationType="fade" onRequestClose={() => setDecision(undefined)}><View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal><View style={styles.modalHeading}><Text style={styles.detailTitle}>{decision === 'approved' ? 'Approve submission' : 'Reject submission'}</Text><Button variant="icon" size="sm" accessibilityLabel="Close" onPress={() => setDecision(undefined)} icon={<X size={18} color={operationsColors.ink} />} /></View><Text style={styles.meta}>{selected?.storeName}</Text>{decision === 'rejected' ? <Input label="Rejection reason" required value={reason} onChangeText={setReason} multiline placeholder="Reason and correction required" accessibilityLabel="Rejection reason" /> : null}{error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}<View style={styles.actions}><Button variant="outline" disabled={busy} onPress={() => setDecision(undefined)}>Cancel</Button><Button loading={busy} onPress={() => void submit()}>Confirm</Button></View></View></View></Modal>
  </OperationsScaffold>;
};

const queueAge = (value?: string): 'low' | 'medium' | 'high' => { if (!value) return 'low'; const days = (Date.now() - new Date(value).getTime()) / 86_400_000; return days >= 8 ? 'high' : days >= 3 ? 'medium' : 'low'; };
const Filter = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
const Metric = ({ label, value, note, onPress, urgent }: { label: string; value: string | number; note: string; onPress: () => void; urgent?: boolean }) => <Pressable onPress={onPress} style={[styles.metric, urgent && styles.metricUrgent]} accessibilityRole="button"><Text style={[styles.metricValue, urgent && styles.metricValueUrgent]}>{value}</Text><Text style={styles.rowTitle}>{label}</Text><Text style={styles.meta}>{note}</Text></Pressable>;
const SummaryLine = ({ label, value }: { label: string; value: number }) => <View style={styles.summaryLine}><Text style={styles.meta}>{label}</Text><Text style={styles.rowTitle}>{value}</Text></View>;
const Field = ({ label, value }: { label: string; value: string }) => <View style={styles.field}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 12 }, metric: { flexGrow: 1, flexBasis: 150, minHeight: 100, padding: 13, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, metricUrgent: { borderColor: operationsColors.red, backgroundColor: operationsColors.redSoft }, metricValue: { color: operationsColors.green, fontSize: 23, fontWeight: '800' }, metricValueUrgent: { color: operationsColors.red }, summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 }, summaryPanel: { flex: 1, minWidth: 280, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, summaryLine: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: operationsColors.border }, workload: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderTopWidth: 1, borderTopColor: operationsColors.border }, workloadValue: { color: operationsColors.green, fontSize: 18, fontWeight: '800' },
  toolbar: { gap: 10, marginBottom: 14 }, search: { width: '100%', maxWidth: 560 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green }, dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dateField: { flexGrow: 1, minWidth: 170, marginBottom: 0 },
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }, queue: { flex: 1, minWidth: 280, backgroundColor: operationsColors.panel, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, overflow: 'hidden' }, detail: { flex: 1.35, minWidth: 280, backgroundColor: operationsColors.panel, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, padding: 18 }, panelHeading: { color: operationsColors.ink, fontSize: 14, fontWeight: '800', padding: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, row: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, rowActive: { backgroundColor: operationsColors.greenSoft, borderLeftWidth: 3, borderLeftColor: operationsColors.green }, rowMain: { flex: 1, minWidth: 0 }, rowState: { alignItems: 'flex-end', gap: 5 }, rowTitle: { color: operationsColors.ink, fontSize: 14, fontWeight: '800' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 3 }, priority: { color: operationsColors.amber, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }, priorityHigh: { color: operationsColors.red }, empty: { color: operationsColors.muted, padding: 18 },
  detailHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, detailTitle: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' }, fields: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }, field: { width: '50%', minWidth: 190, paddingVertical: 11, paddingRight: 12 }, label: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, value: { color: operationsColors.ink, fontSize: 13, marginTop: 4 }, audit: { color: operationsColors.green, backgroundColor: operationsColors.greenSoft, padding: 11, marginTop: 8 }, rejection: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 11, marginTop: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  recent: { marginTop: 14, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, activityRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: operationsColors.border }, backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16,28,22,0.62)' }, modal: { width: '100%', maxWidth: 520, padding: 18, borderRadius: 6, backgroundColor: operationsColors.panel }, modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, error: { color: operationsColors.red, marginTop: 10 },
});
