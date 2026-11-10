import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getApiErrorMessage } from '../../services/api';
import { riderService } from '../../services/riderService';
import { shippingService } from '../../services/shippingService';
import { ChoiceGroup } from '../../components/ui/ChoiceGroup';
import { operationsColors } from './OperationsScaffold';

export const RiderApplicationForm = ({ userId }: { userId: string }) => {
  const client = useQueryClient();
  const application = useQuery({ queryKey: ['rider-application', userId], queryFn: riderService.mine });
  const pickupPoints = useQuery({ queryKey: ['rider-pickup-cities'], queryFn: shippingService.pickupPoints });
  const [city, setCity] = useState('');
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [vehicleRegistration, setVehicleRegistration] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [identity, setIdentity] = useState<ImagePicker.ImagePickerAsset>();
  const [licence, setLicence] = useState<ImagePicker.ImagePickerAsset>();
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const pick = async (kind: 'identity' | 'licence') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow photo access to select a document image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) (kind === 'identity' ? setIdentity : setLicence)(result.assets[0]);
  };
  const submit = async () => {
    if (!identity || !licence || !city.trim() || !vehicleRegistration.trim() || !licenceNumber.trim()) {
      setError('Complete every field and select both document images.'); return;
    }
    setBusy(true); setError(undefined);
    try {
      const result = await riderService.submit({ city, vehicleType, vehicleRegistration, licenceNumber, identity, licence, smsAlerts });
      client.setQueryData(['rider-application', userId], result);
    } catch (cause) { setError(getApiErrorMessage(cause, 'Could not submit rider application.')); }
    finally { setBusy(false); }
  };

  if (application.isLoading) return <Text style={styles.copy}>Loading rider application...</Text>;
  if (application.isError) return <View><Text style={styles.error}>Could not load rider application.</Text><Button onPress={() => void application.refetch()}>Retry</Button></View>;
  if (application.data?.status === 'pending') return <Text style={styles.copy}>Your rider application is awaiting review. You will be notified when it is reviewed.</Text>;
  if (application.data?.status === 'approved') return <Text style={styles.copy}>Your rider application is approved. Sign in again to open Logistics.</Text>;

  return <View style={styles.root}>
    <Text style={styles.title}>Apply to deliver for AfriClay</Text>
    {application.data?.status === 'rejected' ? <Text style={styles.error} accessibilityRole="alert">Changes requested: {application.data.review_reason}</Text> : null}
    <Text style={styles.copy}>Enter the city where you can collect parcels. A super administrator will verify your documents before any job is assigned.</Text>
    {pickupPoints.isError ? <Button variant="outline" onPress={() => void pickupPoints.refetch()}>Retry service cities</Button> : null}
    {pickupPoints.isLoading ? <Text style={styles.copy}>Loading service cities...</Text> : null}
    {pickupPoints.data ? <ChoiceGroup label="Service city" required value={city} onChange={setCity} options={[...new Set(pickupPoints.data.map(point => point.city))].map(value => ({ value, label: value }))} /> : null}
    <Input label="Vehicle type" value={vehicleType} onChangeText={setVehicleType} />
    <Input label="Vehicle registration" value={vehicleRegistration} onChangeText={setVehicleRegistration} />
    <Input label="Driving licence number" value={licenceNumber} onChangeText={setLicenceNumber} />
    <Button variant="outline" onPress={() => void pick('identity')}>{identity ? 'Identity image selected' : 'Select identity image'}</Button>
    <Button variant="outline" onPress={() => void pick('licence')}>{licence ? 'Licence image selected' : 'Select driving licence image'}</Button>
    <Text style={styles.copy}>JPG or PNG, up to 10 MB each. Documents are private and available only to administrators reviewing your application.</Text>
    <View style={styles.smsRow}><Switch value={smsAlerts} onValueChange={setSmsAlerts} accessibilityLabel="Send job assignment alerts by SMS" /><Text style={styles.copy}>Send generic job assignment alerts by SMS to my account number</Text></View>
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    <Button loading={busy} disabled={busy} onPress={() => void submit()}>Submit rider application</Button>
  </View>;
};

const styles = StyleSheet.create({
  root: { gap: 11, paddingTop: 14 }, title: { fontSize: 18, fontWeight: '700', color: operationsColors.ink },
  copy: { color: operationsColors.muted, fontSize: 13, lineHeight: 19, flexShrink: 1 },
  error: { color: operationsColors.red, fontSize: 13 }, smsRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
});
