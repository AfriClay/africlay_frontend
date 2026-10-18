import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowUpRight, CircleAlert, ClipboardList, CreditCard, Package, ShieldCheck, ShoppingBag, Store, Users, X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  adminKeys,
  adminService,
  AdminCatalogItem,
  AdminCatalogKind,
  DashboardAccessRequest,
  OperationsStore,
  OperationsUser,
  TaxonomyKind,
} from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import type { StaffRole } from '../../types/user';
import { isSuperAdmin } from '../../utils/roles';
import { DataFreshness, formatOperationsDate, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

type Section = 'overview' | 'requests' | 'accounts' | 'stores' | 'catalog' | 'orders' | 'taxonomy' | 'audit';
type CatalogFilter = 'all' | 'draft' | 'published' | 'archived';
type PendingAction =
  | { kind: 'request'; record: DashboardAccessRequest; decision: 'approved' | 'rejected' }
  | { kind: 'emailRole'; email: string; role: StaffRole; action: 'grant' | 'revoke' }
  | { kind: 'role'; user: OperationsUser; role: StaffRole; action: 'grant' | 'revoke' }
  | { kind: 'account'; user: OperationsUser; action: 'suspend' | 'restore' }
  | { kind: 'store'; store: OperationsStore; action: 'suspend' | 'restore' }
  | { kind: 'catalog'; item: AdminCatalogItem; action: 'archive' | 'restore_to_draft' };

const sectionLabels: Record<Section, string> = {
  overview: 'Overview', requests: 'Access requests', accounts: 'Accounts', stores: 'Stores',
  catalog: 'Catalog', orders: 'Orders', taxonomy: 'Taxonomy', audit: 'Audit',
};
const catalogFilters: CatalogFilter[] = ['all', 'draft', 'published', 'archived'];
const orderStatuses = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
const paymentStatuses = ['all', 'pending', 'partial', 'paid', 'failed', 'refunded'] as const;
const money = (value: number, currency = 'KES') => `${currency === 'KES' ? 'KSh' : currency} ${value.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export const SuperAdminDashboard = () => {
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const client = useQueryClient();
  const allowed = isSuperAdmin(auth.user);
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [selectedStoreId, setSelectedStoreId] = useState<string>();
  const [pending, setPending] = useState<PendingAction>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [taxonomyKind, setTaxonomyKind] = useState<TaxonomyKind>('product-categories');
  const [taxonomyName, setTaxonomyName] = useState('');
  const [taxonomySlug, setTaxonomySlug] = useState('');
  const [catalogKind, setCatalogKind] = useState<AdminCatalogKind>('products');
  const [catalogStatus, setCatalogStatus] = useState<CatalogFilter>('all');
  const [orderStatus, setOrderStatus] = useState<(typeof orderStatuses)[number]>('all');
  const [paymentStatus, setPaymentStatus] = useState<(typeof paymentStatuses)[number]>('all');
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30);
  const [assignmentEmail, setAssignmentEmail] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<StaffRole>('sales_reviewer');

  const overview = useQuery({ queryKey: adminKeys.overview(trendDays), queryFn: () => adminService.getOverview(trendDays), enabled: allowed && section === 'overview' });
  const requests = useQuery({ queryKey: adminKeys.accessRequests('pending'), queryFn: () => adminService.listAccessRequests({ status: 'pending', limit: 100 }), enabled: allowed });
  const users = useQuery({ queryKey: adminKeys.users(search), queryFn: () => adminService.listUsers({ search: search.trim(), limit: 100 }), enabled: allowed && section === 'accounts' });
  const stores = useQuery({ queryKey: adminKeys.stores(search), queryFn: () => adminService.listStores({ search: search.trim(), limit: 100 }), enabled: allowed && section === 'stores' });
  const catalog = useQuery({
    queryKey: adminKeys.catalog(catalogKind, catalogStatus, search),
    queryFn: () => adminService.listCatalog(catalogKind, { search: search.trim(), status: catalogStatus === 'all' ? undefined : catalogStatus, limit: 100 }),
    enabled: allowed && section === 'catalog',
  });
  const orders = useQuery({
    queryKey: adminKeys.orders(orderStatus, paymentStatus, search),
    queryFn: () => adminService.listOrders({ search: search.trim(), status: orderStatus === 'all' ? undefined : orderStatus, payment_status: paymentStatus === 'all' ? undefined : paymentStatus, limit: 100 }),
    enabled: allowed && section === 'orders',
  });
  const audit = useQuery({ queryKey: adminKeys.audit, queryFn: () => adminService.listAuditLogs({ limit: 100 }), enabled: allowed && (section === 'audit' || section === 'overview') });
  const taxonomy = useQuery({ queryKey: adminKeys.taxonomy(taxonomyKind), queryFn: () => adminService.listTaxonomy(taxonomyKind), enabled: allowed && section === 'taxonomy' });
  const selectedUser = useMemo(() => users.data?.results.find(item => item.id === selectedUserId) ?? users.data?.results[0], [users.data, selectedUserId]);
  const selectedStore = useMemo(() => stores.data?.results.find(item => item.id === selectedStoreId) ?? stores.data?.results[0], [stores.data, selectedStoreId]);

  if (!allowed) return <ErrorState message="Super administrator access is required for this dashboard." />;

  const changeSection = (value: Section) => {
    setSection(value);
    setSearch('');
    setError(undefined);
  };
  const submitAction = async () => {
    if (!pending || busy) return;
    if (!reason.trim()) { setError('A reason is required for this action.'); return; }
    setBusy(true); setError(undefined);
    try {
      if (pending.kind === 'request') await adminService.reviewAccessRequest(pending.record.id, pending.decision, reason);
      if (pending.kind === 'emailRole') await adminService.assignStaffRoleByEmail(pending.email, pending.role, pending.action, reason);
      if (pending.kind === 'role') await adminService.changeStaffRole(pending.user.id, pending.role, pending.action, reason);
      if (pending.kind === 'account') await adminService.changeAccountStatus(pending.user.id, pending.action, reason);
      if (pending.kind === 'store') await adminService.changeStoreStatus(pending.store.id, pending.action, reason);
      if (pending.kind === 'catalog') await adminService.changeCatalogStatus(pending.item, pending.action, reason);
      await client.invalidateQueries({ queryKey: ['operations'] });
      if (pending.kind === 'emailRole') setAssignmentEmail('');
      setPending(undefined); setReason('');
    } catch (value) { setError(getApiErrorMessage(value, 'Unable to complete this administrative action.')); }
    finally { setBusy(false); }
  };
  const createTaxonomy = async () => {
    if (!taxonomyName.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(taxonomySlug)) { setError('Enter a name and lowercase hyphenated slug.'); return; }
    setBusy(true); setError(undefined);
    try { await adminService.createTaxonomy(taxonomyKind, { name: taxonomyName, slug: taxonomySlug }); await taxonomy.refetch(); setTaxonomyName(''); setTaxonomySlug(''); }
    catch (value) { setError(getApiErrorMessage(value, 'Unable to add this taxonomy record.')); }
    finally { setBusy(false); }
  };

  return <OperationsScaffold title="Administration" subtitle="Platform authority for staff access, marketplace safety, catalog governance, order oversight, and audited operational controls.">
    <View style={styles.tabs}>{(Object.keys(sectionLabels) as Section[]).map(value => <Pressable key={value} onPress={() => changeSection(value)} style={[styles.tab, section === value && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: section === value }}><Text style={[styles.tabText, section === value && styles.tabTextActive]}>{value === 'requests' ? `${sectionLabels[value]} (${requests.data?.count ?? 0})` : sectionLabels[value]}</Text></Pressable>)}</View>

    {section === 'overview' ? <OverviewSection data={overview.data} loading={overview.isLoading} failed={overview.isError} retry={() => void overview.refetch()} refreshing={overview.isFetching} updatedAt={overview.dataUpdatedAt} trendDays={trendDays} onTrendDays={setTrendDays} recentAudit={audit.data?.results.slice(0, 6) ?? []} onNavigate={changeSection} onOpenSales={() => navigation.navigate('SalesDashboard')} onOpenCatalogArchived={() => { setCatalogStatus('archived'); changeSection('catalog'); }} onOpenOrders={(statusValue, paymentValue) => { if (statusValue) setOrderStatus(statusValue); if (paymentValue) setPaymentStatus(paymentValue); changeSection('orders'); }} /> : null}

    {section === 'requests' ? <><View style={[styles.panel, styles.assignmentPanel]}><Text style={styles.panelTitle}>Assign dashboard access</Text><Text style={styles.assignmentHelp}>Enter an existing account email, choose the dashboard, then grant or revoke access. Every change is audited and invalidates existing sessions.</Text><View style={styles.assignmentForm}><Input label="Staff account email" required value={assignmentEmail} onChangeText={setAssignmentEmail} placeholder="staff@company.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" accessibilityLabel="Staff account email" /><View style={styles.filters}>{(['sales_reviewer', 'finance'] as StaffRole[]).map(role => <FilterButton key={role} label={role === 'sales_reviewer' ? 'Sales review' : 'Finance'} active={assignmentRole === role} onPress={() => setAssignmentRole(role)} />)}</View><View style={styles.rowActions}><Button variant="outline" disabled={!assignmentEmail.trim()} onPress={() => setPending({ kind: 'emailRole', email: assignmentEmail.trim(), role: assignmentRole, action: 'revoke' })}>Revoke</Button><Button disabled={!assignmentEmail.trim()} onPress={() => setPending({ kind: 'emailRole', email: assignmentEmail.trim(), role: assignmentRole, action: 'grant' })}>Grant access</Button></View></View></View><View style={styles.panel}><Text style={styles.panelTitle}>Pending dashboard access</Text>{requests.isError ? <ErrorState message="Unable to load dashboard access requests." onRetry={() => void requests.refetch()} /> : requests.isLoading ? <Text style={styles.empty}>Loading requests...</Text> : requests.data?.results.length ? requests.data.results.map(item => <View key={item.id} style={styles.requestRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.requesterName || item.requesterEmail}</Text><StatusPill value={item.requestedRole === 'sales_reviewer' ? 'sales review' : 'finance'} /><Text style={styles.meta}>{item.requesterEmail}</Text><Text style={styles.reasonText}>{item.requestReason}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View><View style={styles.rowActions}><Button size="sm" variant="outline" onPress={() => setPending({ kind: 'request', record: item, decision: 'rejected' })}>Reject</Button><Button size="sm" onPress={() => setPending({ kind: 'request', record: item, decision: 'approved' })}>Approve</Button></View></View>) : <Text style={styles.empty}>No dashboard access requests are waiting for review.</Text>}</View></> : null}

    {section === 'accounts' ? <><SearchField value={search} onChangeText={setSearch} placeholder="Search name, email, phone or store" accessibilityLabel="Search accounts" containerStyle={styles.search} /><View style={styles.split}><View style={styles.list}>{users.isError ? <ErrorState message="Unable to load accounts." onRetry={() => void users.refetch()} /> : users.isLoading ? <Text style={styles.empty}>Loading accounts...</Text> : users.data?.results.map(user => <Pressable key={user.id} onPress={() => setSelectedUserId(user.id)} style={[styles.listRow, selectedUser?.id === user.id && styles.selected]}><View style={styles.main}><Text style={styles.rowTitle}>{user.fullName}</Text><Text style={styles.meta}>{user.email} - {user.role.replaceAll('_', ' ')}</Text></View><StatusPill value={user.active ? 'active' : 'suspended'} /></Pressable>)}</View><View style={styles.detail}>{selectedUser ? <><Text style={styles.detailTitle}>{selectedUser.fullName}</Text><Text style={styles.meta}>{selectedUser.email}</Text><Text style={styles.meta}>Phone: {selectedUser.phoneNumber || 'Not recorded'}</Text><Text style={styles.meta}>Joined: {formatOperationsDate(selectedUser.dateJoined)}</Text><Text style={styles.label}>Dashboard roles</Text><View style={styles.roles}>{(['sales_reviewer', 'finance'] as StaffRole[]).map(role => { const assigned = selectedUser.staffRoles.includes(role); return <Button key={role} size="sm" variant={assigned ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'role', user: selectedUser, role, action: assigned ? 'revoke' : 'grant' })}>{assigned ? `Revoke ${role.replaceAll('_', ' ')}` : `Grant ${role.replaceAll('_', ' ')}`}</Button>; })}</View><Text style={styles.label}>Account status</Text><Button variant={selectedUser.active ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'account', user: selectedUser, action: selectedUser.active ? 'suspend' : 'restore' })}>{selectedUser.active ? 'Suspend account' : 'Restore account'}</Button></> : <Text style={styles.empty}>Select an account.</Text>}</View></View></> : null}

    {section === 'stores' ? <><SearchField value={search} onChangeText={setSearch} placeholder="Search store, slug or owner" accessibilityLabel="Search stores" containerStyle={styles.search} /><View style={styles.split}><View style={styles.list}>{stores.isError ? <ErrorState message="Unable to load stores." onRetry={() => void stores.refetch()} /> : stores.data?.results.map(store => <Pressable key={store.id} onPress={() => setSelectedStoreId(store.id)} style={[styles.listRow, selectedStore?.id === store.id && styles.selected]}><View style={styles.main}><Text style={styles.rowTitle}>{store.name}</Text><Text style={styles.meta}>{store.ownerEmail}</Text></View><StatusPill value={store.status} /></Pressable>)}</View><View style={styles.detail}>{selectedStore ? <><Text style={styles.detailTitle}>{selectedStore.name}</Text><Text style={styles.meta}>{selectedStore.ownerEmail}</Text><Text style={styles.label}>Persisted activity</Text><View style={styles.activity}><Stat label="Products" value={selectedStore.activity.products} /><Stat label="Services" value={selectedStore.activity.services} /><Stat label="Orders" value={selectedStore.activity.orders} /><Stat label="Reviews" value={selectedStore.activity.reviews} /></View><Text style={styles.meta}>Last recorded activity: {formatOperationsDate(selectedStore.activity.lastActivityAt)}</Text><Button variant={selectedStore.status === 'active' ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'store', store: selectedStore, action: selectedStore.status === 'active' ? 'suspend' : 'restore' })}>{selectedStore.status === 'active' ? 'Suspend store' : 'Restore store'}</Button></> : <Text style={styles.empty}>Select a store.</Text>}</View></View></> : null}

    {section === 'catalog' ? <><View style={styles.toolbar}><View style={styles.filters}>{(['products', 'services'] as AdminCatalogKind[]).map(kind => <FilterButton key={kind} label={kind} active={catalogKind === kind} onPress={() => setCatalogKind(kind)} />)}</View><View style={styles.filters}>{catalogFilters.map(value => <FilterButton key={value} label={value} active={catalogStatus === value} onPress={() => setCatalogStatus(value)} />)}</View><SearchField value={search} onChangeText={setSearch} placeholder="Search listing, store or owner" accessibilityLabel="Search catalog" containerStyle={styles.search} /></View><View style={styles.panel}><Text style={styles.panelTitle}>Marketplace listings</Text>{catalog.isError ? <ErrorState message="Unable to load catalog listings." onRetry={() => void catalog.refetch()} /> : catalog.isLoading ? <Text style={styles.empty}>Loading listings...</Text> : catalog.data?.results.length ? catalog.data.results.map(item => <View key={item.id} style={styles.catalogRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.name}</Text><Text style={styles.meta}>{item.storeName} - {item.ownerEmail}</Text><Text style={styles.meta}>{item.categoryName || 'Uncategorised'} - {money(item.price, item.currency)} - updated {formatOperationsDate(item.updatedAt)}</Text></View><StatusPill value={item.status} /><Button size="sm" variant="outline" onPress={() => setPending({ kind: 'catalog', item, action: item.status === 'archived' ? 'restore_to_draft' : 'archive' })}>{item.status === 'archived' ? 'Restore to draft' : 'Archive'}</Button></View>) : <Text style={styles.empty}>No listings match these filters.</Text>}</View></> : null}

    {section === 'orders' ? <><View style={styles.toolbar}><SearchField value={search} onChangeText={setSearch} placeholder="Search order ID, buyer or tracking" accessibilityLabel="Search orders" containerStyle={styles.search} /><Text style={styles.label}>Fulfilment</Text><View style={styles.filters}>{orderStatuses.map(value => <FilterButton key={value} label={value} active={orderStatus === value} onPress={() => setOrderStatus(value)} />)}</View><Text style={styles.label}>Payment</Text><View style={styles.filters}>{paymentStatuses.map(value => <FilterButton key={value} label={value} active={paymentStatus === value} onPress={() => setPaymentStatus(value)} />)}</View></View><View style={styles.panel}><Text style={styles.panelTitle}>Order oversight</Text>{orders.isError ? <ErrorState message="Unable to load orders." onRetry={() => void orders.refetch()} /> : orders.isLoading ? <Text style={styles.empty}>Loading orders...</Text> : orders.data?.results.length ? orders.data.results.map(order => <View key={order.id} style={styles.orderRow}><View style={styles.main}><Text style={styles.rowTitle}>Order #{order.id.slice(0, 8)}</Text><Text style={styles.meta}>{order.buyerEmail} - {order.itemCount} item{order.itemCount === 1 ? '' : 's'}</Text><Text style={styles.meta}>{order.shippingCity}, {order.shippingCountry} - {formatOperationsDate(order.createdAt)}</Text><Text style={styles.meta}>Sellers: {order.sellerEmails.join(', ') || 'Not recorded'}</Text></View><View style={styles.orderState}><StatusPill value={order.status} /><StatusPill value={order.paymentStatus} /><Text style={styles.amount}>{money(order.totalAmount, order.currency)}</Text><Text style={styles.meta}>Paid {money(order.amountPaid, order.currency)}</Text></View></View>) : <Text style={styles.empty}>No orders match these filters.</Text>}</View></> : null}

    {section === 'taxonomy' ? <View style={styles.panel}><Text style={styles.panelTitle}>Catalog structure</Text><View style={[styles.tabs, styles.inset]}>{(['product-categories', 'product-tags', 'service-categories'] as TaxonomyKind[]).map(kind => <Pressable key={kind} onPress={() => setTaxonomyKind(kind)} style={[styles.tab, taxonomyKind === kind && styles.tabActive]}><Text style={[styles.tabText, taxonomyKind === kind && styles.tabTextActive]}>{kind.replaceAll('-', ' ')}</Text></Pressable>)}</View><View style={styles.taxonomyEditor}><Input label="Name" required value={taxonomyName} onChangeText={value => { setTaxonomyName(value); setTaxonomySlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Category or tag name" containerStyle={styles.taxonomyField} /><Input label="Slug" required value={taxonomySlug} onChangeText={setTaxonomySlug} placeholder="url-slug" autoCapitalize="none" containerStyle={styles.taxonomyField} /><Button loading={busy} onPress={() => void createTaxonomy()}>Add</Button></View>{error ? <Text style={styles.error}>{error}</Text> : null}{taxonomy.isError ? <ErrorState message="Unable to load taxonomy." onRetry={() => void taxonomy.refetch()} /> : taxonomy.data?.map(record => <View key={record.id} style={styles.listRow}><View style={styles.main}><Text style={styles.rowTitle}>{record.name}</Text><Text style={styles.meta}>{record.slug}</Text></View></View>)}</View> : null}

    {section === 'audit' ? <View style={styles.panel}><Text style={styles.panelTitle}>Administrative audit log</Text>{audit.isError ? <ErrorState message="Unable to load the audit log." onRetry={() => void audit.refetch()} /> : audit.data?.results.length ? audit.data.results.map(item => <View key={item.id} style={styles.auditRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.action.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.actorEmail || 'System'} - {item.targetType}:{item.targetId}</Text><Text style={styles.reasonText}>{item.reason || 'No reason recorded'}</Text></View><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View>) : <Text style={styles.empty}>No audit events are available.</Text>}</View> : null}

    <Modal visible={Boolean(pending)} transparent animationType="fade" onRequestClose={() => setPending(undefined)}><View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal><View style={styles.modalHeading}><Text style={styles.detailTitle}>Confirm administrative action</Text><Button variant="icon" size="sm" accessibilityLabel="Close" onPress={() => setPending(undefined)} icon={<X size={18} color={operationsColors.ink} />} /></View><Text style={styles.meta}>The decision and reason will be written to the administrative audit log.</Text><Input label="Reason" required value={reason} onChangeText={setReason} multiline placeholder="Required reason" accessibilityLabel="Administrative action reason" />{error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}<View style={styles.rowActions}><Button variant="outline" disabled={busy} onPress={() => setPending(undefined)}>Cancel</Button><Button loading={busy} onPress={() => void submitAction()}>Confirm</Button></View></View></View></Modal>
  </OperationsScaffold>;
};

const OverviewSection = ({ data, loading, failed, retry, refreshing, updatedAt, trendDays, onTrendDays, recentAudit, onNavigate, onOpenSales, onOpenCatalogArchived, onOpenOrders }: {
  data?: Awaited<ReturnType<typeof adminService.getOverview>>;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  refreshing: boolean;
  updatedAt: number;
  trendDays: 7 | 30 | 90;
  onTrendDays: (days: 7 | 30 | 90) => void;
  recentAudit: Awaited<ReturnType<typeof adminService.listAuditLogs>>['results'];
  onNavigate: (section: Section) => void;
  onOpenSales: () => void;
  onOpenCatalogArchived: () => void;
  onOpenOrders: (status?: (typeof orderStatuses)[number], payment?: (typeof paymentStatuses)[number]) => void;
}) => {
  if (failed) return <ErrorState message="Unable to load the administration overview." onRetry={retry} />;
  if (loading || !data) return <Text style={styles.empty}>Loading platform overview...</Text>;
  const queues = [
    { label: 'Access requests', count: data.dashboardAccessPending, detail: 'Dashboard access requests waiting for a decision', open: () => onNavigate('requests'), tone: 'amber' as const, icon: <ClipboardList size={18} color={operationsColors.amber} /> },
    { label: 'Failed payments', count: data.orders.paymentFailed, detail: 'Orders with a failed payment status', open: () => onOpenOrders(undefined, 'failed'), tone: 'red' as const, icon: <CircleAlert size={18} color={operationsColors.red} /> },
    { label: 'Payments pending', count: data.orders.paymentPending, detail: 'Orders awaiting payment completion', open: () => onOpenOrders(undefined, 'pending'), tone: 'amber' as const, icon: <CreditCard size={18} color={operationsColors.amber} /> },
    { label: 'Orders pending', count: data.orders.pending, detail: 'Orders not yet in fulfilment', open: () => onOpenOrders('pending'), tone: 'amber' as const, icon: <ShoppingBag size={18} color={operationsColors.amber} /> },
    { label: 'KYC pending', count: data.stores.kycPending, detail: 'Seller verification submissions awaiting review', open: onOpenSales, tone: 'amber' as const, icon: <ShieldCheck size={18} color={operationsColors.amber} /> },
    { label: 'Archived listings', count: data.products.archived + data.services.archived, detail: 'Listings removed from the public marketplace', open: onOpenCatalogArchived, tone: 'amber' as const, icon: <Package size={18} color={operationsColors.amber} /> },
  ];
  const activeQueues = queues.filter(queue => queue.count > 0).length;
  const orderStages = [
    { label: 'Pending', count: data.orders.pending },
    { label: 'Processing', count: data.orders.processing },
    { label: 'Shipped', count: data.orders.shipped },
    { label: 'Delivered', count: data.orders.delivered },
    { label: 'Cancelled', count: data.orders.cancelled },
  ];
  const largestStage = Math.max(...orderStages.map(stage => stage.count), 1);
  return <>
    <DataFreshness updatedAt={updatedAt} refreshing={refreshing} onRefresh={retry} />
    <View style={styles.commandHero}>
      <View style={styles.commandHeroCopy}>
        <View style={styles.commandEyebrow}><ShieldCheck size={15} color="#C8E6D2" /><Text style={styles.commandEyebrowText}>SUPERADMIN COMMAND CENTER</Text></View>
        <Text style={styles.commandTitle}>Platform overview</Text>
        <Text style={styles.commandSubtitle}>{activeQueues
          ? `${activeQueues} of ${queues.length} tracked review areas have open work. Start with the highlighted queues below.`
          : `All ${queues.length} tracked review queues are clear. Use the current platform snapshot to keep an eye on operations.`}</Text>
      </View>
      <View style={[styles.commandStatus, activeQueues > 0 && styles.commandStatusActive]}>
        <Text style={[styles.commandStatusValue, activeQueues > 0 && styles.commandStatusValueActive]}>{activeQueues || '0'}</Text>
        <Text style={[styles.commandStatusLabel, activeQueues > 0 && styles.commandStatusLabelActive]}>{activeQueues ? 'queues to review' : 'clear'}</Text>
      </View>
    </View>

    <View style={styles.overviewHeading}>
      <View><Text style={styles.overviewTitle}>Review queue</Text><Text style={styles.overviewDescription}>Current workload signals · select a card to open its workspace</Text></View>
      <Text style={styles.liveTag}>CURRENT SNAPSHOT</Text>
    </View>
    <View style={styles.queueGrid}>
      {queues.map(queue => <Pressable
        key={queue.label}
         onPress={queue.open}
        accessibilityRole="button"
         accessibilityLabel={`${queue.label}: ${queue.count}. Open filtered workspace`}
        style={[styles.queueCard, queue.count > 0 && styles.queueCardActive, queue.count > 0 && queue.tone === 'red' && styles.queueCardUrgent]}
      >
        <View style={styles.queueCardTop}>
          <View style={[styles.queueIcon, queue.count > 0 && queue.tone === 'red' && styles.queueIconUrgent]}>{queue.icon}</View>
          <ArrowUpRight size={16} color={operationsColors.muted} />
        </View>
        <Text style={styles.queueCount}>{queue.count.toLocaleString('en-KE')}</Text>
        <Text style={styles.queueLabel}>{queue.label}</Text>
        <Text style={styles.queueDetail}>{queue.count ? queue.detail : 'Nothing waiting in this queue'}</Text>
        <Text style={[styles.queueState, queue.count > 0 && queue.tone === 'red' && styles.queueStateUrgent, queue.count === 0 && styles.queueStateClear]}>{queue.count ? 'REVIEW' : 'CLEAR'}</Text>
      </Pressable>)}
    </View>

    <View style={styles.overviewHeading}>
      <View><Text style={styles.overviewTitle}>Platform pulse</Text><Text style={styles.overviewDescription}>Current totals from the administration overview</Text></View>
    </View>
    <View style={styles.metrics}>
      <OverviewMetric icon={<Users size={17} color={operationsColors.green} />} label="Accounts" value={data.accounts.total} note={`${data.accounts.active.toLocaleString('en-KE')} active · ${data.accounts.suspended.toLocaleString('en-KE')} suspended`} />
      <OverviewMetric icon={<Store size={17} color={operationsColors.green} />} label="Stores" value={data.stores.total} note={`${data.stores.active.toLocaleString('en-KE')} active · ${data.stores.kycPending.toLocaleString('en-KE')} KYC pending`} />
      <OverviewMetric icon={<Package size={17} color={operationsColors.green} />} label="Catalog listings" value={data.products.total + data.services.total} note={`${(data.products.published + data.services.published).toLocaleString('en-KE')} published · ${(data.products.draft + data.services.draft).toLocaleString('en-KE')} draft`} />
      <OverviewMetric icon={<ShoppingBag size={17} color={operationsColors.green} />} label="Orders" value={data.orders.total} note={`${(data.orders.pending + data.orders.processing + data.orders.shipped).toLocaleString('en-KE')} in motion · ${data.orders.paymentFailed.toLocaleString('en-KE')} payment failures`} />
    </View>
    <View style={styles.flowPanel}>
      <View style={styles.flowHeading}><View><Text style={styles.overviewTitle}>Order flow</Text><Text style={styles.overviewDescription}>Fulfilment status breakdown · {data.orders.total.toLocaleString('en-KE')} total orders</Text></View><Pressable onPress={() => onNavigate('orders')} accessibilityRole="button" style={styles.flowLink}><Text style={styles.flowLinkText}>Open orders</Text><ArrowUpRight size={15} color={operationsColors.green} /></Pressable></View>
      <View style={styles.flowGrid}>{orderStages.map(stage => <View key={stage.label} style={styles.flowStage}>
        <View style={styles.flowStageHeader}><Text style={styles.flowStageLabel}>{stage.label}</Text><Text style={styles.flowStageCount}>{stage.count.toLocaleString('en-KE')}</Text></View>
        <View style={styles.flowTrack}><View style={[styles.flowFill, stage.label === 'Cancelled' && styles.flowFillMuted, { width: `${Math.round((stage.count / largestStage) * 100)}%` }]} /></View>
      </View>)}</View>
    </View>
    <View style={styles.flowPanel}>
      <View style={styles.flowHeading}><View><Text style={styles.overviewTitle}>Growth and operations trend</Text><Text style={styles.overviewDescription}>Daily persisted activity. Empty days are shown as zero.</Text></View><View style={styles.filters}>{([7, 30, 90] as const).map(days => <FilterButton key={days} label={`${days} days`} active={trendDays === days} onPress={() => onTrendDays(days)} />)}</View></View>
      <TrendBars label="New accounts" values={data.trends.map(item => item.accounts)} dates={data.trends.map(item => item.date)} />
      <TrendBars label="New stores" values={data.trends.map(item => item.stores)} dates={data.trends.map(item => item.date)} />
      <TrendBars label="Orders" values={data.trends.map(item => item.orders)} dates={data.trends.map(item => item.date)} />
    </View>
    <View style={styles.flowPanel}>
      <View style={styles.flowHeading}><View><Text style={styles.overviewTitle}>Recent administrative activity</Text><Text style={styles.overviewDescription}>Append-only audit events from real administrative actions.</Text></View><Pressable onPress={() => onNavigate('audit')} accessibilityRole="button" style={styles.flowLink}><Text style={styles.flowLinkText}>Open audit log</Text><ArrowUpRight size={15} color={operationsColors.green} /></Pressable></View>
      {recentAudit.length ? recentAudit.map(item => <View key={item.id} style={styles.recentRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.action.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.actorEmail || 'System'} - {item.targetType}:{item.targetId}</Text></View><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View>) : <Text style={styles.empty}>No audit activity is available.</Text>}
    </View>
  </>;
};

const FilterButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable onPress={onPress} style={[styles.filter, active && styles.filterActive]} accessibilityRole="button" accessibilityState={{ selected: active }}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label.replaceAll('_', ' ')}</Text></Pressable>;
const Metric = ({ label, value, note }: { label: string; value: number; note: string }) => <View style={styles.metric}><Text style={styles.metricValue}>{value.toLocaleString('en-KE')}</Text><Text style={styles.rowTitle}>{label}</Text><Text style={styles.meta}>{note}</Text></View>;
const Stat = ({ label, value }: { label: string; value: number }) => <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.meta}>{label}</Text></View>;
const OverviewMetric = ({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: number; note: string }) => <View style={styles.overviewMetric}>
  <View style={styles.overviewMetricHeading}>{icon}<Text style={styles.overviewMetricLabel}>{label}</Text></View>
  <Text style={styles.overviewMetricValue}>{value.toLocaleString('en-KE')}</Text>
  <Text style={styles.overviewMetricNote}>{note}</Text>
</View>;
const TrendBars = ({ label, values, dates }: { label: string; values: number[]; dates: string[] }) => {
  const largest = Math.max(...values, 1);
  const total = values.reduce((sum, value) => sum + value, 0);
  return <View style={styles.trendRow} accessibilityLabel={`${label}: ${total} over selected period`}>
    <View style={styles.trendHeading}><Text style={styles.rowTitle}>{label}</Text><Text style={styles.meta}>{total.toLocaleString('en-KE')} total</Text></View>
    <View style={styles.trendBars}>{values.map((value, index) => <View key={`${dates[index]}-${index}`} style={styles.trendSlot} accessibilityLabel={`${dates[index]}: ${value}`}><View style={[styles.trendBar, { height: Math.max(2, Math.round((value / largest) * 48)) }]} /></View>)}</View>
    <View style={styles.trendDates}><Text style={styles.meta}>{dates[0] || ''}</Text><Text style={styles.meta}>{dates[dates.length - 1] || ''}</Text></View>
  </View>;
};

const styles = StyleSheet.create({
  commandHero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: 22, marginBottom: 20, borderRadius: 8, backgroundColor: '#173E2D' },
  commandHeroCopy: { flex: 1, minWidth: 220 },
  commandEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  commandEyebrowText: { color: '#C8E6D2', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  commandTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  commandSubtitle: { maxWidth: 660, color: '#D5E5DA', fontSize: 12, lineHeight: 19, marginTop: 6 },
  commandStatus: { minWidth: 102, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 7, backgroundColor: '#DFF0E5' },
  commandStatusActive: { backgroundColor: '#FFF0D8' },
  commandStatusValue: { color: operationsColors.green, fontSize: 25, fontWeight: '800' },
  commandStatusValueActive: { color: operationsColors.amber },
  commandStatusLabel: { color: operationsColors.green, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  commandStatusLabelActive: { color: operationsColors.amber },
  overviewHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  overviewTitle: { color: operationsColors.ink, fontSize: 16, fontWeight: '800' },
  overviewDescription: { color: operationsColors.muted, fontSize: 11, marginTop: 4 },
  liveTag: { color: operationsColors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, backgroundColor: operationsColors.greenSoft },
  queueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  queueCard: { flexGrow: 1, flexBasis: 174, minWidth: 155, minHeight: 196, padding: 13, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 7, backgroundColor: operationsColors.panel },
  queueCardActive: { borderColor: '#E5C99E', backgroundColor: '#FFFCF7' },
  queueCardUrgent: { borderColor: '#E6B8B4', backgroundColor: '#FFFAF9' },
  queueCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  queueIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: operationsColors.greenSoft },
  queueIconUrgent: { backgroundColor: operationsColors.redSoft },
  queueCount: { color: operationsColors.ink, fontSize: 26, fontWeight: '800', marginTop: 11 },
  queueLabel: { color: operationsColors.ink, fontSize: 13, fontWeight: '800', marginTop: 2 },
  queueDetail: { flex: 1, color: operationsColors.muted, fontSize: 10, lineHeight: 15, marginTop: 5 },
  queueState: { alignSelf: 'flex-start', color: operationsColors.amber, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginTop: 10 },
  queueStateUrgent: { color: operationsColors.red },
  queueStateClear: { color: operationsColors.green },
  overviewMetric: { flexGrow: 1, flexBasis: 210, minHeight: 119, padding: 14, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 7, backgroundColor: operationsColors.panel },
  overviewMetricHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  overviewMetricLabel: { color: operationsColors.muted, fontSize: 11, fontWeight: '700' },
  overviewMetricValue: { color: operationsColors.ink, fontSize: 24, fontWeight: '800', marginTop: 9 },
  overviewMetricNote: { color: operationsColors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  flowPanel: { padding: 16, marginTop: 4, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 7, backgroundColor: operationsColors.panel },
  flowHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  flowLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5 },
  flowLinkText: { color: operationsColors.green, fontSize: 11, fontWeight: '800' },
  flowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  flowStage: { flexGrow: 1, flexBasis: 150 },
  flowStageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  flowStageLabel: { color: operationsColors.muted, fontSize: 10, fontWeight: '700' },
  flowStageCount: { color: operationsColors.ink, fontSize: 12, fontWeight: '800' },
  flowTrack: { height: 6, overflow: 'hidden', borderRadius: 3, backgroundColor: '#E8ECE9' },
  flowFill: { height: '100%', borderRadius: 3, backgroundColor: operationsColors.green },
  flowFillMuted: { backgroundColor: '#A9B2AD' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }, inset: { paddingHorizontal: 13, paddingTop: 13 }, tab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, tabActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, tabText: { color: operationsColors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, tabTextActive: { color: operationsColors.green },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }, metric: { flexGrow: 1, flexBasis: 180, minHeight: 104, padding: 15, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, metricValue: { color: operationsColors.green, fontSize: 26, fontWeight: '800', marginBottom: 6 }, scope: { borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, scopeGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 7 }, scopeItem: { flexGrow: 1, flexBasis: 260, minHeight: 92, padding: 12, borderWidth: 1, borderColor: operationsColors.border },
  panel: { borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, panelTitle: { color: operationsColors.ink, fontSize: 16, fontWeight: '800', padding: 15, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, requestRow: { minHeight: 92, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, main: { flex: 1, minWidth: 180 }, rowTitle: { color: operationsColors.ink, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 4 }, reasonText: { color: operationsColors.ink, fontSize: 12, lineHeight: 18, marginTop: 7 }, rowActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 }, empty: { color: operationsColors.muted, padding: 18 },
  toolbar: { gap: 8, marginBottom: 12 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, filter: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, filterActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, filterText: { color: operationsColors.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, filterTextActive: { color: operationsColors.green },
  search: { width: '100%', maxWidth: 560, marginBottom: 4 }, split: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }, list: { flex: 1.15, minWidth: 300, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, detail: { flex: 0.85, minWidth: 290, gap: 9, padding: 16, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, selected: { backgroundColor: operationsColors.greenSoft }, detailTitle: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' }, label: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 7 }, roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, activity: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { minWidth: 92, padding: 11, borderWidth: 1, borderColor: operationsColors.border }, statValue: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' },
  catalogRow: { minHeight: 82, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, orderRow: { minHeight: 100, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, orderState: { minWidth: 140, alignItems: 'flex-end', gap: 5 }, amount: { color: operationsColors.ink, fontSize: 15, fontWeight: '800', marginTop: 4 },
  taxonomyEditor: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, padding: 13 }, taxonomyField: { flexGrow: 1, minWidth: 180, marginBottom: 0 }, auditRow: { minHeight: 78, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, error: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 10 },
  assignmentPanel: { marginBottom: 14 }, assignmentHelp: { color: operationsColors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 15, paddingTop: 12 }, assignmentForm: { gap: 10, padding: 15 },
  recentRow: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: operationsColors.border },
  trendRow: { marginTop: 13 }, trendHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }, trendBars: { height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 1, paddingHorizontal: 1, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, trendSlot: { flex: 1, height: 50, justifyContent: 'flex-end' }, trendBar: { width: '100%', minWidth: 2, backgroundColor: operationsColors.green }, trendDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16,28,22,0.62)' }, modal: { width: '100%', maxWidth: 520, padding: 18, borderRadius: 6, backgroundColor: operationsColors.panel }, modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
