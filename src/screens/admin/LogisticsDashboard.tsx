import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { logisticsService, LogisticsShipment, LogisticsStage } from '../../services/logisticsService';
import { homeDeliveryService, HomeDeliveryJob, HomeDeliveryRiderStage } from '../../services/homeDeliveryService';
import { riderService } from '../../services/riderService';
import { notificationService } from '../../services/notificationService';
import { hasStaffRole, isApprovedRider, isSuperAdmin } from '../../utils/roles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { DataFreshness, formatOperationsDate, OperationsScaffold, operationsColors } from './OperationsScaffold';

const nextStage = (shipment: LogisticsShipment): { value: LogisticsStage; label: string } | undefined => {
  if (shipment.status !== 'shipped') return undefined;
  const stages = new Set(shipment.events.map(event => event.stage));
  if (!stages.has('awaiting_collection')) return undefined;
  if (!stages.has('collected_from_seller')) return { value: 'collected_from_seller', label: 'Confirm collected from seller' };
  if (!stages.has('in_transit')) return { value: 'in_transit', label: 'Confirm in transit' };
  if (!stages.has('arrived_at_pickup')) return { value: 'arrived_at_pickup', label: 'Confirm arrived at pickup point' };
  return undefined;
};

const nextHomeStage = (job: HomeDeliveryJob): { value: HomeDeliveryRiderStage; label: string } | undefined => {
  if (job.status === 'rider_assigned') return { value: 'rider_accepted', label: 'Accept home delivery' };
  if (job.status === 'rider_accepted') return { value: 'collected_from_pickup', label: 'Confirm parcel collected' };
  if (job.status === 'collected_from_pickup') return { value: 'rider_delivered', label: 'Report delivered to buyer' };
  return undefined;
};

export const LogisticsDashboard = () => {
  const auth = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const client = useQueryClient();
  const approvedRider = isApprovedRider(auth.user);
  const allowed = hasStaffRole(auth.user, 'logistics') && !approvedRider;
  const administrator = isSuperAdmin(auth.user);
  useEffect(() => {
    if (approvedRider) navigation.replace('RiderDashboard');
  }, [approvedRider, navigation]);
  const [offset, setOffset] = useState(0);
  const [homeOffset, setHomeOffset] = useState(0);
  const [riderOffset, setRiderOffset] = useState(0);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [reviewReason, setReviewReason] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const key = ['operations', 'logistics', auth.user?.id, offset] as const;
  const shipments = useQuery({ queryKey: key, queryFn: () => logisticsService.list(offset), enabled: allowed, refetchInterval: 30_000 });
  const homeJobs = useQuery({ queryKey: ['operations', 'home-deliveries', auth.user?.id, homeOffset], queryFn: () => homeDeliveryService.list(homeOffset), enabled: allowed, refetchInterval: 30_000 });
  const applications = useQuery({ queryKey: ['operations', 'rider-applications', auth.user?.id, riderOffset], queryFn: () => riderService.pending(riderOffset), enabled: administrator });
  const notices = useQuery({ queryKey: ['operations', 'delivery-notices', auth.user?.id], queryFn: () => notificationService.list(), enabled: allowed, refetchInterval: 30_000 });
  const deliveryNotices = notices.data?.filter(item => ['New delivery assigned', 'Delivery assignment changed', 'Seller collection assigned', 'Delivery declined'].includes(item.title)).slice(0, 5) ?? [];
  const refresh = async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['operations', 'logistics'] }),
    client.invalidateQueries({ queryKey: ['operations', 'home-deliveries'] }),
    client.invalidateQueries({ queryKey: ['operations', 'delivery-notices'] }),
  ]); };
  const record = async (shipment: LogisticsShipment, stage: LogisticsStage) => {
    setBusyId(shipment.id); setError(undefined);
    try { await logisticsService.record(shipment.id, stage); await refresh(); }
    catch (value) { setError(getApiErrorMessage(value, 'Could not record this shipment event.')); }
    finally { setBusyId(undefined); }
  };
  const assign = async (shipment: LogisticsShipment) => {
    setBusyId(shipment.id); setError(undefined);
    try { await logisticsService.assign(shipment.id, email.trim(), reason.trim()); setEmail(''); setReason(''); await refresh(); }
    catch (value) { setError(getApiErrorMessage(value, 'Could not assign this shipment.')); }
    finally { setBusyId(undefined); }
  };
  const recordHome = async (job: HomeDeliveryJob, stage: HomeDeliveryRiderStage) => {
    setBusyId(job.order_id); setError(undefined);
    try { await homeDeliveryService.record(job.order_id, stage); await refresh(); }
    catch (value) { setError(getApiErrorMessage(value, 'Could not record this home-delivery event.')); }
    finally { setBusyId(undefined); }
  };
  const assignHome = async (job: HomeDeliveryJob) => {
    setBusyId(job.order_id); setError(undefined);
    try { await homeDeliveryService.assign(job.order_id, email.trim(), reason.trim()); setEmail(''); setReason(''); await refresh(); }
    catch (value) { setError(getApiErrorMessage(value, 'Could not assign this rider.')); }
    finally { setBusyId(undefined); }
  };
  const reviewApplication = async (id: number, decision: 'approved' | 'rejected') => {
    if (reviewReason.trim().length < 5) { setError('Enter a review reason of at least five characters.'); return; }
    setBusyId(String(id)); setError(undefined);
    try { await riderService.review(id, decision, reviewReason.trim()); setReviewReason(''); await applications.refetch(); }
    catch (cause) { setError(getApiErrorMessage(cause, 'Could not review this rider.')); }
    finally { setBusyId(undefined); }
  };
  const declineHome = async (job: HomeDeliveryJob) => {
    if (declineReason.trim().length < 5) { setError('Enter a reason for declining the job.'); return; }
    setBusyId(job.order_id); setError(undefined);
    try { await homeDeliveryService.record(job.order_id, 'rider_declined', declineReason.trim()); setDeclineReason(''); await refresh(); }
    catch (cause) { setError(getApiErrorMessage(cause, 'Could not decline this delivery.')); }
    finally { setBusyId(undefined); }
  };

  if (approvedRider) return null;
  return <OperationsScaffold title="Delivery logistics" subtitle="Record milestones after each physical handover.">
    {!allowed ? <Text style={styles.error}>Logistics access required.</Text> : <>
      {notices.isLoading || notices.isError || deliveryNotices.length ? <Text style={styles.title}>Delivery alerts</Text> : null}
      {notices.isLoading ? <Text style={styles.muted}>Loading alerts...</Text> : null}
      {notices.isError ? <Button variant="outline" onPress={() => void notices.refetch()}>Retry alerts</Button> : null}
      {deliveryNotices.map(item =>
        <View key={item.id} style={styles.card}><Text style={styles.title}>{item.title}</Text><Text style={styles.detail}>{item.message}</Text><Text style={styles.muted}>{formatOperationsDate(item.createdAt)}</Text></View>)}
      {administrator ? <><Text style={styles.title}>Rider applications</Text>
        {applications.isLoading ? <Text style={styles.muted}>Loading applications...</Text> : null}
        {applications.isError ? <Button variant="outline" onPress={() => void applications.refetch()}>Retry rider applications</Button> : null}
        {applications.data && !applications.data.results.length ? <Text style={styles.muted}>No applications to review.</Text> : null}
        {applications.data?.results.map(application => <View key={application.id} style={styles.card}>
          <Text style={styles.title}>{application.applicant_email}</Text>
          <Text style={styles.detail}>{application.city} · {application.vehicle_type} · {application.vehicle_registration}</Text>
          <Text style={styles.detail}>Licence: {application.licence_number} · Phone: {application.applicant_phone}</Text>
          {application.identity_document_url ? <Button variant="outline" onPress={() => void Linking.openURL(application.identity_document_url!)}>View identity document</Button> : null}
          {application.licence_document_url ? <Button variant="outline" onPress={() => void Linking.openURL(application.licence_document_url!)}>View licence document</Button> : null}
          <Input label="Review reason" value={reviewReason} onChangeText={setReviewReason} />
          <View style={styles.pager}><Button variant="outline" disabled={Boolean(busyId)} onPress={() => void reviewApplication(application.id, 'rejected')}>Request changes</Button><Button disabled={Boolean(busyId)} onPress={() => void reviewApplication(application.id, 'approved')}>Approve rider</Button></View>
        </View>)}
        {applications.data && applications.data.count > 30 ? <View style={styles.pager}><Button variant="outline" disabled={riderOffset === 0} onPress={() => setRiderOffset(Math.max(0, riderOffset - 30))}>Previous</Button><Text style={styles.muted}>{riderOffset + 1}–{Math.min(riderOffset + 30, applications.data.count)} of {applications.data.count}</Text><Button variant="outline" disabled={!applications.data.next} onPress={() => setRiderOffset(riderOffset + 30)}>Next</Button></View> : null}</> : null}
      <DataFreshness updatedAt={shipments.dataUpdatedAt} refreshing={shipments.isFetching} failed={shipments.isError} onRefresh={() => void shipments.refetch()} />
      {shipments.isLoading ? <Text style={styles.muted}>Loading shipments...</Text> : null}
      {shipments.isError ? <View><Text style={styles.error}>Shipments could not be loaded.</Text><Button variant="secondary" onPress={() => void shipments.refetch()}>Retry</Button></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {shipments.data && !shipments.data.results.length ? <Text style={styles.muted}>No active shipments.</Text> : null}
      {shipments.data?.results.map(shipment => {
        const next = nextStage(shipment);
        return <View key={shipment.id} style={styles.card}>
          <Text style={styles.title}>{shipment.seller_store_name || 'Seller collection'} → {shipment.pickup_point.name}</Text>
          <Text style={styles.muted}>Order {shipment.order_id.slice(0, 8)} · {formatOperationsDate(shipment.created_at)}</Text>
          <Text style={styles.detail}>Collect from: {shipment.seller_store_address || shipment.origin_city || 'Seller address unavailable'}</Text>
          {shipment.seller_store_phone ? <Text style={styles.detail}>Seller phone: {shipment.seller_store_phone}</Text> : null}
          <Text style={styles.detail}>Deliver to: {[shipment.pickup_address, shipment.pickup_city].filter(Boolean).join(', ')}</Text>
          <Text style={styles.muted}>Status: {shipment.events.at(-1)?.stage.replaceAll('_', ' ') ?? shipment.status}</Text>
          {shipment.tracking_number ? <Text style={styles.muted}>Tracking: {shipment.tracking_number}</Text> : null}
          {next && shipment.assigned_logistics_id === auth.user?.id ? <Button disabled={Boolean(busyId)} onPress={() => void record(shipment, next.value)}>{next.label}</Button> : null}
          {next && administrator && !shipment.assigned_logistics_id ? <Text style={styles.muted}>Assign a logistics staff member to record milestones.</Text> : null}
          {administrator ? <View style={styles.assign}><Input label="Logistics staff email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Input label="Assignment reason" value={reason} onChangeText={setReason} /><Button variant="secondary" disabled={Boolean(busyId) || !email.trim() || reason.trim().length < 5} onPress={() => void assign(shipment)}>Assign staff</Button></View> : null}
        </View>;
      })}
      {shipments.data && shipments.data.count > 30 ? <View style={styles.pager}><Button variant="secondary" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - 30))}>Previous</Button><Text style={styles.muted}>{offset + 1}–{Math.min(offset + 30, shipments.data.count)} of {shipments.data.count}</Text><Button variant="secondary" disabled={!shipments.data.next} onPress={() => setOffset(offset + 30)}>Next</Button></View> : null}
      <Text style={styles.title}>Pickup point to home</Text>
      <DataFreshness updatedAt={homeJobs.dataUpdatedAt} refreshing={homeJobs.isFetching} failed={homeJobs.isError} onRefresh={() => void homeJobs.refetch()} />
      {homeJobs.isLoading ? <Text style={styles.muted}>Loading home deliveries...</Text> : null}
      {homeJobs.isError ? <View><Text style={styles.error}>Home deliveries could not be loaded.</Text><Button variant="secondary" onPress={() => void homeJobs.refetch()}>Retry</Button></View> : null}
      {homeJobs.data && !homeJobs.data.results.length ? <Text style={styles.muted}>No active home deliveries.</Text> : null}
      {homeJobs.data?.results.map(job => {
        const next = nextHomeStage(job);
        return <View key={job.order_id} style={styles.card}>
          <Text style={styles.title}>Order {job.order_id.slice(0, 8)} · Home delivery</Text>
          <Text style={styles.muted}>{formatOperationsDate(job.created_at)} · {job.status.replaceAll('_', ' ')}</Text>
          <Text style={styles.detail}>Collect from: {job.pickup_point.name}, {job.pickup_address_snapshot}</Text>
          <Text style={styles.detail}>Deliver to: {job.destination_address}</Text>
          {job.delivery_instructions ? <Text style={styles.detail}>Instructions: {job.delivery_instructions}</Text> : null}
          {job.buyer_phone ? <Text style={styles.detail}>Buyer phone: {job.buyer_phone}</Text> : null}
          <Text style={styles.muted}>Quoted road distance: {(Number(job.distance_meters) / 1000).toFixed(2)} km</Text>
          {job.status === 'rider_assigned' && job.accept_by ? <Text style={new Date(job.accept_by).getTime() < Date.now() ? styles.error : styles.muted}>{new Date(job.accept_by).getTime() < Date.now() ? 'Acceptance deadline passed. Ask logistics to reassign.' : `Accept by ${formatOperationsDate(job.accept_by)}`}</Text> : null}
          {job.events.map(event => <Text key={event.id} style={styles.muted}>{event.stage.replaceAll('_', ' ')} · {formatOperationsDate(event.created_at)}</Text>)}
          {next && job.assigned_rider_id === auth.user?.id ? <Button disabled={Boolean(busyId)} onPress={() => void recordHome(job, next.value)}>{next.label}</Button> : null}
          {job.assigned_rider_id === auth.user?.id && ['rider_assigned', 'rider_accepted'].includes(job.status) ? <View style={styles.assign}><Input label="Reason if declining" value={declineReason} onChangeText={setDeclineReason} /><Button variant="outline" disabled={Boolean(busyId)} onPress={() => void declineHome(job)}>Decline delivery</Button></View> : null}
          {administrator && ['waiting_for_parcels', 'rider_assigned'].includes(job.status) ? <View style={styles.assign}><Input label="Approved rider email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Input label="Assignment reason" value={reason} onChangeText={setReason} /><Button variant="secondary" disabled={Boolean(busyId) || !email.trim() || reason.trim().length < 5} onPress={() => void assignHome(job)}>{job.status === 'rider_assigned' ? 'Reassign rider' : 'Assign rider'}</Button></View> : null}
        </View>;
      })}
      {homeJobs.data && homeJobs.data.count > 30 ? <View style={styles.pager}><Button variant="secondary" disabled={homeOffset === 0} onPress={() => setHomeOffset(Math.max(0, homeOffset - 30))}>Previous</Button><Text style={styles.muted}>{homeOffset + 1}–{Math.min(homeOffset + 30, homeJobs.data.count)} of {homeJobs.data.count}</Text><Button variant="secondary" disabled={!homeJobs.data.next} onPress={() => setHomeOffset(homeOffset + 30)}>Next</Button></View> : null}
    </>}
  </OperationsScaffold>;
};

const styles = StyleSheet.create({
  card: { backgroundColor: operationsColors.panel, borderColor: operationsColors.border, borderWidth: 1, borderRadius: 12, padding: 16, gap: 9, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: operationsColors.ink },
  detail: { fontSize: 14, color: operationsColors.ink },
  muted: { fontSize: 13, color: operationsColors.muted },
  error: { color: operationsColors.red, marginVertical: 8 },
  assign: { gap: 8, marginTop: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
});
