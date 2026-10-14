import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SearchField } from '../../components/ui/SearchField';
import { useAuth } from '../../hooks/useAuth';
import { adminKeys, adminService, DashboardAccessRequest, OperationsStore, OperationsUser, TaxonomyKind } from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import type { StaffRole } from '../../types/user';
import { isSuperAdmin } from '../../utils/roles';
import { formatOperationsDate, OperationsScaffold, operationsColors, StatusPill } from './OperationsScaffold';

type Section = 'requests' | 'accounts' | 'stores' | 'taxonomy' | 'audit';
type PendingAction =
  | { kind: 'request'; record: DashboardAccessRequest; decision: 'approved' | 'rejected' }
  | { kind: 'role'; user: OperationsUser; role: StaffRole; action: 'grant' | 'revoke' }
  | { kind: 'account'; user: OperationsUser; action: 'suspend' | 'restore' }
  | { kind: 'store'; store: OperationsStore; action: 'suspend' | 'restore' };

export const SuperAdminDashboard = () => {
  const auth = useAuth();
  const client = useQueryClient();
  const allowed = isSuperAdmin(auth.user);
  const [section, setSection] = useState<Section>('requests');
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
  const requests = useQuery({ queryKey: adminKeys.accessRequests('pending'), queryFn: () => adminService.listAccessRequests({ status: 'pending', limit: 100 }), enabled: allowed });
  const users = useQuery({ queryKey: adminKeys.users(search), queryFn: () => adminService.listUsers({ search: search.trim(), limit: 100 }), enabled: allowed && section === 'accounts' });
  const stores = useQuery({ queryKey: adminKeys.stores(search), queryFn: () => adminService.listStores({ search: search.trim(), limit: 100 }), enabled: allowed && section === 'stores' });
  const audit = useQuery({ queryKey: adminKeys.audit, queryFn: () => adminService.listAuditLogs({ limit: 100 }), enabled: allowed && section === 'audit' });
  const taxonomy = useQuery({ queryKey: adminKeys.taxonomy(taxonomyKind), queryFn: () => adminService.listTaxonomy(taxonomyKind), enabled: allowed && section === 'taxonomy' });
  const selectedUser = useMemo(() => users.data?.results.find(item => item.id === selectedUserId) ?? users.data?.results[0], [users.data, selectedUserId]);
  const selectedStore = useMemo(() => stores.data?.results.find(item => item.id === selectedStoreId) ?? stores.data?.results[0], [stores.data, selectedStoreId]);

  if (!allowed) return <ErrorState message="Super administrator access is required for this dashboard." />;

  const submitAction = async () => {
    if (!pending || busy) return;
    if (!reason.trim()) { setError('A reason is required for this action.'); return; }
    setBusy(true); setError(undefined);
    try {
      if (pending.kind === 'request') await adminService.reviewAccessRequest(pending.record.id, pending.decision, reason);
      if (pending.kind === 'role') await adminService.changeStaffRole(pending.user.id, pending.role, pending.action, reason);
      if (pending.kind === 'account') await adminService.changeAccountStatus(pending.user.id, pending.action, reason);
      if (pending.kind === 'store') await adminService.changeStoreStatus(pending.store.id, pending.action, reason);
      await client.invalidateQueries({ queryKey: ['operations'] });
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

  return <OperationsScaffold title="Administration" subtitle="Super-admin controls for access approval, accounts, stores, catalog structure, and the immutable operations audit trail.">
    <View style={styles.tabs}>{(['requests', 'accounts', 'stores', 'taxonomy', 'audit'] as const).map(value => <Pressable key={value} onPress={() => { setSection(value); setSearch(''); }} style={[styles.tab, section === value && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: section === value }}><Text style={[styles.tabText, section === value && styles.tabTextActive]}>{value === 'requests' ? `Access requests (${requests.data?.count ?? 0})` : value}</Text></Pressable>)}</View>
    {section === 'requests' ? <View style={styles.panel}><Text style={styles.panelTitle}>Pending dashboard access</Text>{requests.isError ? <ErrorState message="Unable to load dashboard access requests." onRetry={() => void requests.refetch()} /> : requests.isLoading ? <Text style={styles.empty}>Loading requests...</Text> : requests.data?.results.length ? requests.data.results.map(item => <View key={item.id} style={styles.requestRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.requesterName || item.requesterEmail}</Text><Text style={styles.meta}>{item.requesterEmail} - {item.requestedRole.replaceAll('_', ' ')}</Text><Text style={styles.reasonText}>{item.requestReason}</Text><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View><View style={styles.rowActions}><Button size="sm" variant="outline" onPress={() => setPending({ kind: 'request', record: item, decision: 'rejected' })}>Reject</Button><Button size="sm" onPress={() => setPending({ kind: 'request', record: item, decision: 'approved' })}>Approve</Button></View></View>) : <Text style={styles.empty}>No dashboard access requests are waiting for review.</Text>}</View> : null}
    {section === 'accounts' ? <><SearchField value={search} onChangeText={setSearch} placeholder="Search name, email, phone or store" accessibilityLabel="Search accounts" containerStyle={styles.search} /><View style={styles.split}><View style={styles.list}>{users.isLoading ? <Text style={styles.empty}>Loading accounts...</Text> : users.data?.results.map(user => <Pressable key={user.id} onPress={() => setSelectedUserId(user.id)} style={[styles.listRow, selectedUser?.id === user.id && styles.selected]}><View style={styles.main}><Text style={styles.rowTitle}>{user.fullName}</Text><Text style={styles.meta}>{user.email} - {user.role.replaceAll('_', ' ')}</Text></View><StatusPill value={user.active ? 'active' : 'suspended'} /></Pressable>)}</View><View style={styles.detail}>{selectedUser ? <><Text style={styles.detailTitle}>{selectedUser.fullName}</Text><Text style={styles.meta}>{selectedUser.email}</Text><Text style={styles.meta}>Phone: {selectedUser.phoneNumber || 'Not recorded'}</Text><Text style={styles.meta}>Joined: {formatOperationsDate(selectedUser.dateJoined)}</Text><Text style={styles.label}>Dashboard roles</Text><View style={styles.roles}>{(['sales_reviewer', 'finance'] as StaffRole[]).map(role => { const assigned = selectedUser.staffRoles.includes(role); return <Button key={role} size="sm" variant={assigned ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'role', user: selectedUser, role, action: assigned ? 'revoke' : 'grant' })}>{assigned ? `Revoke ${role.replaceAll('_', ' ')}` : `Grant ${role.replaceAll('_', ' ')}`}</Button>; })}</View><Text style={styles.label}>Account status</Text><Button variant={selectedUser.active ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'account', user: selectedUser, action: selectedUser.active ? 'suspend' : 'restore' })}>{selectedUser.active ? 'Suspend account' : 'Restore account'}</Button></> : <Text style={styles.empty}>Select an account.</Text>}</View></View></> : null}
    {section === 'stores' ? <><SearchField value={search} onChangeText={setSearch} placeholder="Search store, slug or owner" accessibilityLabel="Search stores" containerStyle={styles.search} /><View style={styles.split}><View style={styles.list}>{stores.data?.results.map(store => <Pressable key={store.id} onPress={() => setSelectedStoreId(store.id)} style={[styles.listRow, selectedStore?.id === store.id && styles.selected]}><View style={styles.main}><Text style={styles.rowTitle}>{store.name}</Text><Text style={styles.meta}>{store.ownerEmail}</Text></View><StatusPill value={store.status} /></Pressable>)}</View><View style={styles.detail}>{selectedStore ? <><Text style={styles.detailTitle}>{selectedStore.name}</Text><Text style={styles.meta}>{selectedStore.ownerEmail}</Text><Text style={styles.label}>Persisted activity</Text><View style={styles.activity}><Stat label="Products" value={selectedStore.activity.products} /><Stat label="Services" value={selectedStore.activity.services} /><Stat label="Orders" value={selectedStore.activity.orders} /><Stat label="Reviews" value={selectedStore.activity.reviews} /></View><Text style={styles.meta}>Last recorded activity: {formatOperationsDate(selectedStore.activity.lastActivityAt)}</Text><Button variant={selectedStore.status === 'active' ? 'outline' : 'primary'} onPress={() => setPending({ kind: 'store', store: selectedStore, action: selectedStore.status === 'active' ? 'suspend' : 'restore' })}>{selectedStore.status === 'active' ? 'Suspend store' : 'Restore store'}</Button></> : <Text style={styles.empty}>Select a store.</Text>}</View></View></> : null}
    {section === 'taxonomy' ? <View style={styles.panel}><Text style={styles.panelTitle}>Catalog structure</Text><View style={styles.tabs}>{(['product-categories', 'product-tags', 'service-categories'] as TaxonomyKind[]).map(kind => <Pressable key={kind} onPress={() => setTaxonomyKind(kind)} style={[styles.tab, taxonomyKind === kind && styles.tabActive]}><Text style={[styles.tabText, taxonomyKind === kind && styles.tabTextActive]}>{kind.replaceAll('-', ' ')}</Text></Pressable>)}</View><View style={styles.taxonomyEditor}><TextInput value={taxonomyName} onChangeText={value => { setTaxonomyName(value); setTaxonomySlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="Name" style={styles.input} /><TextInput value={taxonomySlug} onChangeText={setTaxonomySlug} placeholder="slug" autoCapitalize="none" style={styles.input} /><Button loading={busy} onPress={() => void createTaxonomy()}>Add</Button></View>{error ? <Text style={styles.error}>{error}</Text> : null}{taxonomy.data?.map(record => <View key={record.id} style={styles.listRow}><View style={styles.main}><Text style={styles.rowTitle}>{record.name}</Text><Text style={styles.meta}>{record.slug}</Text></View></View>)}</View> : null}
    {section === 'audit' ? <View style={styles.panel}><Text style={styles.panelTitle}>Administrative audit log</Text>{audit.data?.results.length ? audit.data.results.map(item => <View key={item.id} style={styles.auditRow}><View style={styles.main}><Text style={styles.rowTitle}>{item.action.replaceAll('_', ' ')}</Text><Text style={styles.meta}>{item.actorEmail || 'System'} - {item.targetType}:{item.targetId}</Text><Text style={styles.reasonText}>{item.reason || 'No reason recorded'}</Text></View><Text style={styles.meta}>{formatOperationsDate(item.createdAt)}</Text></View>) : <Text style={styles.empty}>No audit events are available.</Text>}</View> : null}
    <Modal visible={Boolean(pending)} transparent animationType="fade" onRequestClose={() => setPending(undefined)}><View style={styles.backdrop}><View style={styles.modal} accessibilityViewIsModal><View style={styles.modalHeading}><Text style={styles.detailTitle}>Confirm administrative action</Text><Button variant="icon" size="sm" accessibilityLabel="Close" onPress={() => setPending(undefined)} icon={<X size={18} color={operationsColors.ink} />} /></View><Text style={styles.meta}>This action is reversible where applicable and will be written to the audit log.</Text><TextInput value={reason} onChangeText={setReason} multiline placeholder="Required reason" accessibilityLabel="Administrative action reason" style={styles.reasonInput} />{error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}<View style={styles.rowActions}><Button variant="outline" disabled={busy} onPress={() => setPending(undefined)}>Cancel</Button><Button loading={busy} onPress={() => void submitAction()}>Confirm</Button></View></View></View></Modal>
  </OperationsScaffold>;
};

const Stat = ({ label, value }: { label: string; value: number }) => <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.meta}>{label}</Text></View>;

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }, tab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, backgroundColor: operationsColors.panel }, tabActive: { borderColor: operationsColors.green, backgroundColor: operationsColors.greenSoft }, tabText: { color: operationsColors.muted, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }, tabTextActive: { color: operationsColors.green },
  panel: { borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, panelTitle: { color: operationsColors.ink, fontSize: 16, fontWeight: '800', padding: 15, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, requestRow: { minHeight: 92, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, main: { flex: 1, minWidth: 180 }, rowTitle: { color: operationsColors.ink, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' }, meta: { color: operationsColors.muted, fontSize: 11, marginTop: 4 }, reasonText: { color: operationsColors.ink, fontSize: 12, lineHeight: 18, marginTop: 7 }, rowActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 10 }, empty: { color: operationsColors.muted, padding: 18 },
  search: { width: '100%', maxWidth: 560, marginBottom: 12 }, split: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' }, list: { flex: 1.15, minWidth: 300, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel, overflow: 'hidden' }, detail: { flex: 0.85, minWidth: 290, gap: 9, padding: 16, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 6, backgroundColor: operationsColors.panel }, listRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, selected: { backgroundColor: operationsColors.greenSoft }, detailTitle: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' }, label: { color: operationsColors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 11 }, roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, activity: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { minWidth: 92, padding: 11, borderWidth: 1, borderColor: operationsColors.border }, statValue: { color: operationsColors.ink, fontSize: 19, fontWeight: '800' },
  taxonomyEditor: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 13 }, input: { minHeight: 44, flexGrow: 1, minWidth: 180, paddingHorizontal: 11, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5 }, auditRow: { minHeight: 78, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: operationsColors.border }, error: { color: operationsColors.red, backgroundColor: operationsColors.redSoft, padding: 10 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16,28,22,0.62)' }, modal: { width: '100%', maxWidth: 520, padding: 18, borderRadius: 6, backgroundColor: operationsColors.panel }, modalHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, reasonInput: { minHeight: 110, marginTop: 14, padding: 12, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 5, textAlignVertical: 'top' },
});
