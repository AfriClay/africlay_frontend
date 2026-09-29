import React, { useMemo, useState } from 'react';
import {
  Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness, CheckCircle2, ChevronRight, ExternalLink, LayoutDashboard,
  LogOut, Package, RefreshCw, Search, ShieldCheck, Store, Tags, X, XCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import {
  adminKeys, adminService, AdminKyc, TaxonomyDraft, TaxonomyKind, TaxonomyRecord,
} from '../../services/adminService';
import { getApiErrorMessage } from '../../services/api';
import { confirmLogout } from '../../utils/confirmLogout';

type Section = 'overview' | 'kyc' | 'taxonomy' | 'stores';
type KycFilter = 'all' | AdminKyc['status'];
type Editor = 'new' | TaxonomyRecord | undefined;

const colors = {
  shell: '#101C16', shellMuted: '#A9B8AF', canvas: '#F4F6F5', panel: '#FFFFFF',
  ink: '#18211C', muted: '#66726B', border: '#DDE3DF', green: '#207F20',
  greenSoft: '#E8F2EC', amber: '#9A5A16', amberSoft: '#FFF3E2', red: '#B42318', redSoft: '#FDECEA',
};
const navItems: ReadonlyArray<{ key: Section; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'kyc', label: 'KYC review', icon: ShieldCheck },
  { key: 'taxonomy', label: 'Taxonomy', icon: Tags },
  { key: 'stores', label: 'Stores', icon: Store },
];
const taxonomyLabels: Record<TaxonomyKind, string> = {
  'product-categories': 'Product categories', 'product-tags': 'Product tags', 'service-categories': 'Service categories',
};
const blankDraft = (): TaxonomyDraft => ({ name: '', slug: '', description: '', displayOrder: 0 });
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const formatDate = (value?: string | null) => value
  ? new Date(value).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
  : 'Not recorded';

const StatusBadge = ({ status }: { status: string }) => {
  const tone = status === 'approved' || status === 'active' ? styles.statusApproved
    : status === 'rejected' || status === 'suspended' ? styles.statusRejected : styles.statusPending;
  return <View style={[styles.status, tone]}><Text style={[styles.statusText, tone]}>{status.replace('_', ' ')}</Text></View>;
};

const Metric = ({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) => (
  <View style={styles.metric}>
    <View style={styles.metricIcon}><Icon size={19} color={colors.green} /></View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

export const AdminPortal: React.FC = () => {
  const auth = useAuth();
  const { isExpanded } = useResponsiveLayout();
  const client = useQueryClient();
  const [section, setSection] = useState<Section>('overview');
  const [selectedKycId, setSelectedKycId] = useState<number>();
  const [kycFilter, setKycFilter] = useState<KycFilter>('pending');
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>();
  const [reviewReason, setReviewReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string>();
  const [taxonomyKind, setTaxonomyKind] = useState<TaxonomyKind>('product-categories');
  const [editor, setEditor] = useState<Editor>();
  const [draft, setDraft] = useState<TaxonomyDraft>(blankDraft());
  const [taxonomyBusy, setTaxonomyBusy] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string>();
  const [storeSearch, setStoreSearch] = useState('');

  const isAdmin = auth.user?.role === 'admin' || auth.user?.role === 'super_admin';
  const storesQuery = useQuery({ queryKey: adminKeys.stores, queryFn: adminService.listStores, enabled: isAdmin });
  const kycQuery = useQuery({ queryKey: adminKeys.kyc, queryFn: adminService.listKyc, enabled: isAdmin });
  const catalogueQuery = useQuery({ queryKey: adminKeys.catalogue, queryFn: adminService.catalogueCounts, enabled: isAdmin });
  const taxonomyQuery = useQuery({ queryKey: adminKeys.taxonomy(taxonomyKind), queryFn: () => adminService.listTaxonomy(taxonomyKind), enabled: isAdmin });
  const productCategoriesQuery = useQuery({ queryKey: adminKeys.taxonomy('product-categories'), queryFn: () => adminService.listTaxonomy('product-categories'), enabled: isAdmin });
  const tagsQuery = useQuery({ queryKey: adminKeys.taxonomy('product-tags'), queryFn: () => adminService.listTaxonomy('product-tags'), enabled: isAdmin });
  const serviceCategoriesQuery = useQuery({ queryKey: adminKeys.taxonomy('service-categories'), queryFn: () => adminService.listTaxonomy('service-categories'), enabled: isAdmin });

  const records = kycQuery.data ?? [];
  const pending = records.filter(item => item.status === 'pending');
  const filteredKyc = kycFilter === 'all' ? records : records.filter(item => item.status === kycFilter);
  const selectedKyc = records.find(item => item.id === selectedKycId) ?? filteredKyc[0];
  const filteredStores = useMemo(() => {
    const query = storeSearch.trim().toLowerCase();
    return (storesQuery.data ?? []).filter(store => !query || `${store.name} ${store.slug} ${store.location}`.toLowerCase().includes(query));
  }, [storeSearch, storesQuery.data]);
  const kycByStore = useMemo(() => new Map(records.map(item => [item.store, item])), [records]);

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['admin'] }),
      storesQuery.refetch(), kycQuery.refetch(), catalogueQuery.refetch(), taxonomyQuery.refetch(),
    ]);
  };
  const openKyc = (id: number) => { setSelectedKycId(id); setSection('kyc'); };
  const openEditor = (value: 'new' | TaxonomyRecord) => {
    setEditor(value);
    setTaxonomyError(undefined);
    setDraft(value === 'new' ? blankDraft() : {
      name: value.name, slug: value.slug, description: value.description,
      parent: value.parent, displayOrder: value.displayOrder,
    });
  };
  const saveTaxonomy = async () => {
    if (taxonomyBusy) return;
    if (!draft.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
      setTaxonomyError('Enter a name and a lowercase hyphenated slug.');
      return;
    }
    setTaxonomyBusy(true);
    setTaxonomyError(undefined);
    try {
      if (editor === 'new') await adminService.createTaxonomy(taxonomyKind, draft);
      else if (editor) await adminService.updateTaxonomy(taxonomyKind, editor.id, draft);
      await client.invalidateQueries({ queryKey: adminKeys.taxonomy(taxonomyKind) });
      setEditor(undefined);
    } catch (error) {
      setTaxonomyError(getApiErrorMessage(error, 'Unable to save this taxonomy record.'));
    } finally { setTaxonomyBusy(false); }
  };
  const submitReview = async () => {
    if (!selectedKyc || !reviewDecision || reviewing) return;
    if (reviewDecision === 'rejected' && !reviewReason.trim()) {
      setReviewError('A rejection reason is required.');
      return;
    }
    setReviewing(true);
    setReviewError(undefined);
    try {
      const updated = await adminService.reviewKyc(selectedKyc.storeSlug, reviewDecision, reviewReason);
      client.setQueryData<AdminKyc[]>(adminKeys.kyc, current => (current ?? []).map(item => item.id === updated.id ? updated : item));
      await client.invalidateQueries({ queryKey: adminKeys.kyc });
      setReviewDecision(undefined);
      setReviewReason('');
    } catch (error) {
      setReviewError(getApiErrorMessage(error, 'Unable to submit this review.'));
    } finally { setReviewing(false); }
  };

  if (!isAdmin) return <ErrorState message="This account does not have administrator access." />;
  const loadError = storesQuery.isError || kycQuery.isError || catalogueQuery.isError;

  const Overview = () => <View style={styles.page}>
    <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>OPERATIONS</Text><Text style={styles.pageTitle}>Dashboard overview</Text></View></View>
    {loadError && <View style={styles.errorBand}><Text style={styles.errorText}>Some dashboard data could not be loaded.</Text><Pressable onPress={() => void refresh()} accessibilityRole="button"><Text style={styles.retryText}>Retry</Text></Pressable></View>}
    <View style={styles.metrics}>
      <Metric label="Pending KYC" value={kycQuery.isLoading ? '...' : pending.length} icon={ShieldCheck} />
      <Metric label="Active stores" value={storesQuery.isLoading ? '...' : storesQuery.data?.length ?? 0} icon={Store} />
      <Metric label="Published products" value={catalogueQuery.isLoading ? '...' : catalogueQuery.data?.products ?? 0} icon={Package} />
      <Metric label="Published services" value={catalogueQuery.isLoading ? '...' : catalogueQuery.data?.services ?? 0} icon={BriefcaseBusiness} />
    </View>
    <View style={[styles.overviewColumns, !isExpanded && styles.stack]}>
      <View style={styles.sectionPanel}>
        <View style={styles.panelHeading}><Text style={styles.panelTitle}>Pending KYC</Text><Pressable onPress={() => setSection('kyc')} accessibilityRole="button"><Text style={styles.textAction}>View queue</Text></Pressable></View>
        {kycQuery.isLoading ? <Text style={styles.emptyText}>Loading review queue...</Text> : pending.length === 0 ? <Text style={styles.emptyText}>No pending submissions.</Text> : pending.slice(0, 5).map(item => (
          <Pressable key={item.id} style={styles.listRow} onPress={() => openKyc(item.id)} accessibilityRole="button" accessibilityLabel={`Review ${item.storeName}`}>
            <View style={styles.rowMain}><Text style={styles.rowTitle}>{item.storeName}</Text><Text style={styles.rowMeta}>{item.document_type.replace('_', ' ')} - {formatDate(item.submitted_at)}</Text></View>
            <ChevronRight size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <View style={styles.sectionPanel}>
        <View style={styles.panelHeading}><Text style={styles.panelTitle}>Catalog structure</Text><Pressable onPress={() => setSection('taxonomy')} accessibilityRole="button"><Text style={styles.textAction}>Manage</Text></Pressable></View>
        <View style={styles.countRow}><Text style={styles.countLabel}>Product categories</Text><Text style={styles.countValue}>{productCategoriesQuery.data?.length ?? 0}</Text></View>
        <View style={styles.countRow}><Text style={styles.countLabel}>Product tags</Text><Text style={styles.countValue}>{tagsQuery.data?.length ?? 0}</Text></View>
        <View style={styles.countRow}><Text style={styles.countLabel}>Service categories</Text><Text style={styles.countValue}>{serviceCategoriesQuery.data?.length ?? 0}</Text></View>
      </View>
    </View>
  </View>;

  const KycReview = () => <View style={styles.page}>
    <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>SELLER COMPLIANCE</Text><Text style={styles.pageTitle}>KYC review</Text></View></View>
    <View style={styles.segmented}>{(['pending', 'all', 'approved', 'rejected'] as const).map(filter => <Pressable key={filter} onPress={() => setKycFilter(filter)} accessibilityRole="tab" accessibilityState={{ selected: kycFilter === filter }} style={[styles.segment, kycFilter === filter && styles.segmentActive]}><Text style={[styles.segmentText, kycFilter === filter && styles.segmentTextActive]}>{filter}</Text></Pressable>)}</View>
    {kycQuery.isError ? <ErrorState message="Unable to load KYC submissions." onRetry={() => void kycQuery.refetch()} /> :
      <View style={[styles.reviewLayout, !isExpanded && styles.stack]}>
        <View style={styles.queuePane}>{kycQuery.isLoading ? <Text style={styles.emptyText}>Loading submissions...</Text> : filteredKyc.length === 0 ? <Text style={styles.emptyText}>No submissions in this view.</Text> : filteredKyc.map(item => (
          <Pressable key={item.id} style={[styles.queueRow, selectedKyc?.id === item.id && styles.queueRowActive]} onPress={() => setSelectedKycId(item.id)} accessibilityRole="button" accessibilityState={{ selected: selectedKyc?.id === item.id }}>
            <View style={styles.rowMain}><Text style={styles.rowTitle}>{item.storeName}</Text><Text style={styles.rowMeta}>{formatDate(item.submitted_at)}</Text></View><StatusBadge status={item.status} />
          </Pressable>
        ))}</View>
        <View style={styles.detailPane}>{selectedKyc ? <>
          <View style={styles.detailHeading}><View><Text style={styles.eyebrow}>SUBMISSION</Text><Text style={styles.detailTitle}>{selectedKyc.storeName}</Text></View><StatusBadge status={selectedKyc.status} /></View>
          <View style={styles.detailGrid}>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Business name</Text><Text style={styles.fieldValue}>{selectedKyc.business_name}</Text></View>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Document type</Text><Text style={styles.fieldValue}>{selectedKyc.document_type.replace('_', ' ')}</Text></View>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Registration number</Text><Text style={styles.fieldValue}>{selectedKyc.business_registration_number || 'Not provided'}</Text></View>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Tax number</Text><Text style={styles.fieldValue}>{selectedKyc.tax_identification_number || 'Not provided'}</Text></View>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Submitted</Text><Text style={styles.fieldValue}>{formatDate(selectedKyc.submitted_at)}</Text></View>
            <View style={styles.detailField}><Text style={styles.fieldLabel}>Reviewed</Text><Text style={styles.fieldValue}>{formatDate(selectedKyc.reviewed_at)}</Text></View>
          </View>
          {selectedKyc.rejection_reason ? <View style={styles.rejectionBand}><Text style={styles.fieldLabel}>Rejection reason</Text><Text style={styles.fieldValue}>{selectedKyc.rejection_reason}</Text></View> : null}
          <View style={styles.detailActions}>
            <Pressable disabled={!selectedKyc.documentUrl} onPress={() => selectedKyc.documentUrl && void Linking.openURL(selectedKyc.documentUrl)} accessibilityRole="link" accessibilityState={{ disabled: !selectedKyc.documentUrl }} style={[styles.secondaryButton, !selectedKyc.documentUrl && styles.disabled]}><ExternalLink size={17} color={colors.ink} /><Text style={styles.secondaryButtonText}>{selectedKyc.documentUrl ? 'Open document' : 'No document'}</Text></Pressable>
            {selectedKyc.status === 'pending' && <><Pressable onPress={() => { setReviewDecision('rejected'); setReviewError(undefined); }} accessibilityRole="button" style={styles.rejectButton}><XCircle size={17} color={colors.red} /><Text style={styles.rejectText}>Reject</Text></Pressable><Pressable onPress={() => { setReviewDecision('approved'); setReviewError(undefined); }} accessibilityRole="button" style={styles.approveButton}><CheckCircle2 size={17} color="#FFFFFF" /><Text style={styles.approveText}>Approve</Text></Pressable></>}
          </View>
        </> : <Text style={styles.emptyText}>Select a submission to review.</Text>}</View>
      </View>}
  </View>;

  const Taxonomy = () => {
    const isTag = taxonomyKind === 'product-tags';
    const recordsForKind = taxonomyQuery.data ?? [];
    return <View style={styles.page}>
      <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>CATALOG GOVERNANCE</Text><Text style={styles.pageTitle}>Taxonomy</Text></View><Pressable onPress={() => openEditor('new')} accessibilityRole="button" style={styles.primaryCompact}><Text style={styles.approveText}>Add record</Text></Pressable></View>
      <View style={styles.segmented}>{(Object.keys(taxonomyLabels) as TaxonomyKind[]).map(kind => <Pressable key={kind} onPress={() => { setTaxonomyKind(kind); setEditor(undefined); }} accessibilityRole="tab" accessibilityState={{ selected: taxonomyKind === kind }} style={[styles.segment, taxonomyKind === kind && styles.segmentActive]}><Text style={[styles.segmentText, taxonomyKind === kind && styles.segmentTextActive]}>{taxonomyLabels[kind]}</Text></Pressable>)}</View>
      {taxonomyQuery.isError ? <ErrorState message="Unable to load taxonomy records." onRetry={() => void taxonomyQuery.refetch()} /> : <View style={[styles.taxonomyLayout, !isExpanded && styles.stack]}>
        <View style={styles.taxonomyList}>
          <View style={styles.tableHeader}><Text style={[styles.tableHeaderText, styles.tableName]}>Name</Text><Text style={[styles.tableHeaderText, styles.tableSlug]}>Slug</Text><Text style={styles.tableAction}>Action</Text></View>
          {taxonomyQuery.isLoading ? <Text style={styles.emptyText}>Loading records...</Text> : recordsForKind.length === 0 ? <Text style={styles.emptyText}>No records yet.</Text> : recordsForKind.map(item => <View key={item.id} style={styles.tableRow}><View style={styles.tableName}><Text style={styles.rowTitle}>{item.name}</Text>{!isTag && item.parent ? <Text style={styles.rowMeta}>Child category</Text> : null}</View><Text style={[styles.rowMeta, styles.tableSlug]} numberOfLines={1}>{item.slug}</Text><Pressable onPress={() => openEditor(item)} accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} style={styles.tableAction}><Text style={styles.textAction}>Edit</Text></Pressable></View>)}
        </View>
        <View style={styles.editorPane}>{editor ? <>
          <View style={styles.panelHeading}><Text style={styles.panelTitle}>{editor === 'new' ? `New ${isTag ? 'tag' : 'category'}` : 'Edit record'}</Text><Pressable onPress={() => setEditor(undefined)} accessibilityRole="button" accessibilityLabel="Close editor" style={styles.iconButton}><X size={18} color={colors.ink} /></Pressable></View>
          <Input label="Name" accessibilityLabel="Taxonomy name" value={draft.name} onChangeText={name => setDraft(value => ({ ...value, name, ...(editor === 'new' && !value.slug ? { slug: slugify(name) } : {}) }))} />
          <Input label="Slug" accessibilityLabel="Taxonomy slug" value={draft.slug} onChangeText={slug => setDraft(value => ({ ...value, slug }))} autoCapitalize="none" />
          {!isTag && <><Input label="Description" accessibilityLabel="Taxonomy description" value={draft.description ?? ''} onChangeText={description => setDraft(value => ({ ...value, description }))} />
            <Input label="Display order" accessibilityLabel="Display order" value={String(draft.displayOrder ?? 0)} onChangeText={value => setDraft(current => ({ ...current, displayOrder: Number(value) || 0 }))} keyboardType="number-pad" />
            <Text style={styles.fieldLabel}>Parent category</Text><View style={styles.parentOptions}><Pressable onPress={() => setDraft(value => ({ ...value, parent: undefined }))} accessibilityRole="radio" accessibilityState={{ selected: !draft.parent }} style={[styles.parentOption, !draft.parent && styles.parentOptionActive]}><Text style={styles.parentText}>None</Text></Pressable>{recordsForKind.filter(item => item.id !== (editor !== 'new' ? editor?.id : undefined)).map(item => <Pressable key={item.id} onPress={() => setDraft(value => ({ ...value, parent: item.id }))} accessibilityRole="radio" accessibilityState={{ selected: draft.parent === item.id }} style={[styles.parentOption, draft.parent === item.id && styles.parentOptionActive]}><Text style={styles.parentText}>{item.name}</Text></Pressable>)}</View></>}
          {taxonomyError && <Text style={styles.errorText} accessibilityRole="alert">{taxonomyError}</Text>}
          <Button onPress={() => void saveTaxonomy()} loading={taxonomyBusy}>Save record</Button>
        </> : <View style={styles.editorEmpty}><Tags size={28} color={colors.shellMuted} /><Text style={styles.emptyText}>Select a record or add a new one.</Text></View>}</View>
      </View>}
    </View>;
  };

  const Stores = () => <View style={styles.page}>
    <View style={styles.pageHeading}><View><Text style={styles.eyebrow}>MARKETPLACE</Text><Text style={styles.pageTitle}>Active stores</Text></View></View>
    <View style={styles.searchBox}><Search size={18} color={colors.muted} /><TextInput value={storeSearch} onChangeText={setStoreSearch} placeholder="Search store, slug or location" accessibilityLabel="Search stores" style={styles.searchInput} /></View>
    {storesQuery.isError ? <ErrorState message="Unable to load stores." onRetry={() => void storesQuery.refetch()} /> : <View style={styles.storeTable}>
      <View style={styles.storeHeaderRow}><Text style={[styles.tableHeaderText, styles.storeName]}>Store</Text>{isExpanded && <><Text style={[styles.tableHeaderText, styles.storeLocation]}>Location</Text><Text style={[styles.tableHeaderText, styles.storeStat]}>Products</Text><Text style={[styles.tableHeaderText, styles.storeStat]}>Orders</Text></>}<Text style={[styles.tableHeaderText, styles.storeKyc]}>KYC</Text></View>
      {storesQuery.isLoading ? <Text style={styles.emptyText}>Loading stores...</Text> : filteredStores.length === 0 ? <Text style={styles.emptyText}>No stores match this search.</Text> : filteredStores.map(store => {
        const kyc = kycByStore.get(store.id);
        return <View key={store.id} style={styles.storeRow}><View style={styles.storeName}><Text style={styles.rowTitle}>{store.name}</Text><Text style={styles.rowMeta}>{store.slug}</Text></View>{isExpanded && <><Text style={[styles.rowMeta, styles.storeLocation]}>{store.location}</Text><Text style={[styles.rowTitle, styles.storeStat]}>{store.products}</Text><Text style={[styles.rowTitle, styles.storeStat]}>{store.orders}</Text></>}<View style={styles.storeKyc}>{kyc ? <Pressable onPress={() => openKyc(kyc.id)} accessibilityRole="button" accessibilityLabel={`Open ${store.name} KYC`}><StatusBadge status={kyc.status} /></Pressable> : <Text style={styles.rowMeta}>Not submitted</Text>}</View></View>;
      })}
    </View>}
  </View>;

  const title = navItems.find(item => item.key === section)?.label ?? 'Admin';
  return <SafeAreaView style={styles.root}>
    <View style={styles.adminShell}>
      {isExpanded && <View style={styles.sidebar}>
        <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandLetter}>A</Text></View><View><Text style={styles.brandName}>AfriClay</Text><Text style={styles.brandSub}>Admin console</Text></View></View>
        <View style={styles.nav}>{navItems.map(item => { const Icon = item.icon; return <Pressable key={item.key} onPress={() => setSection(item.key)} accessibilityRole="tab" accessibilityState={{ selected: section === item.key }} style={[styles.navItem, section === item.key && styles.navItemActive]}><Icon size={19} color={section === item.key ? '#FFFFFF' : colors.shellMuted} /><Text style={[styles.navText, section === item.key && styles.navTextActive]}>{item.label}</Text></Pressable>; })}</View>
        <View style={styles.account}><Text style={styles.accountLabel}>SIGNED IN AS</Text><Text style={styles.accountName} numberOfLines={1}>{auth.user?.email}</Text><Text style={styles.accountRole}>{auth.user?.role.replace('_', ' ')}</Text><Pressable onPress={() => confirmLogout(() => void auth.logout())} accessibilityRole="button" style={styles.logout}><LogOut size={18} color={colors.shellMuted} /><Text style={styles.logoutText}>Log out</Text></Pressable></View>
      </View>}
      <View style={styles.workspace}>
        <View style={styles.topbar}><View><Text style={styles.mobileTitle}>{isExpanded ? title : 'AfriClay Admin'}</Text>{!isExpanded && <Text style={styles.mobileSection}>{title}</Text>}</View><Pressable onPress={() => void refresh()} accessibilityRole="button" accessibilityLabel="Refresh admin data" style={styles.iconButton}><RefreshCw size={19} color={colors.ink} /></Pressable>{!isExpanded && <Pressable onPress={() => confirmLogout(() => void auth.logout())} accessibilityRole="button" accessibilityLabel="Log out" style={styles.iconButton}><LogOut size={19} color={colors.red} /></Pressable>}</View>
        {!isExpanded && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileNav} contentContainerStyle={styles.mobileNavContent}>{navItems.map(item => { const Icon = item.icon; return <Pressable key={item.key} onPress={() => setSection(item.key)} accessibilityRole="tab" accessibilityState={{ selected: section === item.key }} style={[styles.mobileNavItem, section === item.key && styles.mobileNavActive]}><Icon size={17} color={section === item.key ? colors.green : colors.muted} /><Text style={[styles.mobileNavText, section === item.key && styles.mobileNavTextActive]}>{item.label}</Text></Pressable>; })}</ScrollView>}
        <ScrollView style={styles.scroller} contentContainerStyle={styles.scrollerContent}>{section === 'overview' ? <Overview /> : section === 'kyc' ? <KycReview /> : section === 'taxonomy' ? <Taxonomy /> : <Stores />}</ScrollView>
      </View>
    </View>
    {reviewDecision && <Modal visible transparent animationType="fade" onRequestClose={() => setReviewDecision(undefined)}>
      <View style={styles.modalBackdrop}><View style={styles.modal} accessibilityViewIsModal>
        <View style={styles.panelHeading}><Text style={styles.modalTitle}>{reviewDecision === 'approved' ? 'Approve KYC submission' : 'Reject KYC submission'}</Text><Pressable onPress={() => setReviewDecision(undefined)} accessibilityRole="button" accessibilityLabel="Close review dialog" style={styles.iconButton}><X size={18} color={colors.ink} /></Pressable></View>
        <Text style={styles.modalCopy}>{selectedKyc?.storeName}</Text>
        {reviewDecision === 'rejected' && <><Text style={styles.fieldLabel}>Rejection reason</Text><TextInput multiline value={reviewReason} onChangeText={setReviewReason} accessibilityLabel="Rejection reason" placeholder="State what the seller must correct" style={styles.reasonInput} /></>}
        {reviewError && <Text style={styles.errorText} accessibilityRole="alert">{reviewError}</Text>}
        <View style={styles.modalActions}><Button variant="outline" onPress={() => setReviewDecision(undefined)} disabled={reviewing}>Cancel</Button><Button onPress={() => void submitReview()} loading={reviewing}>{reviewDecision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}</Button></View>
      </View></View>
    </Modal>}
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  adminShell: { flex: 1, flexDirection: 'row', minWidth: 0 },
  sidebar: { width: 248, flexShrink: 0, backgroundColor: colors.shell, padding: 18 },
  brand: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#2A3931', paddingBottom: 16 },
  brandMark: { width: 38, height: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  brandLetter: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  brandName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' }, brandSub: { color: colors.shellMuted, fontSize: 12 },
  nav: { marginTop: 22, gap: 4 },
  navItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 5, paddingHorizontal: 12 },
  navItemActive: { backgroundColor: colors.green }, navText: { color: colors.shellMuted, fontSize: 14, fontWeight: '600' }, navTextActive: { color: '#FFFFFF' },
  account: { marginTop: 'auto', borderTopWidth: 1, borderTopColor: '#2A3931', paddingTop: 16 }, accountLabel: { color: colors.shellMuted, fontSize: 10, fontWeight: '700' },
  accountName: { color: '#FFFFFF', fontSize: 13, marginTop: 5 }, accountRole: { color: colors.shellMuted, fontSize: 12, marginTop: 3, textTransform: 'capitalize' },
  logout: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 13 }, logoutText: { color: colors.shellMuted, fontWeight: '600' },
  workspace: { flex: 1, minWidth: 0, backgroundColor: colors.canvas },
  topbar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.panel },
  mobileTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' }, mobileSection: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconButton: { width: 40, height: 40, marginLeft: 'auto', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.panel },
  mobileNav: { flexGrow: 0, backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.border }, mobileNavContent: { paddingHorizontal: 12, gap: 4 },
  mobileNavItem: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  mobileNavActive: { borderBottomColor: colors.green }, mobileNavText: { color: colors.muted, fontSize: 12, fontWeight: '600' }, mobileNavTextActive: { color: colors.green },
  scroller: { flex: 1 }, scrollerContent: { flexGrow: 1 }, page: { width: '100%', maxWidth: 1320, alignSelf: 'center', padding: 24 },
  pageHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }, pageTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 3 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 }, metric: { flexGrow: 1, flexBasis: 190, minHeight: 124, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 16 },
  metricIcon: { width: 34, height: 34, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSoft }, metricValue: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 12 }, metricLabel: { color: colors.muted, fontSize: 12, marginTop: 3 },
  overviewColumns: { flexDirection: 'row', gap: 14 }, stack: { flexDirection: 'column' }, sectionPanel: { flex: 1, minWidth: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  panelHeading: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, panelTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  listRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, rowMain: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' }, rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  textAction: { color: colors.green, fontSize: 13, fontWeight: '700' }, emptyText: { color: colors.muted, padding: 18, lineHeight: 20 },
  countRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: colors.border }, countLabel: { color: colors.muted, fontSize: 13 }, countValue: { color: colors.ink, fontWeight: '800' },
  errorBand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#F5C5C1', paddingHorizontal: 14, marginBottom: 14 }, errorText: { color: colors.red, fontSize: 13 }, retryText: { color: colors.red, fontWeight: '800' },
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 16 }, segment: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 5, backgroundColor: colors.panel }, segmentActive: { borderColor: colors.green, backgroundColor: colors.greenSoft }, segmentText: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }, segmentTextActive: { color: colors.green },
  reviewLayout: { flexDirection: 'row', minHeight: 540, gap: 14 }, queuePane: { flex: 0.8, minWidth: 260, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  queueRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border }, queueRowActive: { backgroundColor: colors.greenSoft, borderLeftWidth: 3, borderLeftColor: colors.green },
  detailPane: { flex: 1.4, minWidth: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 18 }, detailHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }, detailTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 3 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }, detailField: { width: '50%', minWidth: 190, paddingVertical: 12, paddingRight: 14 }, fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 }, fieldValue: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }, secondaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 5 }, secondaryButtonText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  rejectButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: '#E8AAA5', borderRadius: 5, backgroundColor: colors.redSoft }, rejectText: { color: colors.red, fontWeight: '700' }, approveButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, borderRadius: 5, backgroundColor: colors.green }, approveText: { color: '#FFFFFF', fontWeight: '700' }, disabled: { opacity: 0.45 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.amberSoft, color: colors.amber }, statusApproved: { backgroundColor: colors.greenSoft, color: colors.green }, statusRejected: { backgroundColor: colors.redSoft, color: colors.red }, statusPending: { backgroundColor: colors.amberSoft, color: colors.amber }, statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, rejectionBand: { backgroundColor: colors.redSoft, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.red, marginTop: 10 },
  taxonomyLayout: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' }, taxonomyList: { flex: 1.3, minWidth: 0, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' }, editorPane: { flex: 0.8, minWidth: 280, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 15 }, editorEmpty: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  tableHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: '#F8FAF9', borderBottomWidth: 1, borderBottomColor: colors.border }, tableHeaderText: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, tableRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, tableName: { flex: 1.2, minWidth: 100 }, tableSlug: { flex: 1, minWidth: 90 }, tableAction: { width: 52, alignItems: 'flex-end' },
  primaryCompact: { minHeight: 38, justifyContent: 'center', borderRadius: 5, backgroundColor: colors.green, paddingHorizontal: 14 }, parentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }, parentOption: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 4 }, parentOptionActive: { borderColor: colors.green, backgroundColor: colors.greenSoft }, parentText: { color: colors.ink, fontSize: 12 },
  searchBox: { width: '100%', maxWidth: 520, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 5, marginBottom: 14 }, searchInput: { flex: 1, minWidth: 0, color: colors.ink, paddingVertical: 9 }, storeTable: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden' }, storeHeaderRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, backgroundColor: '#F8FAF9', borderBottomWidth: 1, borderBottomColor: colors.border }, storeRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border }, storeName: { flex: 1.3, minWidth: 120 }, storeLocation: { flex: 1, minWidth: 100 }, storeStat: { width: 82, textAlign: 'center' }, storeKyc: { width: 110, alignItems: 'flex-start' },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(16,28,22,0.62)' }, modal: { width: '100%', maxWidth: 520, backgroundColor: colors.panel, borderRadius: 6, padding: 18 }, modalTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, modalCopy: { color: colors.muted, marginVertical: 16 }, reasonInput: { minHeight: 110, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: 5, padding: 12, color: colors.ink, marginBottom: 12 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
});
