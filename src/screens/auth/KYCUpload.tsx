import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCheck2, Upload } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { storeService } from '../../services/storeService';
import { getApiErrorMessage } from '../../services/api';
import { catalogKeys } from '../../services/catalogQueries';
import { theme } from '../../theme';

const documentTypes = [
  { label: 'National ID', value: 'national_id' }, { label: 'Passport', value: 'passport' },
  { label: 'Business registration', value: 'business_registration' }, { label: 'Tax certificate', value: 'tax_certificate' },
] as const;

export const KYCUpload: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const client = useQueryClient();
  const userId = auth.user?.id ?? '';
  const storeQuery = useQuery({ queryKey: ['owned-store', userId], queryFn: () => storeService.ownStore(userId), enabled: Boolean(userId) });
  const slug = storeQuery.data?.slug ?? '';
  const kycQuery = useQuery({ queryKey: ['store-kyc', slug], queryFn: () => storeService.kyc(slug), enabled: Boolean(slug) });
  const [documentType, setDocumentType] = useState<string>('national_id');
  const [document, setDocument] = useState<ImagePicker.ImagePickerAsset>();
  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const pickDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Allow photo access to select a verification document.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled) { setDocument(result.assets[0]); setError(undefined); }
  };
  const submit = async () => {
    if (!slug || !document || !businessName.trim() || !registrationNumber.trim() || !taxNumber.trim()) {
      setError('Complete the business details and select a document image.'); return;
    }
    if (loading) return;
    setLoading(true);
    setError(undefined);
    try {
      await storeService.submitKyc(slug, { businessName, registrationNumber, taxNumber, documentType, document });
      await client.invalidateQueries({ queryKey: ['store-kyc', slug] });
      if (userId) void client.invalidateQueries({ queryKey: catalogKeys.sellerAccess(userId) });
      navigation.navigate('VerificationPending');
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to submit verification.')); }
    finally { setLoading(false); }
  };

  if (storeQuery.isError || kycQuery.isError) return <ErrorState message="Unable to load seller verification." onRetry={() => { void storeQuery.refetch(); void kycQuery.refetch(); }} />;
  if (storeQuery.isLoading || kycQuery.isLoading) return <Text style={styles.copy}>Loading verification...</Text>;
  if (!slug) return <ScrollView contentContainerStyle={styles.container}><Text style={styles.title}>Create a store first</Text><Button onPress={() => navigation.navigate('StorefrontSetup')}>Set Up Storefront</Button></ScrollView>;
  if (kycQuery.data?.status === 'pending' || kycQuery.data?.status === 'approved') return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Verification {kycQuery.data.status}</Text>
    <Text style={styles.copy}>{kycQuery.data.status === 'approved' ? 'Your store is approved.' : 'Your documents are awaiting review.'}</Text>
    <Button variant="outline" onPress={() => void kycQuery.refetch()}>Refresh status</Button>
  </ScrollView>;

  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.icon}><FileCheck2 color={theme.colors.primary.DEFAULT} size={32} /></View>
    <Text style={styles.title}>Verify your seller account</Text>
    {kycQuery.data?.status === 'rejected' && <Text style={styles.error}>Previous submission rejected: {kycQuery.data.rejection_reason || 'Please review your documents.'}</Text>}
    <Input label="Business name" value={businessName} onChangeText={setBusinessName} />
    <Input label="Registration number" value={registrationNumber} onChangeText={setRegistrationNumber} />
    <Input label="Tax identification number" value={taxNumber} onChangeText={setTaxNumber} />
    <Text style={styles.label}>Document type</Text>
    <View style={styles.chips}>{documentTypes.map(type => <Pressable key={type.value} onPress={() => setDocumentType(type.value)} style={[styles.chip, documentType === type.value && styles.chipActive]} accessibilityRole="radio" accessibilityState={{ selected: documentType === type.value }}>
      <Text style={[styles.chipText, documentType === type.value && styles.chipTextActive]}>{type.label}</Text>
    </Pressable>)}</View>
    <Pressable style={styles.upload} onPress={() => void pickDocument()} accessibilityRole="button" accessibilityLabel="Select verification document">
      <Upload color={theme.colors.primary.DEFAULT} size={26} />
      <Text style={styles.uploadTitle}>{document ? 'Change document' : 'Select document image'}</Text>
      <Text style={styles.uploadCopy}>JPG or PNG, up to 10 MB</Text>
    </Pressable>
    {document && <Image source={{ uri: document.uri }} style={styles.preview} />}
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button onPress={() => void submit()} loading={loading} disabled={!document}>Submit for Verification</Button>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl, backgroundColor: theme.colors.cream },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  copy: { color: theme.colors.muted, lineHeight: 22, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  label: { color: theme.colors.ink, fontWeight: '700', marginBottom: theme.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  chipActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  chipText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  chipTextActive: { color: theme.colors.white, fontWeight: '700' },
  upload: { minHeight: 150, borderRadius: theme.radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary.DEFAULT, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
  uploadTitle: { color: theme.colors.ink, fontWeight: '800', marginTop: theme.spacing.sm },
  uploadCopy: { color: theme.colors.muted, marginTop: theme.spacing.xs },
  preview: { width: 92, height: 92, borderRadius: theme.radii.md, marginVertical: theme.spacing.md },
  error: { color: theme.colors.error, marginVertical: theme.spacing.md },
});
