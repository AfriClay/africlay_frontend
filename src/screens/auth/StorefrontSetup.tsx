import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Store } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { storeService } from '../../services/storeService';
import { getApiErrorMessage } from '../../services/api';
import { catalogKeys } from '../../services/catalogQueries';
import { theme } from '../../theme';

export const StorefrontSetup: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setLogo(result.assets[0]);
  };
  const save = async () => {
    const user = auth.user;
    if (!user || !user.verified || (user.role !== 'seller' && user.role !== 'both')) {
      setError('A verified seller account is required to create a store. Buyer role upgrades are not supported yet.');
      return;
    }
    if (!name.trim()) { setError('Enter a store name.'); return; }
    if (loading) return;
    setLoading(true);
    setError(undefined);
    try {
      await storeService.create(name, logo);
      await client.invalidateQueries({ queryKey: catalogKeys.sellerAccess(user.id) });
      await client.invalidateQueries({ queryKey: ['owned-store', user.id] });
      navigation.navigate('KYCUpload');
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to create store.')); }
    finally { setLoading(false); }
  };

  return <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.headingIcon}><Store color={theme.colors.primary.DEFAULT} size={30} /></View>
    <Text style={styles.title}>Set up your storefront</Text>
    <Text style={styles.copy}>Create your store before submitting verification documents.</Text>
    <Pressable style={styles.logoPicker} onPress={() => void pickLogo()} accessibilityRole="button" accessibilityLabel="Choose store logo">
      {logo ? <Image source={{ uri: logo.uri }} style={styles.logo} /> : <Camera color={theme.colors.primary.DEFAULT} size={28} />}
      <Text style={styles.logoText}>{logo ? 'Change logo' : 'Add store logo'}</Text>
    </Pressable>
    <Input label="Store name" value={name} onChangeText={setName} placeholder="Your business name" accessibilityLabel="Store name" />
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Button onPress={() => void save()} loading={loading}>Create Storefront</Button>
  </ScrollView>;
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.cream },
  headingIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  title: { marginTop: theme.spacing.md, color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  copy: { color: theme.colors.muted, lineHeight: 22, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  logoPicker: { height: 150, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg, ...theme.shadows.sm },
  logo: { width: 88, height: 88, borderRadius: 44 },
  logoText: { marginTop: theme.spacing.sm, color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
