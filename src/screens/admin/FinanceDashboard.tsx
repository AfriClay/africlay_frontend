import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService, AdminPayoutStatus } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { hasStaffRole, isSuperAdmin } from '../../utils/roles';
import { formatOperationsDate, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

const PAGE_SIZE = 30;

export const FinanceDashboard = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const allowed = hasStaffRole(auth.user, 'finance');
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [payoutStatus, setPayoutStatus] = useState<'all' | AdminPayoutStatus>('all');
  const [selectedId, setSelectedId] = useState<string>();
  const [resolution, setResolution] = useState<'succeeded' | 'failed'>();
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const filters = useMemo(() => ({ search: search.trim(), entry_type: entryType, payment_status: paymentStatus, provider: 'mpesa', date_from: dateFrom, date_to: dateTo, limit: PAGE_SIZE, offset }), [search, entryType, paymentStatus, dateFrom, dateTo, offset]);
  const summary = useQuery({ queryKey: adminKeys.finance, queryFn: adminService.financeSummary, enabled: allowed });
  const transactions = useQuery({ queryKey: adminKeys.transactions(filters), queryFn: () => adminService.listTransactions(filters), enabled: allowed });
  const payouts = useQuery({ queryKey: adminKeys.payouts(payoutStatus, search), queryFn: () => adminService.listPayouts({ status: payoutStatus === 'all' ? undefined : payoutStatus, search: search.trim(), limit: 100 }), enabled: allowed });
  const selectedPayout = payouts.data?.results.find(item => item.id === selectedId) ?? payouts.data?.results[0];

  if (!allowed) return <ErrorState message="Finance access is required for this dashboard." />;
  const exportCsv = async () => {
    setActionError(undefined);
    try { await adminService.downloadTransactions(filters); }
    catch (value) { setActionError(getApiErrorMessage(value, 'Unable to download the report.')); }
  };
  const reconcile = async () => {
    if (!selectedPayout || !resolution || busy) return;
    if (!note.trim() || (resolution === 'succeeded' && !receipt.trim())) { setActionError('A verification note and receipt for paid payouts are required.'); return; }
    setBusy(true); setActionError(undefined);
    try {
      await adminService.resolvePayout(selectedPayout.id, resolution, note, receipt);
      await Promise.all([client.invalidateQueries({ queryKey: ['operations', 'payouts'] }), client.invalidateQueries({ queryKey: adminKeys.finance })]);
      setResolution(undefined); setReceipt(''); setNote('');
    } catch (value) { setActionError(getApiErrorMessage(value, 'Unable to reconcile this payout.')); }
    finally { setBusy(false); }
  };

  return <OperationsScaffold title="Finance operations" subtitle="Read-only payment, commission, seller proceeds, payout, and reconciliation reporting. Wallet balances and ledger records cannot be edited here.">
    {summary.isError ? <ErrorState message="Unable to load finance totals." onRetry={() => void summary.refetch()} /> : <View style={styles.metrics}>
      <Metric label="Wallet liability" value={summary.data ? formatCurrency(summary.data.walletLiability) : '...'} /><Metric label="Reserved" value={summary.data ? formatCurrency(summary.data.walletReserved) : '...'} />
      <Metric label="Commission earned" value={summary.data ? formatCurrency(summary.data.commissionEarned) : '...'} /><Metric label="Seller proceeds released" value={summary.data ? formatCurrency(summary.data.sellerProceedsReleased) : '...'} />
      <Metric label="Payouts pending" value={summary.data ? formatCurrency(summary.data.payoutsPending) : '...'} /><Metric label="Needs reconciliation" value={summary.data?.needsReconciliation ?? '...'} />
    </View>}
    <View style={styles.toolbar}>
      <SearchField value={search} onChangeText={value => { setSearch(value); setOffset(0); }} placeholder="Reference, order, receipt or seller" accessibilityLabel="Search finance records" containerStyle={styles.search} />
      <TextInput value={dateFrom} onChangeText={value => { setDateFrom(value); setOffset(0); }} placeholder="From YYYY-MM-DD" accessibilityLabel="Start date" style={styles.input} />
      <TextInput value={dateTo} onChangeText={value => { setDateTo(value); setOffset(0); }} placeholder="To YYYY-MM-DD" accessibilityLabel="End date" style={styles.input} />
      <Button variant="outline" onPress={() => void exportCsv()} icon={<Download size={17} color={operationsColors.ink} />}>Export CSV</Button>
    </View>
    <View style={styles.filters}>{['', 'customer_payment', 'commission_earned', 'seller_proceeds_release'].map(value => <Pressable key={value || 'all'} onPress={() => { setEntryType(value); setOffset(0); }} style={[styles.filter, entryType === value && styles.filterActive]}><Text style={[styles.filterText, entryType === value && styles.filterTextActive]}>{value ? value.replaceAll('_', ' ') : 'All entries'}</Text></Pressable>)}{['', 'pending', 'succeeded', 'failed'].map(value => <Pressable key={`payment-${value || 'all'}`} onPress={() => { setPaymentStatus(value); setOffset(0); }} style={[styles.filter, paymentStatus === value && styles.filterActive]}><Text style={[styles.filterText, paymentStatus === value && styles.filterTextActive]}>{value ? `Payment ${value}` : 'Any payment state'}</Text></Pressable>)}</View>
    {actionError ? <Text style={styles.error} accessibilityRole="alert">{actionError}</Text> : null}
    <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Ledger transactions</Text><Button variant="icon" size="sm" accessibilityLabel="Refresh finance records" onPress={() => void transactions.refetch()} icon={<RefreshCw size={18} color={operationsColors.ink} />} /></View>
      {transactions.isError ? <ErrorState message="Unable to load finance transactions." onRetry={() => void transactions.refetch()} /> : transactions.isLoading ? <Text style={styles.empty}>Loading transactions...</Text> : transactions.data?.results.length ? transactions.data.results.map(item => <View key={item.id} style={styles.transaction}>
        <View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.entryType.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.reference}</Text><Text style={styles.meta}>Order {item.orderId} {item.receiptNumber ? `- Receipt ${item.receiptNumber}` : ''}</Text></View><View style={styles.amount}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text>{item.paymentStatus ? <StatusPill value={item.paymentStatus} /> : null}</View>
      </View>) : <Text style={styles.empty}>No persisted ledger entries match these filters.</Text>}
      <View style={styles.pagination}><Button size="sm" variant="outline" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button><Text style={styles.meta}>{transactions.data ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, transactions.data.count)} of ${transactions.data.count}` : ''}</Text><Button size="sm" variant="outline" disabled={!transactions.data?.next} onPress={() => setOffset(offset + PAGE_SIZE)}>Next</Button></View>
    </View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Payouts</Text><View style={styles.filters}>{(['all', 'requested', 'processing', 'unknown', 'succeeded', 'failed'] as const).map(value => <Pressable key={value} onPress={() => setPayoutStatus(value)} style={[styles.filter, payoutStatus === value && styles.filterActive]}><Text style={[styles.filterText, payoutStatus === value && styles.filterTextActive]}>{value}</Text></Pressable>)}</View>
      <View style={styles.payoutLayout}><View style={styles.payoutList}>{payouts.data?.results.length ? payouts.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.payoutRow, selectedPayout?.id === item.id && styles.selected]}><View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.storeName || item.sellerEmail}</Text><Text style={styles.meta}>{item.destinationPhone} - {formatOperationsDate(item.createdAt)}</Text></View><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /></Pressable>) : <Text style={styles.empty}>No payouts match this filter.</Text>}</View>
        <View style={styles.payoutDetail}>{selectedPayout ? <><Text style={styles.sectionTitle}>{selectedPayout.storeName || selectedPayout.sellerName}</Text><Text style={styles.meta}>{selectedPayout.sellerEmail}</Text><Text style={styles.detailAmount}>{formatCurrency(selectedPayout.amount)}</Text><StatusPill value={selectedPayout.status} /><Text style={styles.meta}>Receipt: {selectedPayout.transactionReceipt || 'Not recorded'}</Text><Text style={styles.meta}>Provider message: {selectedPayout.failureMessage || 'None'}</Text>
          {(selectedPayout.status === 'unknown' || selectedPayout.status === 'processing') ? isSuperAdmin(auth.user) ? <View style={styles.reconcile}><Text style={styles.rowTitle}>Manual reconciliation</Text><Text style={styles.meta}>Verify externally before recording a final state. This action is audited and idempotent.</Text><View style={styles.filters}><Button size="sm" variant={resolution === 'succeeded' ? 'primary' : 'outline'} onPress={() => setResolution('succeeded')}>Paid</Button><Button size="sm" variant={resolution === 'failed' ? 'primary' : 'outline'} onPress={() => setResolution('failed')}>Failed</Button></View>{resolution === 'succeeded' ? <TextInput value={receipt} onChangeText={setReceipt} placeholder="M-Pesa receipt" style={styles.inputWide} /> : null}{resolution ? <TextInput value={note} onChangeText={setNote} placeholder="Verification evidence and reason" style={styles.inputWide} /> : null}{resolution ? <Button loading={busy} onPress={() => void reconcile()}>Confirm reconciliation</Button> : null}</View> : <Text style={styles.notice}>Manual reconciliation is restricted to a super administrator.</Text> : null}
        </> : <Text style={styles.empty}>Select a payout.</Text>}</View></View>
    </View>
  </OperationsScaffold>;
};

const Metric = ({ label, value }: { label: string; value: string | number }) => <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }, metric: { flexGrow: 1, flexBasis: 180, minHeight: 92, padding: 15, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, metricValue: { color: operationsColors.ink, fontSize: 21, fontWeight: '800' }, metricLabel: { color: operationsColors.muted, fontSize: 11, marginTop: 6 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }, search: { flexGrow: 1, minWidth: 260 }, input: { minHeight: 44, minWidth: 150, paddingHorizontal: 11, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, inputWide: { minHeight: 44, paddingHorizontal: 11, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }, filter: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green },
  section: { marginTop: 14, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, sectionHeading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, sectionTitle: { color: operationsColors.ink, fontSize: 15, fontWeight: '800', padding: 14 }, transaction: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, transactionMain: { flex: 1, minWidth: 0 }, amount: { alignItems: 'flex-end', gap: 4 }, rowTitle: { color: operationsColors.ink, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 3 }, empty: { color: operationsColors.muted, padding: 18 }, pagination: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 }, error: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 11 },
  payoutLayout: { flexDirection: 'row', flexWrap: 'wrap' }, payoutList: { flex: 1.2, minWidth: 300, borderRightWidth: 1, borderRightColor: operationsColors.border }, payoutRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, selected: { backgroundColor: operationsColors.greenSoft }, payoutDetail: { flex: 0.8, minWidth: 280, padding: 14, gap: 8 }, detailAmount: { color: operationsColors.ink, fontSize: 22, fontWeight: '800', marginVertical: 5 }, notice: { color: operationsColors.amber, backgroundColor: operationsColors.amberSoft, padding: 10, marginTop: 10 }, reconcile: { gap: 9, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: operationsColors.border },
});
