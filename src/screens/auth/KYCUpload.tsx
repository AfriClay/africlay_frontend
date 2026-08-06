import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { FileCheck2, Upload } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

const documentTypes = ['National ID', 'Passport', 'Business registration'] as const;

export const KYCUpload: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number]>('National ID');
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const pickDocument = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to select your verification document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 2 - documents.length),
    });
    if (!result.canceled) {
      setDocuments(current => [...current, ...result.assets.map(asset => asset.uri)].slice(0, 2));
      setError(undefined);
    }
  };

  const submit = async () => {
    if (!documents.length) {
      setError('Add at least one clear document image.');
      return;
    }
    setLoading(true);
    try {
      await auth.beginSellerVerification();
      navigation.navigate('VerificationPending');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.icon}><FileCheck2 color={theme.colors.primary.DEFAULT} size={32} /></View>
      <Text style={styles.title}>Verify your seller account</Text>
      <Text style={styles.copy}>Choose a document type and upload clear photos. This is a local demo submission; no document leaves this device.</Text>
      <Text style={styles.label}>Document type</Text>
      <View style={styles.chips}>
        {documentTypes.map(type => (
          <Pressable key={type} onPress={() => setDocumentType(type)} style={[styles.chip, documentType === type ? styles.chipActive : null]}>
            <Text style={[styles.chipText, documentType === type ? styles.chipTextActive : null]}>{type}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.upload} onPress={pickDocument} accessibilityRole="button">
        <Upload color={theme.colors.primary.DEFAULT} size={26} />
        <Text style={styles.uploadTitle}>Upload document photos</Text>
        <Text style={styles.uploadCopy}>Front and back, up to 2 images</Text>
      </Pressable>
      <View style={styles.previews}>
        {documents.map(uri => <Image key={uri} source={{ uri }} style={styles.preview} />)}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={submit} loading={loading} disabled={!documents.length}>Submit for Verification</Button>
    </ScrollView>
  );
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
  previews: { flexDirection: 'row', gap: theme.spacing.sm, marginVertical: theme.spacing.md },
  preview: { width: 92, height: 92, borderRadius: theme.radii.md },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
