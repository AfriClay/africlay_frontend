import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { homeDeliveryService, HomeDeliveryJob, HomeDeliveryRiderStage } from '../../services/homeDeliveryService';
import { logisticsService, LogisticsShipment, LogisticsStage } from '../../services/logisticsService';
import { isApprovedRider } from '../../utils/roles';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { DataFreshness, formatOperationsDate, OperationsScaffold, operationsColors } from './OperationsScaffold';

const nextCollectionStage = (shipment: LogisticsShipment): { stage: LogisticsStage; label: string } | undefined => {
  if (shipment.status !== 'shipped') return undefined;
  const stages = new Set(shipment.events.map(event => event.stage));
  if (!stages.has('awaiting_collection')) return undefined;
  if (!stages.has('collected_from_seller')) return { stage: 'collected_from_seller', label: 'Confirm collection from seller' };
  if (!stages.has('in_transit')) return { stage: 'in_transit', label: 'Confirm in transit' };
  if (!stages.has('arrived_at_pickup')) return { stage: 'arrived_at_pickup', label: 'Confirm arrival at pickup point' };
  return undefined;
};

const nextHomeStage = (job: HomeDeliveryJob): { stage: HomeDeliveryRiderStage; label: string } | undefined => {
  if (job.status === 'rider_assigned') return { stage: 'rider_accepted', label: 'Accept delivery' };
  if (job.status === 'rider_accepted') return { stage: 'collected_from_pickup', label: 'Confirm pickup' };
  if (job.status === 'collected_from_pickup') return { stage: 'rider_delivered', label: 'Report delivered' };
  return undefined;
};

export const RiderDashboard = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const allowed = isApprovedRider(user);
  const [collectionOffset, setCollectionOffset] = useState(0);
  const [homeOffset, setHomeOffset] = useState(0);
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [declineReasons, setDeclineReasons] = useState<Record<string, string>>({});
  const collections = useQuery({
    queryKey: ['rider', user?.id, 'collections', collectionOffset],
    queryFn: () => logisticsService.list(collectionOffset), enabled: allowed, refetchInterval: 30_000,
  });
  const homeJobs = useQuery({
    queryKey: ['rider', user?.id, 'home-deliveries', homeOffset],
    queryFn: () => homeDeliveryService.list(homeOffset), enabled: allowed, refetchInterval: 30_000,
  });

  const recordCollection = async (shipment: LogisticsShipment, stage: LogisticsStage) => {
    setBusyId(shipment.id); setError(undefined);
    try { await logisticsService.record(shipment.id, stage); await collections.refetch(); }
    catch (cause) { setError(getApiErrorMessage(cause, 'Could not update this collection.')); }
    finally { setBusyId(undefined); }
  };
  const recordHome = async (job: HomeDeliveryJob, stage: HomeDeliveryRiderStage) => {
    setBusyId(job.order_id); setError(undefined);
    const reason = declineReasons[job.order_id]?.trim() ?? '';
    if (stage === 'rider_declined' && reason.length < 5) {
      setError('Enter a reason of at least five characters to decline a delivery.'); setBusyId(undefined); return;
    }
    try {
      await homeDeliveryService.record(job.order_id, stage, stage === 'rider_declined' ? reason : '');
      setDeclineReasons(current => ({ ...current, [job.order_id]: '' }));
      await homeJobs.refetch();
    } catch (cause) { setError(getApiErrorMessage(cause, 'Could not update this delivery.')); }
    finally { setBusyId(undefined); }
  };

  return <OperationsScaffold title="My deliveries" subtitle="Confirm each handover after it happens.">
    {!allowed ? <View style={styles.card}><Text style={styles.error} accessibilityRole="alert">An approved rider account is required to view this page.</Text><Button onPress={() => navigation.navigate('OperationsLogin')}>Sign in to Operations</Button></View> : <>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <View style={styles.summaryRow}>
        <View style={styles.summary}><Text style={styles.count}>{collections.data?.count ?? '—'}</Text><Text style={styles.muted}>Seller collections</Text></View>
        <View style={styles.summary}><Text style={styles.count}>{homeJobs.data?.count ?? '—'}</Text><Text style={styles.muted}>Home deliveries</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Seller to pickup point</Text>
      <DataFreshness updatedAt={collections.dataUpdatedAt} refreshing={collections.isFetching} failed={collections.isError} onRefresh={() => void collections.refetch()} />
      {collections.isLoading ? <Text style={styles.muted}>Loading assigned collections...</Text> : null}
      {collections.isError ? <Text style={styles.error}>Collections unavailable.</Text> : null}
      {collections.data && !collections.data.results.length ? <Text style={styles.muted}>No active collections.</Text> : null}
      {collections.data?.results.map(shipment => {
        const next = nextCollectionStage(shipment);
        return <View key={shipment.id} style={styles.card}>
          <Text style={styles.cardTitle}>{shipment.seller_store_name || 'Seller collection'} → {shipment.pickup_point.name}</Text>
          <Text style={styles.muted}>Order {shipment.order_id.slice(0, 8)} · {formatOperationsDate(shipment.created_at)}</Text>
          <Text style={styles.detail}>Collect from: {shipment.seller_store_address || shipment.origin_city || 'Seller address unavailable'}</Text>
          {shipment.seller_store_phone ? <Text style={styles.detail}>Seller phone: {shipment.seller_store_phone}</Text> : null}
          <Text style={styles.detail}>Deliver to: {[shipment.pickup_address, shipment.pickup_city].filter(Boolean).join(', ')}</Text>
          {next && shipment.assigned_logistics_id === user?.id ? <Button disabled={Boolean(busyId)} loading={busyId === shipment.id} onPress={() => void recordCollection(shipment, next.stage)}>{next.label}</Button> : null}
        </View>;
      })}
      {collections.data && collections.data.count > 30 ? <View style={styles.pager}><Button variant="outline" disabled={!collectionOffset} onPress={() => setCollectionOffset(Math.max(0, collectionOffset - 30))}>Previous</Button><Text style={styles.muted}>{collectionOffset + 1}–{Math.min(collectionOffset + 30, collections.data.count)} of {collections.data.count}</Text><Button variant="outline" disabled={!collections.data.next} onPress={() => setCollectionOffset(collectionOffset + 30)}>Next</Button></View> : null}

      <Text style={styles.sectionTitle}>Pickup point to home</Text>
      <DataFreshness updatedAt={homeJobs.dataUpdatedAt} refreshing={homeJobs.isFetching} failed={homeJobs.isError} onRefresh={() => void homeJobs.refetch()} />
      {homeJobs.isLoading ? <Text style={styles.muted}>Loading assigned home deliveries...</Text> : null}
      {homeJobs.isError ? <Text style={styles.error}>Home deliveries unavailable.</Text> : null}
      {homeJobs.data && !homeJobs.data.results.length ? <Text style={styles.muted}>No active home deliveries.</Text> : null}
      {homeJobs.data?.results.map(job => {
        const next = nextHomeStage(job);
        return <View key={job.order_id} style={styles.card}>
          <Text style={styles.cardTitle}>Order {job.order_id.slice(0, 8)} · Home delivery</Text>
          <Text style={styles.muted}>{formatOperationsDate(job.created_at)} · {job.status.replaceAll('_', ' ')}</Text>
          <Text style={styles.detail}>Collect from: {job.pickup_point.name}, {job.pickup_address_snapshot}</Text>
          <Text style={styles.detail}>Deliver to: {job.destination_address}</Text>
          {job.delivery_instructions ? <Text style={styles.detail}>Instructions: {job.delivery_instructions}</Text> : null}
          {job.buyer_phone ? <Text style={styles.detail}>Buyer phone: {job.buyer_phone}</Text> : null}
          {job.status === 'rider_assigned' && job.accept_by ? <Text style={styles.muted}>Accept by {formatOperationsDate(job.accept_by)}</Text> : null}
          {next && job.assigned_rider_id === user?.id ? <Button disabled={Boolean(busyId)} loading={busyId === job.order_id} onPress={() => void recordHome(job, next.stage)}>{next.label}</Button> : null}
          {job.assigned_rider_id === user?.id && ['rider_assigned', 'rider_accepted'].includes(job.status) ? <View style={styles.decline}>
            <Input label="Reason for declining" value={declineReasons[job.order_id] ?? ''} onChangeText={value => setDeclineReasons(current => ({ ...current, [job.order_id]: value }))} />
            <Button variant="outline" disabled={Boolean(busyId)} onPress={() => void recordHome(job, 'rider_declined')}>Decline delivery</Button>
          </View> : null}
        </View>;
      })}
      {homeJobs.data && homeJobs.data.count > 30 ? <View style={styles.pager}><Button variant="outline" disabled={!homeOffset} onPress={() => setHomeOffset(Math.max(0, homeOffset - 30))}>Previous</Button><Text style={styles.muted}>{homeOffset + 1}–{Math.min(homeOffset + 30, homeJobs.data.count)} of {homeJobs.data.count}</Text><Button variant="outline" disabled={!homeJobs.data.next} onPress={() => setHomeOffset(homeOffset + 30)}>Next</Button></View> : null}
    </>}
  </OperationsScaffold>;
};

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  summary: { flexGrow: 1, minWidth: 140, padding: 16, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 12, backgroundColor: operationsColors.panel },
  count: { fontSize: 25, fontWeight: '800', color: operationsColors.green },
  sectionTitle: { marginTop: 16, marginBottom: 9, fontSize: 18, fontWeight: '800', color: operationsColors.ink },
  card: { padding: 16, borderWidth: 1, borderColor: operationsColors.border, borderRadius: 12, backgroundColor: operationsColors.panel, gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: operationsColors.ink },
  detail: { fontSize: 14, color: operationsColors.ink },
  muted: { fontSize: 13, color: operationsColors.muted },
  error: { color: operationsColors.red, marginVertical: 8 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  decline: { gap: 8, marginTop: 8 },
});
