import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { FinanceInsights, FinanceTrendChart } from './FinanceInsights';

const PAGE_SIZE = 30;

export const FinanceDashboard = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const compact = useWindowDimensions().width < 720;
  const allowed = hasStaffRole(auth.user, 'finance');
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('');
  const [provider, setProvider] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rangeDays, setRangeDays] = useState(0);
  const [offset, setOffset] = useState(0);
  const [payoutOffset, setPayoutOffset] = useState(0);
  const [paymentOffset, setPaymentOffset] = useState(0);
  const [topupOffset, setTopupOffset] = useState(0);
  const [payoutStatus, setPayoutStatus] = useState<'all' | 'active' | AdminPayoutStatus>('all');
  const [payoutPeriod, setPayoutPeriod] = useState<'all' | 'selected'>('all');
  const [payoutDateBasis, setPayoutDateBasis] = useState<'created' | 'processed'>('created');
  const [paymentQueueStatus, setPaymentQueueStatus] = useState('failed');
  const [topupStatus, setTopupStatus] = useState('unknown');
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>();
  const [selectedTopupId, setSelectedTopupId] = useState<string>();
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef({ payments: 0, topups: 0, ledger: 0, payouts: 0 });
  const [resolution, setResolution] = useState<'succeeded' | 'failed'>();
  const [receipt, setReceipt] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const filters = useMemo(() => ({ search: search.trim(), entry_type: entryType, payment_status: paymentStatus, provider, date_from: dateFrom, date_to: dateTo, limit: PAGE_SIZE, offset }), [search, entryType, paymentStatus, provider, dateFrom, dateTo, offset]);
  const exportFilters = useMemo(() => ({ search: search.trim(), entry_type: entryType, payment_status: paymentStatus, provider, date_from: dateFrom, date_to: dateTo }), [search, entryType, paymentStatus, provider, dateFrom, dateTo]);
  const summary = useQuery({ queryKey: adminKeys.finance(dateFrom, dateTo), queryFn: () => adminService.financeSummary({ date_from: dateFrom, date_to: dateTo }), enabled: allowed });
  const transactions = useQuery({ queryKey: adminKeys.transactions(filters), queryFn: () => adminService.listTransactions(filters), enabled: allowed });
  const payoutDateFrom = payoutPeriod === 'selected' ? dateFrom : '';
  const payoutDateTo = payoutPeriod === 'selected' ? dateTo : '';
  const payouts = useQuery({ queryKey: adminKeys.payouts(payoutStatus, search, payoutOffset, payoutDateFrom, payoutDateTo, payoutDateBasis), queryFn: () => adminService.listPayouts({ status: payoutStatus === 'all' ? undefined : payoutStatus, search: search.trim(), date_from: payoutDateFrom, date_to: payoutDateTo, date_basis: payoutDateBasis, limit: PAGE_SIZE, offset: payoutOffset }), enabled: allowed });
  const paymentQueueFilters = useMemo(() => ({ status: paymentQueueStatus === 'all' ? undefined : paymentQueueStatus, search: search.trim(), date_from: dateFrom, date_to: dateTo, date_basis: paymentQueueStatus === 'succeeded' ? 'completed' : 'created', provider: paymentQueueStatus === 'succeeded' ? 'mpesa' : undefined, limit: PAGE_SIZE, offset: paymentOffset }), [paymentQueueStatus, search, dateFrom, dateTo, paymentOffset]);
  const payments = useQuery({ queryKey: adminKeys.payments(paymentQueueFilters), queryFn: () => adminService.listPayments(paymentQueueFilters), enabled: allowed });
  const topupFilters = useMemo(() => ({ status: topupStatus === 'all' ? undefined : topupStatus, search: search.trim(), date_from: dateFrom, date_to: dateTo, date_basis: topupStatus === 'succeeded' ? 'confirmed' : 'created', limit: PAGE_SIZE, offset: topupOffset }), [topupStatus, search, dateFrom, dateTo, topupOffset]);
  const topups = useQuery({ queryKey: adminKeys.topups(topupFilters), queryFn: () => adminService.listTopups(topupFilters), enabled: allowed });
  const selectedPayout = payouts.data?.results.find(item => item.id === selectedId) ?? payouts.data?.results[0];
  const selectedPayment = payments.data?.results.find(item => item.id === selectedPaymentId);
  const selectedTopup = topups.data?.results.find(item => item.id === selectedTopupId);
  const selectedTransaction = transactions.data?.results.find(item => item.id === selectedTransactionId);

  if (!allowed) return <ErrorState kind="forbidden" message="Finance access is required for this dashboard." />;

  const exportCsv = async () => {
    setActionError(undefined);
    try { await adminService.downloadTransactions(exportFilters); }
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
    setDateFrom(localDate(from)); setDateTo(localDate(to)); setRangeDays(days); setOffset(0); setPaymentOffset(0); setTopupOffset(0);
  };
  const jumpTo = (section: 'payments' | 'topups' | 'ledger' | 'payouts') => requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, sectionY.current[section] - 12), animated: true }));
  const openLedger = (type: string) => { setSearch(''); setEntryType(type); setPaymentStatus(''); setProvider(''); setOffset(0); jumpTo('ledger'); };
  const openPayouts = (status: 'active' | AdminPayoutStatus) => { setSearch(''); setPayoutStatus(status); setPayoutPeriod(status === 'succeeded' ? 'selected' : 'all'); setPayoutDateBasis(status === 'succeeded' ? 'processed' : 'created'); setPayoutOffset(0); setSelectedId(undefined); jumpTo('payouts'); };
  const openPayments = (status: string) => { setSearch(''); setPaymentQueueStatus(status); setPaymentOffset(0); setSelectedPaymentId(undefined); jumpTo('payments'); };
  const openTopups = (status: string) => { setSearch(''); setTopupStatus(status); setTopupOffset(0); setSelectedTopupId(undefined); jumpTo('topups'); };

  return <OperationsScaffold title="Finance operations" subtitle="Payments, payouts and reconciliation." scrollRef={scrollRef}>
    <DataFreshness updatedAt={Math.max(summary.dataUpdatedAt, transactions.dataUpdatedAt, payouts.dataUpdatedAt, payments.dataUpdatedAt, topups.dataUpdatedAt)} refreshing={summary.isFetching || transactions.isFetching || payouts.isFetching || payments.isFetching || topups.isFetching} failed={summary.isError || transactions.isError || payouts.isError || payments.isError || topups.isError} onRefresh={() => void Promise.all([summary.refetch(), transactions.refetch(), payouts.refetch(), payments.refetch(), topups.refetch()])} />
    <View style={styles.filters} accessibilityLabel="Finance reporting period">{[7, 30, 90].map(days => <Filter key={days} label={`${days} days`} active={rangeDays === days} onPress={() => setRange(days)} />)}<Filter label="All time" active={!dateFrom && !dateTo} onPress={() => { setDateFrom(''); setDateTo(''); setRangeDays(0); setOffset(0); setPaymentOffset(0); setTopupOffset(0); }} /></View>
    <View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroTitle}>Payments and reconciliation</Text><Text style={styles.heroNote}>Ledger includes wallet purchases and delivery fees. Chart shows confirmed M-Pesa activity.</Text></View><View style={styles.heroAmount}><Text style={styles.heroAmountLabel}>ORDER PAYMENTS RECORDED · {dateFrom || 'ALL TIME'}</Text><Text style={styles.heroAmountValue}>{summary.data ? formatCurrency(summary.data.customerPayments) : summary.isError ? 'Unavailable' : 'Loading...'}</Text></View></View>
    {summary.data ? <FinanceTrendChart summary={summary.data} /> : null}
    {summary.isError && !summary.data ? <ErrorState message="Unable to load finance totals." onRetry={() => void summary.refetch()} /> : <View style={styles.metrics}>
      <Metric label="Wallet liability" value={summary.data ? formatCurrency(summary.data.walletLiability) : '...'} note="Current balance" />
      <Metric label="Reserved" value={summary.data ? formatCurrency(summary.data.walletReserved) : '...'} note="Current held balance" />
      <Metric label="Customer payments" value={summary.data ? formatCurrency(summary.data.customerPayments) : '...'} note="Order ledger · selected period" onPress={() => openLedger('customer_payment')} />
      <Metric label="Refunds recorded" value={summary.data ? summary.data.refundsRecorded === undefined ? 'Unavailable' : formatCurrency(summary.data.refundsRecorded) : '...'} note="To shopping funds · selected period" onPress={() => openLedger('refund_completed')} />
      <Metric label="Commission earned" value={summary.data ? formatCurrency(summary.data.commissionEarned) : '...'} note="Selected period" onPress={() => openLedger('commission_earned')} />
      <Metric label="Seller proceeds released" value={summary.data ? formatCurrency(summary.data.sellerProceedsReleased) : '...'} note="Selected period" onPress={() => openLedger('seller_proceeds_release')} />
      <Metric label="Order M-Pesa receipts" value={summary.data ? formatCurrency(summary.data.orderMpesaReceipts) : '...'} note="Confirmed provider receipts · selected period" onPress={() => openPayments('succeeded')} />
      <Metric label="Wallet top-ups received" value={summary.data ? formatCurrency(summary.data.walletTopupsReceived) : '...'} note="Confirmed provider top-ups · selected period" onPress={() => openTopups('succeeded')} />
      <Metric label="Top-ups requiring review" value={summary.data?.topupStatusCounts.unknown ?? '...'} note="Unknown provider result · selected period" onPress={() => openTopups('unknown')} />
      <Metric label="Payouts completed" value={summary.data ? formatCurrency(summary.data.payoutsCompleted) : '...'} note="Processed in selected period" onPress={() => openPayouts('succeeded')} />
      <Metric label="Payouts pending" value={summary.data ? formatCurrency(summary.data.payoutsPending) : '...'} note="Current queue · all dates" onPress={() => openPayouts('active')} />
      <Metric label="Needs reconciliation" value={summary.data?.needsReconciliation ?? '...'} note={summary.data?.oldestReconciliationAt ? `Oldest ${formatQueueAge(summary.data.oldestReconciliationAt)}` : 'Current queue'} onPress={() => openPayouts('unknown')} />
      <Metric label="Failed payments" value={summary.data?.failedPayments ?? '...'} note="Selected period" onPress={() => openPayments('failed')} />
      <Metric label="Awaiting confirmation" value={summary.data?.pendingPayments ?? '...'} note="Initiated + pending · selected period" onPress={() => { setPaymentQueueStatus('awaiting_confirmation'); openPayments('awaiting_confirmation'); }} />
    </View>}
    {summary.data ? <FinanceInsights summary={summary.data} /> : null}
    <View style={styles.toolbar}>
      <SearchField value={search} onChangeText={value => { setSearch(value); setOffset(0); setPayoutOffset(0); setPaymentOffset(0); setTopupOffset(0); }} placeholder="Reference, order, receipt or account" accessibilityLabel="Search finance records" containerStyle={[styles.search, compact && styles.searchCompact]} />
      <Input label="From" optional value={dateFrom} onChangeText={value => { setDateFrom(value); setRangeDays(0); setOffset(0); setPaymentOffset(0); setTopupOffset(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="Start date" containerStyle={[styles.dateField, compact && styles.dateFieldCompact]} />
      <Input label="To" optional value={dateTo} onChangeText={value => { setDateTo(value); setRangeDays(0); setOffset(0); setPaymentOffset(0); setTopupOffset(0); }} placeholder="YYYY-MM-DD" accessibilityLabel="End date" containerStyle={[styles.dateField, compact && styles.dateFieldCompact]} />
      <Button variant="outline" onPress={() => void exportCsv()} icon={<Download size={17} color={operationsColors.ink} />}>Export CSV</Button>
    </View>
    <View style={styles.filters}>{['', 'customer_payment', 'delivery_fee', 'commission_earned', 'seller_proceeds_release', 'refund_due', 'refund_completed'].map(value => <Filter key={value || 'all'} label={value ? value.replaceAll('_', ' ') : 'All entries'} active={entryType === value} onPress={() => { setEntryType(value); setOffset(0); }} />)}{['', 'pending', 'succeeded', 'failed'].map(value => <Filter key={`payment-${value || 'all'}`} label={value ? `Payment ${value}` : 'Any payment state'} active={paymentStatus === value} onPress={() => { setPaymentStatus(value); setOffset(0); }} />)}{['', 'mpesa'].map(value => <Filter key={`provider-${value || 'all'}`} label={value ? 'M-Pesa linked' : 'Any provider'} active={provider === value} onPress={() => { setProvider(value); setOffset(0); }} />)}</View>
    <Text style={styles.applied}>CSV exports up to 10,000 entries matching these filters.</Text>
    {actionError ? <Text style={styles.error} accessibilityRole="alert">{actionError}</Text> : null}
    <View onLayout={event => { sectionY.current.payments = event.nativeEvent.layout.y; }} />
    <View style={styles.section}><Text style={styles.sectionTitle}>Order payment records</Text><View style={styles.filters}>{['failed', 'awaiting_confirmation', 'pending', 'initiated', 'succeeded', 'all'].map(value => <Filter key={value} label={value === 'awaiting_confirmation' ? 'Awaiting confirmation' : value} active={paymentQueueStatus === value} onPress={() => { setPaymentQueueStatus(value); setPaymentOffset(0); setSelectedPaymentId(undefined); }} />)}</View><Text style={styles.applied}>Date filter uses {paymentQueueStatus === 'succeeded' ? 'completion date for M-Pesa receipts' : 'request date'}.</Text>
      {payments.isError && !payments.data ? <ErrorState message="Unable to load payment records." onRetry={() => void payments.refetch()} /> : payments.isLoading ? <Text style={styles.empty}>Loading payment records...</Text> : payments.data?.results.length ? payments.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedPaymentId(item.id)} style={[styles.paymentRow, compact && styles.paymentRowCompact, selectedPaymentId === item.id && styles.selected]} accessibilityRole="button" accessibilityLabel={`Open order payment ${item.id}`}><View style={styles.transactionMain}><Text style={styles.rowTitle}>Order #{item.orderId.slice(0, 8)}</Text><Text style={styles.meta}>{item.buyerEmail}</Text><Text style={styles.meta}>{item.failureMessage || item.purpose.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)} - {formatQueueAge(item.createdAt)}</Text></View><View style={[styles.amount, compact && styles.amountCompact]}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /><Text style={styles.meta}>{item.failureCode || item.receiptNumber || 'No provider code'}</Text></View></Pressable>) : <Text style={styles.empty}>No payment records match this status and date range.</Text>}
      {selectedPayment ? <View style={styles.transactionDetail}><Text style={styles.sectionTitle}>Payment detail</Text><View style={styles.detailGrid}><Detail label="Order" value={selectedPayment.orderId} /><Detail label="Buyer" value={selectedPayment.buyerEmail} /><Detail label="Amount" value={formatCurrency(selectedPayment.amount)} /><Detail label="Purpose" value={selectedPayment.purpose.replaceAll('_', ' ')} /><Detail label="Provider" value={selectedPayment.provider} /><Detail label="Status" value={selectedPayment.status} /><Detail label="Requested" value={formatOperationsDate(selectedPayment.createdAt)} /><Detail label="Completed" value={formatOperationsDate(selectedPayment.completedAt)} /><Detail label="Receipt" value={selectedPayment.receiptNumber || 'Not recorded'} /><Detail label="Provider code" value={selectedPayment.failureCode || 'None'} /><Detail label="Provider message" value={selectedPayment.failureMessage || 'None'} /></View></View> : null}
      {payments.data && payments.data.count > PAGE_SIZE ? <View style={styles.pagination}><Button size="sm" variant="outline" disabled={paymentOffset === 0} onPress={() => setPaymentOffset(Math.max(0, paymentOffset - PAGE_SIZE))}>Previous</Button><Text style={styles.meta}>{paymentOffset + 1}-{Math.min(paymentOffset + PAGE_SIZE, payments.data.count)} of {payments.data.count}</Text><Button size="sm" variant="outline" disabled={!payments.data.next} onPress={() => setPaymentOffset(paymentOffset + PAGE_SIZE)}>Next</Button></View> : null}
    </View>
    <View onLayout={event => { sectionY.current.topups = event.nativeEvent.layout.y; }} />
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wallet top-up records</Text>
      <Text style={styles.applied}>Verify unknown results with Safaricom. Successful top-ups use update date; others use request date.</Text>
      <View style={styles.filters}>{['unknown', 'failed', 'pending', 'initiated', 'succeeded', 'all'].map(value => <Filter key={value} label={value} active={topupStatus === value} onPress={() => { setTopupStatus(value); setTopupOffset(0); setSelectedTopupId(undefined); }} />)}</View>
      {topups.isError && !topups.data ? <ErrorState message="Unable to load wallet top-ups." onRetry={() => void topups.refetch()} /> : topups.isLoading ? <Text style={styles.empty}>Loading wallet top-ups...</Text> : topups.data?.results.length ? topups.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedTopupId(item.id)} style={[styles.paymentRow, compact && styles.paymentRowCompact, selectedTopupId === item.id && styles.selected]} accessibilityRole="button" accessibilityLabel={`Open wallet top-up ${item.id}`}><View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.accountEmail}</Text><Text style={styles.meta}>{item.resultDescription || 'No provider message'}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)} - {formatQueueAge(item.createdAt)}</Text></View><View style={[styles.amount, compact && styles.amountCompact]}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /><Text style={styles.meta}>{item.providerReceipt || 'No receipt yet'}</Text></View></Pressable>) : <Text style={styles.empty}>No top-ups match this status and date range.</Text>}
      {selectedTopup ? <View style={styles.transactionDetail}><Text style={styles.sectionTitle}>Top-up detail</Text><View style={styles.detailGrid}><Detail label="Account" value={selectedTopup.accountEmail} /><Detail label="Amount" value={formatCurrency(selectedTopup.amount)} /><Detail label="Status" value={selectedTopup.status} /><Detail label="Phone" value={selectedTopup.phoneNumber} /><Detail label="Requested" value={formatOperationsDate(selectedTopup.createdAt)} /><Detail label="Last updated" value={formatOperationsDate(selectedTopup.updatedAt)} /><Detail label="Receipt" value={selectedTopup.providerReceipt || 'Not recorded'} /><Detail label="Provider message" value={selectedTopup.resultDescription || 'None'} /></View></View> : null}
      {topups.data && topups.data.count > PAGE_SIZE ? <View style={styles.pagination}><Button size="sm" variant="outline" disabled={topupOffset === 0} onPress={() => setTopupOffset(Math.max(0, topupOffset - PAGE_SIZE))}>Previous</Button><Text style={styles.meta}>{topupOffset + 1}-{Math.min(topupOffset + PAGE_SIZE, topups.data.count)} of {topups.data.count}</Text><Button size="sm" variant="outline" disabled={!topups.data.next} onPress={() => setTopupOffset(topupOffset + PAGE_SIZE)}>Next</Button></View> : null}
    </View>
    <View onLayout={event => { sectionY.current.ledger = event.nativeEvent.layout.y; }} />
    <View style={styles.section}><Text style={styles.sectionTitle}>Ledger transactions</Text>
      {transactions.isError && !transactions.data ? <ErrorState message="Unable to load finance transactions." onRetry={() => void transactions.refetch()} /> : transactions.isLoading ? <Text style={styles.empty}>Loading transactions...</Text> : transactions.data?.results.length ? transactions.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedTransactionId(item.id)} style={[styles.transaction, selectedTransactionId === item.id && styles.selected]} accessibilityRole="button" accessibilityLabel={`Open transaction ${item.reference}`}>
        <View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.entryType.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.reference}</Text><Text style={styles.meta}>Order {item.orderId} {item.receiptNumber ? `- Receipt ${item.receiptNumber}` : ''}</Text></View><View style={styles.amount}><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text>{item.paymentStatus ? <StatusPill value={item.paymentStatus} /> : null}</View>
      </Pressable>) : <Text style={styles.empty}>No persisted ledger entries match these filters.</Text>}
      {selectedTransaction ? <View style={styles.transactionDetail}><Text style={styles.sectionTitle}>Transaction detail</Text><View style={styles.detailGrid}><Detail label="Reference" value={selectedTransaction.reference} /><Detail label="Entry" value={selectedTransaction.entryType.replaceAll('_', ' ')} /><Detail label="Amount" value={formatCurrency(selectedTransaction.amount)} /><Detail label="Order" value={selectedTransaction.orderId} /><Detail label="Payment" value={selectedTransaction.paymentId || 'Not linked'} /><Detail label="Seller/account" value={selectedTransaction.userEmail || 'Not linked'} /><Detail label="Provider" value={selectedTransaction.provider || 'Not linked'} /><Detail label="Receipt" value={selectedTransaction.receiptNumber || 'Not recorded'} /></View></View> : null}
      <View style={styles.pagination}><Button size="sm" variant="outline" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button><Text style={styles.meta}>{transactions.data ? transactions.data.count ? `${offset + 1}-${Math.min(offset + PAGE_SIZE, transactions.data.count)} of ${transactions.data.count}` : '0 of 0' : ''}</Text><Button size="sm" variant="outline" disabled={!transactions.data?.next} onPress={() => setOffset(offset + PAGE_SIZE)}>Next</Button></View>
    </View>
    <View onLayout={event => { sectionY.current.payouts = event.nativeEvent.layout.y; }} />
    <View style={styles.section}><Text style={styles.sectionTitle}>Payout and reconciliation queue</Text><View style={styles.filters}>{(['all', 'active', 'requested', 'processing', 'unknown', 'succeeded', 'failed'] as const).map(value => <Filter key={value} label={value} active={payoutStatus === value} onPress={() => { setPayoutStatus(value); setPayoutDateBasis('created'); setPayoutOffset(0); setSelectedId(undefined); }} />)}</View><View style={styles.filters}><Filter label="All request dates" active={payoutPeriod === 'all'} onPress={() => { setPayoutPeriod('all'); setPayoutOffset(0); }} /><Filter label="Selected period" active={payoutPeriod === 'selected'} onPress={() => { setPayoutPeriod('selected'); setPayoutOffset(0); }} /></View><Text style={styles.applied}>Payouts: {payoutPeriod === 'selected' ? `${dateFrom || 'all dates'} to ${dateTo || 'today'}` : 'all request dates'}{payoutDateBasis === 'processed' && payoutPeriod === 'selected' ? ' · processed date' : ' · request date'}.</Text>
      <View style={[styles.payoutLayout, compact && styles.payoutLayoutCompact]}><View style={[styles.payoutList, compact && styles.payoutListCompact]}>{payouts.isError && !payouts.data ? <ErrorState message="Unable to load payouts." onRetry={() => void payouts.refetch()} /> : payouts.isLoading ? <Text style={styles.empty}>Loading payouts...</Text> : payouts.data?.results.length ? payouts.data.results.map(item => <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.payoutRow, selectedPayout?.id === item.id && styles.selected]} accessibilityRole="button" accessibilityLabel={`Open payout ${item.id}`}><View style={styles.transactionMain}><Text style={styles.rowTitle}>{item.storeName || item.accountEmail}</Text><Text style={styles.meta}>{item.balanceSource === 'earnings' ? 'Seller earnings' : 'Shopping funds'} · {formatQueueAge(item.createdAt)}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View><Text style={styles.rowTitle}>{formatCurrency(item.amount)}</Text><StatusPill value={item.status} /></Pressable>) : <Text style={styles.empty}>No payouts match this filter.</Text>}{payouts.data && payouts.data.count > PAGE_SIZE ? <View style={styles.pagination}><Button size="sm" variant="outline" disabled={payoutOffset === 0} onPress={() => { setPayoutOffset(Math.max(0, payoutOffset - PAGE_SIZE)); setSelectedId(undefined); }}>Previous</Button><Text style={styles.meta}>{payoutOffset + 1}-{Math.min(payoutOffset + PAGE_SIZE, payouts.data.count)} of {payouts.data.count}</Text><Button size="sm" variant="outline" disabled={!payouts.data.next} onPress={() => { setPayoutOffset(payoutOffset + PAGE_SIZE); setSelectedId(undefined); }}>Next</Button></View> : null}</View>
        <View style={[styles.payoutDetail, compact && styles.payoutDetailCompact]}>{selectedPayout ? <><Text style={styles.sectionTitle}>{selectedPayout.storeName || selectedPayout.accountName || selectedPayout.accountEmail}</Text><Text style={styles.meta}>{selectedPayout.accountEmail}</Text><Text style={styles.meta}>{selectedPayout.balanceSource === 'earnings' ? 'Seller earnings withdrawal' : 'Shopping funds withdrawal'}</Text><Text style={styles.detailAmount}>{formatCurrency(selectedPayout.amount)}</Text><StatusPill value={selectedPayout.status} /><Text style={styles.meta}>Queue age: {formatQueueAge(selectedPayout.createdAt)}</Text><Text style={styles.meta}>Destination: {selectedPayout.destinationPhone}</Text><Text style={styles.meta}>Receipt: {selectedPayout.transactionReceipt || 'Not recorded'}</Text><Text style={styles.meta}>Provider message: {selectedPayout.failureMessage || 'None'}</Text>
          {(selectedPayout.status === 'unknown' || selectedPayout.status === 'processing') ? isSuperAdmin(auth.user) ? <View style={styles.reconcile}><Text style={styles.rowTitle}>Manual reconciliation</Text><Text style={styles.meta}>Verify with Safaricom before recording a final state. This action is audited.</Text><View style={styles.filters}><Button size="sm" variant={resolution === 'succeeded' ? 'primary' : 'outline'} onPress={() => setResolution('succeeded')}>Paid</Button><Button size="sm" variant={resolution === 'failed' ? 'primary' : 'outline'} onPress={() => setResolution('failed')}>Failed</Button></View>{resolution === 'succeeded' ? <Input label="M-Pesa receipt" required value={receipt} onChangeText={setReceipt} placeholder="Receipt number" /> : null}{resolution ? <Input label="Verification note" required value={note} onChangeText={setNote} multiline placeholder="Evidence and reason" /> : null}{resolution ? <Button loading={busy} onPress={() => void reconcile()}>Confirm reconciliation</Button> : null}</View> : <Text style={styles.notice}>Manual reconciliation is restricted to a super administrator.</Text> : null}
        </> : <Text style={styles.empty}>Select a payout.</Text>}</View></View>
    </View>
  </OperationsScaffold>;
};

const Filter = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
const Metric = ({ label, value, note, onPress }: { label: string; value: string | number; note: string; onPress?: () => void }) => {
  const content = <><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricNote}>{note}</Text></>;
  return onPress ? <Pressable onPress={onPress} style={[styles.metric, styles.metricAction]} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. ${note}. Open matching records.`}>{content}</Pressable> : <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value}. ${note}.`}>{content}</View>;
};
const Detail = ({ label, value }: { label: string; value: string }) => {
  const compact = useWindowDimensions().width < 520;
  return <View style={[styles.detailCell, compact && styles.detailCellCompact]}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.meta}>{value}</Text></View>;
};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 20, marginBottom: 16, borderRadius: 12, backgroundColor: '#173E2D' }, heroCopy: { flex: 1, minWidth: 190 }, heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' }, heroNote: { color: '#D5E5DA', fontSize: 12, lineHeight: 19, marginTop: 6, maxWidth: 620 }, heroAmount: { minWidth: 180, padding: 14, borderRadius: 10, backgroundColor: '#E8F2EC' }, heroAmountLabel: { color: operationsColors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }, heroAmountValue: { color: operationsColors.ink, fontSize: 22, fontWeight: '800', marginTop: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }, metric: { flexGrow: 1, flexBasis: 150, minHeight: 104, padding: 15, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 10, backgroundColor: operationsColors.panel }, metricAction: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, metricValue: { color: operationsColors.ink, fontSize: 21, fontWeight: '800' }, metricLabel: { color: operationsColors.ink, fontSize: 11, fontWeight: '800', marginTop: 6 }, metricNote: { color: operationsColors.muted, fontSize: 10, marginTop: 4 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, marginBottom: 10 }, search: { flexGrow: 1, minWidth: 260 }, searchCompact: { width: '100%', minWidth: 0 }, dateField: { minWidth: 150, marginBottom: 0 }, dateFieldCompact: { width: '100%', minWidth: 0 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }, filter: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 8, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green }, applied: { color: operationsColors.muted, fontSize: 11, lineHeight: 17, marginBottom: 8 },
  section: { marginTop: 14, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 10, backgroundColor: operationsColors.panel, overflow: 'hidden' }, sectionTitle: { color: operationsColors.ink, fontSize: 15, fontWeight: '800', padding: 14 }, transaction: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, transactionMain: { flex: 1, minWidth: 0 }, amount: { alignItems: 'flex-end', gap: 4 }, rowTitle: { color: operationsColors.ink, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 3 }, empty: { color: operationsColors.muted, padding: 18 }, pagination: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10 }, error: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 11 }, selected: { backgroundColor: operationsColors.greenSoft },
  paymentRow: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: 1, borderTopColor: operationsColors.border }, paymentRowCompact: { flexWrap: 'wrap' }, amountCompact: { alignItems: 'flex-start', width: '100%' },
  transactionDetail: { padding: 12, backgroundColor: operationsColors.greenSoft }, detailGrid: { flexDirection: 'row', flexWrap: 'wrap' }, detailCell: { width: '50%', minWidth: 190, padding: 9 }, detailCellCompact: { width: '100%', minWidth: 0 }, detailLabel: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  payoutLayout: { flexDirection: 'row', flexWrap: 'wrap' }, payoutLayoutCompact: { flexDirection: 'column', flexWrap: 'nowrap', alignItems: 'stretch' }, payoutList: { flex: 1.2, minWidth: 280, borderRightWidth: 1, borderRightColor: operationsColors.border }, payoutListCompact: { flex: 0, width: '100%', minWidth: 0, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, payoutRow: { minHeight: 78, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, padding: 12, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, payoutDetail: { flex: 0.8, minWidth: 280, padding: 14, gap: 8 }, payoutDetailCompact: { flex: 0, width: '100%', minWidth: 0 }, detailAmount: { color: operationsColors.ink, fontSize: 22, fontWeight: '800', marginVertical: 5 }, notice: { color: operationsColors.amber, backgroundColor: operationsColors.amberSoft, padding: 10, marginTop: 10 }, reconcile: { gap: 9, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: operationsColors.border },
});
