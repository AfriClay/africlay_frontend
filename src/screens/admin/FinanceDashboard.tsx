import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService, AdminPayoutStatus } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { hasStaffRole, isSuperAdmin } from '../../utils/roles';
import { DataFreshness, formatOperationsDate, formatQueueAge, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

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
  const [rangeDays, setRangeDays] = useState(0);
  const [offset, setOffset] = useState(0);
  const [payoutStatus, setPayoutStatus] = useState<'all' | AdminPayoutStatus>('all');
  const [paymentQueueStatus, setPaymentQueueStatus] = useState('failed');
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>();
  const [resolution, setResolution] = useState<'succeeded' | 'failed'>();
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const filters = useMemo(() => ({ search: search.trim(), entry_type: entryType, payment_status: paymentStatus, provider: 'mpesa', date_from: dateFrom, date_to: dateTo, limit: PAGE_SIZE, offset }), [search, entryType, paymentStatus, dateFrom, dateTo, offset]);
  const summary = useQuery({ queryKey: adminKeys.finance(dateFrom, dateTo), queryFn: () => adminService.financeSummary({ date_from: dateFrom, date_to: dateTo }), enabled: allowed });
  const transactions = useQuery({ queryKey: adminKeys.transactions(filters), queryFn: () => adminService.listTransactions(filters), enabled: allowed });
  const payouts = useQuery({ queryKey: adminKeys.payouts(payoutStatus, search), queryFn: () => adminService.listPayouts({ status: payoutStatus === 'all' ? undefined : payoutStatus, search: search.trim(), limit: 100 }), enabled: allowed });
  const paymentQueueFilters = useMemo(() => ({ status: paymentQueueStatus === 'all' ? undefined : paymentQueueStatus, search: search.trim(), date_from: dateFrom, date_to: dateTo, limit: 100 }), [paymentQueueStatus, search, dateFrom, dateTo]);
  const payments = useQuery({ queryKey: adminKeys.payments(paymentQueueFilters), queryFn: () => adminService.listPayments(paymentQueueFilters), enabled: allowed });
  const selectedPayout = payouts.data?.results.find(item => item.id === selectedId) ?? payouts.data?.results[0];
  const selectedTransaction = transactions.data?.results.find(item => item.id === selectedTransactionId);

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
      await Promise.all([client.invalidateQueries({ queryKey: ['operations', 'payouts'] }), client.invalidateQueries({ queryKey: ['operations', 'finance-summary'] })]);
      setResolution(undefined); setReceipt(''); setNote('');
    } catch (value) { setActionError(getApiErrorMessage(value, 'Unable to reconcile this payout.')); }
    finally { setBusy(false); }
  };
  const setRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days + 1);
    const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    setDateFrom(localDate(from)); setDateTo(localDate(to)); setRangeDays(days); setOffset(0);
  };

  return <OperationsScaffold title="Finance operations" subtitle="Payment, commission, seller proceeds, payout, and reconciliation reporting. Wallet balances and ledger records remain immutable.">
    <DataFreshness updatedAt={Math.max(summary.dataUpdatedAt, transactions.dataUpdatedAt, payouts.dataUpdatedAt, payments.dataUpdatedAt)} refreshing={summary.isFetching || transactions.isFetching || payouts.isFetching || payments.isFetching} onRefresh={() => void Promise.all([summary.refetch(), transactions.refetch(), payouts.refetch(), payments.refetch()])} />
    {summary.isError ? <ErrorState message="Unable to load finance totals." onRetry={() => void summary.refetch()} /> : <View style={styles.metrics}>
      <Metric label="Wallet liability" value={summary.data ? formatCurrency(summary.data.walletLiability) : '...'} note="Current balance" />
      <Metric label="Reserved" value={summary.data ? formatCurrency(summary.data.walletReserved) : '...'} note="Current held balance" />
      <Metric label="Customer payments" value={summary.data ? formatCurrency(summary.data.customerPayments) : '...'} note="Selected period" />
      <Metric label="Commission earned" value={summary.data ? formatCurrency(summary.data.commissionEarned) : '...'} note="Selected period" />
      <Metric label="Seller proceeds released" value={summary.data ? formatCurrency(summary.data.sellerProceedsReleased) : '...'} note="Selected period" />
      <Metric label="Payouts pending" value={summary.data ? formatCurrency(summary.data.payoutsPending) : '...'} note="Current queue" />
      <Metric label="Needs reconciliation" value={summary.data?.needsReconciliation ?? '...'} note={summary.data?.oldestReconciliationAt ? `Oldest ${formatQueueAge(summary.data.oldestReconciliationAt)}` : 'Current queue'} onPress={() => setPayoutStatus('unknown')} />
      <Metric label="Failed payments" value={summary.data?.failedPayments ?? '...'} note="Selected period" onPress={() => setPaymentQueueStatus('failed')} />
      <Metric label="Pending payments" value={summary.data?.pendingPayments ?? '...'} note="Selected period" onPress={() => setPaymentQueueStatus('pending')} />
    </View>}
    <View style={styles.toolbar}>
      <SearchField value={search} onChangeText={value => { setSearch(value); setOffset(0); }} placeholder="Reference, order, receipt or seller" accessibilityLabel="Search finance records" containerStyle={styles.search} />
      <View style={styles.filters}>{[7, 30, 90].map(days => <Filter key={days} label={`${days} days`} active={rangeDays === days} onPress={() => setRange(days)} />)}<Filter label="All time" active={!dateFrom && !dateTo} onPress={() => { setDateFrom(''); setDateTo(''); setRangeDays(0); setOffset(0); }} /></View>
      <Input label="From" optional value={dateFrom} onChangeText={value => { setDateFrom(value); setRangeDays(0); setOffset(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="Start date" containerStyle={styles.dateField} />
      <Input label="To" optional value={dateTo} onChangeText={value => { setDateTo(value); setRangeDays(0); setOffset(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="End date" containerStyle={styles.dateField} />
      <Button variant="outline" onPress={() => void exportCsv()} icon={<Download size={17} color={operationsColors.ink} />}>Export CSV</Button>
    </View>
    <View style={styles.filters}>{['', 'customer_payment', 'commission_earned', 'seller_proceeds_release'].map(value => <Filter key={value || 'all'} label={value ? value.replaceAll('_', ' ') : 'All entries'} active={entryType === value} onPress={() => { setEntryType(value); setOffset(0); }} />)}{['', 'pending', 'succeeded', 'failed'].map(value => <Filter key={`payment-${value || 'all'}`} label={value ? `Payment ${value}` : 'Any payment state'} active={paymentStatus === value} onPress={() => { setPaymentStatus(value); setOffset(0); }} />)}</View>
    {actionError ? <Text style={styles.error} accessibilityRole="alert">{actionError}</Text> : null}
    <View style={styles.section}><Text style={styles.sectionTitle}>Payment exceptions</Text><View style={styles.filters}>{['failed', 'pending', 'initiated', 'all'].map(value => <Filter key={value} label={value} active={paymentQueueStatus === value} onPress={() => setPaymentQueueStatus(value)} />)}</View>
      {payments.isError ? <ErrorState message="Unable to load payment records." onRetry={() => void payments.refetch()} /> : payments.isLoading ? <Text style={styles.empty}>Loading payment records...</Text> : payments.data?.results.length ? payments.data.results.map(item => <View key={item.id} style={styles.paymentRow}><View style={styles.transactionMain}><Text style={styles.rowTitle}>Order #{item.orderId.slice(0, 8)}</Text><Text style={styles.meta}>{item.buyerEmail} - {item.phoneNumber}</Text><Text style={styles.meta}>{item.failureMessage || item.purpose.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)} - {formatQueueAge(item.createdAt)}</Text></View><View style={styles.amount}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /><Text style={styles.meta}>{item.failureCode || item.receiptNumber || 'No provider code'}</Text></View></View>) : <Text style={styles.empty}>No payment records match this status and date range.</Text>}
    </View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Ledger transactions</Text>
      {transactions.isError ? <ErrorState message="Unable to load finance transactions." onRetry={() => void transactions.refetch()} /> : transactions.isLoading ? <Text style={styles.empty}>Loading transactions...</Text> : transactions.data?.results.length ? transactions.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedTransactionId(item.id)} style={[styles.transaction, selectedTransactionId === item.id && styles.selected]} accessibilityRole="button" accessibilityLabel={`Open transaction ${item.reference}`}>
        <View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.entryType.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.reference}</Text><Text style={styles.meta}>Order {item.orderId} {item.receiptNumber ? `- Receipt ${item.receiptNumber}` : ''}</Text></View><View style={styles.amount}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text>{item.paymentStatus ? <StatusPill value={item.paymentStatus} /> : null}</View>
      </Pressable>) : <Text style={styles.empty}>No persisted ledger entries match these filters.</Text>}
      {selectedTransaction ? <View style={styles.transactionDetail}><Text style={styles.sectionTitle}>Transaction detail</Text><View style={styles.detailGrid}><Detail label="Reference" value={selectedTransaction.reference} /><Detail label="Entry" value={selectedTransaction.entryType.replaceAll('_', ' ')} /><Detail label="Amount" value={formatCurrency(selectedTransaction.amount)} /><Detail label="Order" value={selectedTransaction.orderId} /><Detail label="Payment" value={selectedTransaction.paymentId || 'Not linked'} /><Detail label="Seller/account" value={selectedTransaction.userEmail || 'Not linked'} /><Detail label="Provider" value={selectedTransaction.provider || 'Not linked'} /><Detail label="Receipt" value={selectedTransaction.receiptNumber || 'Not recorded'} /></View></View> : null}
      <View style={styles.pagination}><Button size="sm" variant="outline" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button><Text style={styles.meta}>{transactions.data ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, transactions.data.count)} of ${transactions.data.count}` : ''}</Text><Button size="sm" variant="outline" disabled={!transactions.data?.next} onPress={() => setOffset(offset + PAGE_SIZE)}>Next</Button></View>
    </View>
    <View style={styles.section}><Text style={styles.sectionTitle}>Payout and reconciliation queue</Text><View style={styles.filters}>{(['all', 'requested', 'processing', 'unknown', 'succeeded', 'failed'] as const).map(value => <Filter key={value} label={value} active={payoutStatus === value} onPress={() => setPayoutStatus(value)} />)}</View>
      <View style={styles.payoutLayout}><View style={styles.payoutList}>{payouts.isError ? <ErrorState message="Unable to load payouts." onRetry={() => void payouts.refetch()} /> : payouts.isLoading ? <Text style={styles.empty}>Loading payouts...</Text> : payouts.data?.results.length ? payouts.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.payoutRow, selectedPayout?.id === item.id && styles.selected]}><View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.storeName || item.sellerEmail}</Text><Text style={styles.meta}>{item.destinationPhone} - {formatOperationsDate(item.createdAt)}</Text><Text style={styles.meta}>{formatQueueAge(item.createdAt)}</Text></View><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /></Pressable>) : <Text style={styles.empty}>No payouts match this filter.</Text>}</View>
        <View style={styles.payoutDetail}>{selectedPayout ? <><Text style={styles.sectionTitle}>{selectedPayout.storeName || selectedPayout.sellerName}</Text><Text style={styles.meta}>{selectedPayout.sellerEmail}</Text><Text style={styles.detailAmount}>{formatCurrency(selectedPayout.amount)}</Text><StatusPill value={selectedPayout.status} /><Text style={styles.meta}>Queue age: {formatQueueAge(selectedPayout.createdAt)}</Text><Text style={styles.meta}>Receipt: {selectedPayout.transactionReceipt || 'Not recorded'}</Text><Text style={styles.meta}>Provider message: {selectedPayout.failureMessage || 'None'}</Text>
          {(selectedPayout.status === 'unknown' || selectedPayout.status === 'processing') ? isSuperAdmin(auth.user) ? <View style={styles.reconcile}><Text style={styles.rowTitle}>Manual reconciliation</Text><Text style={styles.meta}>Verify externally before recording a final state. This action is audited and idempotent.</Text><View style={styles.filters}><Button size="sm" variant={resolution === 'succeeded' ? 'primary' : 'outline'} onPress={() => setResolution('succeeded')}>Paid</Button><Button size="sm" variant={resolution === 'failed' ? 'primary' : 'outline'} onPress={() => setResolution('failed')}>Failed</Button></View>{resolution === 'succeeded' ? <Input label="M-Pesa receipt" required value={receipt} onChangeText={setReceipt} placeholder="Receipt number" /> : null}{resolution ? <Input label="Verification note" required value={note} onChangeText={setNote} multiline placeholder="Evidence and reason" /> : null}{resolution ? <Button loading={busy} onPress={() => void reconcile()}>Confirm reconciliation</Button> : null}</View> : <Text style={styles.notice}>Manual reconciliation is restricted to a super administrator.</Text> : null}
        </> : <Text style={styles.empty}>Select a payout.</Text>}</View></View>
    </View>
  </OperationsScaffold>;
};

const Filter = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
const Metric = ({ label, value, note, onPress }: { label: string; value: string | number; note: string; onPress?: () => void }) => {
  const content = <><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricNote}>{note}</Text></>;
  return onPress ? <Pressable onPress={onPress} style={[styles.metric, styles.metricAction]} accessibilityRole="button">{content}</Pressable> : <View style={styles.metric}>{content}</View>;
};
const Detail = ({ label, value }: { label: string; value: string }) => <View style={styles.detailCell}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.meta}>{value}</Text></View>;

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }, metric: { flexGrow: 1, flexBasis: 180, minHeight: 104, padding: 15, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, metricAction: { borderColor: operationsColors.green }, metricValue: { color: operationsColors.ink, fontSize: 21, fontWeight: '800' }, metricLabel: { color: operationsColors.ink, fontSize: 11, fontWeight: '800', marginTop: 6 }, metricNote: { color: operationsColors.muted, fontSize: 10, marginTop: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, marginBottom: 10 }, search: { flexGrow: 1, minWidth: 260 }, dateField: { minWidth: 150, marginBottom: 0 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }, filter: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green },
  section: { marginTop: 14, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, sectionTitle: { color: operationsColors.ink, fontSize: 15, fontWeight: '800', padding: 14 }, transaction: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, transactionMain: { flex: 1, minWidth: 0 }, amount: { alignItems: 'flex-end', gap: 4 }, rowTitle: { color: operationsColors.ink, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 3 }, empty: { color: operationsColors.muted, padding: 18 }, pagination: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 }, error: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 11 }, selected: { backgroundColor: operationsColors.greenSoft },
  paymentRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: 1, borderTopColor: operationsColors.border },
  transactionDetail: { padding: 12, backgroundColor: operationsColors.greenSoft }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap' }, detailCell: { width: '50%', minWidth: 190, padding: 9 }, detailLabel: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  payoutLayout: { flexDirection: 'row', flexWrap: 'wrap' }, payoutList: { flex: 1.2, minWidth: 280, borderRightWidth: 1, borderRightColor: operationsColors.border }, payoutRow: { minHeight: 78, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, padding: 12, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, payoutDetail: { flex: 0.8, minWidth: 280, padding: 14, gap: 8 }, detailAmount: { color: operationsColors.ink, fontSize: 22, fontWeight: '800', marginVertical: 5 }, notice: { color: operationsColors.amber, backgroundColor: operationsColors.amberSoft, padding: 10, marginTop: 10 }, reconcile: { gap: 9, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: operationsColors.border },
});
