import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { logisticsService, LogisticsShipment, LogisticsStage } from '../../services/logisticsService';
import { homeDeliveryService, HomeDeliveryJob, HomeDeliveryRiderStage } from '../../services/homeDeliveryService';
import { hasStaffRole, isSuperAdmin } from '../../utils/roles';
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
  const client = useQueryClient();
  const allowed = hasStaffRole(auth.user, 'logistics');
  const administrator = isSuperAdmin(auth.user);
  const [offset, setOffset] = useState(0);
  const [homeOffset, setHomeOffset] = useState(0);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const key = ['operations', 'logistics', auth.user?.id, offset] as const;
  const shipments = useQuery({ queryKey: key, queryFn: () => logisticsService.list(offset), enabled: allowed });
  const homeJobs = useQuery({ queryKey: ['operations', 'home-deliveries', auth.user?.id, homeOffset], queryFn: () => homeDeliveryService.list(homeOffset), enabled: allowed });
  const refresh = async () => { await Promise.all([
    client.invalidateQueries({ queryKey: ['operations', 'logistics'] }),
    client.invalidateQueries({ queryKey: ['operations', 'home-deliveries'] }),
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

  return <OperationsScaffold title="Delivery logistics" subtitle="Seller collections, pickup points and assigned doorstep rides. Record milestones only after the physical handover has happened.">
    {!allowed ? <Text style={styles.error}>Logistics access required.</Text> : <>
      <DataFreshness updatedAt={shipments.dataUpdatedAt} refreshing={shipments.isFetching} failed={shipments.isError} onRefresh={() => void shipments.refetch()} />
      {shipments.isLoading ? <Text style={styles.muted}>Loading shipments...</Text> : null}
      {shipments.isError ? <View><Text style={styles.error}>Shipments could not be loaded.</Text><Button variant="secondary" onPress={() => void shipments.refetch()}>Retry</Button></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {shipments.data && !shipments.data.results.length ? <Text style={styles.muted}>No active shipments are assigned to you.</Text> : null}
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
      {homeJobs.data && !homeJobs.data.results.length ? <Text style={styles.muted}>No active home deliveries are assigned to you.</Text> : null}
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
          {job.events.map(event => <Text key={event.id} style={styles.muted}>{event.stage.replaceAll('_', ' ')} · {formatOperationsDate(event.created_at)}</Text>)}
          {next && job.assigned_rider_id === auth.user?.id ? <Button disabled={Boolean(busyId)} onPress={() => void recordHome(job, next.value)}>{next.label}</Button> : null}
          {administrator && job.status === 'waiting_for_parcels' ? <View style={styles.assign}><Input label="Rider staff email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Input label="Assignment reason" value={reason} onChangeText={setReason} /><Button variant="secondary" disabled={Boolean(busyId) || !email.trim() || reason.trim().length < 5} onPress={() => void assignHome(job)}>Assign rider</Button></View> : null}
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
