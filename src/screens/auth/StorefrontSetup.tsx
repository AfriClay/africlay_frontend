import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Camera, Store } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { theme } from '../../theme';

const DEFAULT_STORE_NAME = "Wanjiku's Corner";

export const StorefrontSetup: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [name, setName] = useState(auth.storefront?.name ?? '');
  const [logoUrl, setLogoUrl] = useState(auth.storefront?.logoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setLogoUrl(result.assets[0]?.uri);
  };

  const save = async () => {
    const userId = (auth.user ?? auth.pendingUser)?.id;
    if (!userId) {
      setError('Your account session is missing. Please log in again.');
      return;
    }
    setLoading(true);
    try {
      await auth.saveStorefront({ name: name.trim() || DEFAULT_STORE_NAME, logoUrl });
      await Promise.all([
        productService.initializeSellerCatalog(userId),
        orderService.initializeSellerOrders(userId),
      ]);
      if (!auth.user) navigation.navigate('ProfileCompletion');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your storefront.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headingIcon}><Store color={theme.colors.primary.DEFAULT} size={30} /></View>
      <Text style={styles.title}>Set up your storefront</Text>
      <Text style={styles.copy}>Add a store name and logo. You can change these details later.</Text>
      <Pressable style={styles.logoPicker} onPress={pickLogo} accessibilityRole="button">
        {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} /> : <Camera color={theme.colors.primary.DEFAULT} size={28} />}
        <Text style={styles.logoText}>{logoUrl ? 'Change logo' : 'Add store logo'}</Text>
      </Pressable>
      <Input label="Store name" value={name} onChangeText={setName} placeholder={DEFAULT_STORE_NAME} accessibilityLabel="Store name" />
      <Text style={styles.hint}>Leaving this empty creates “{DEFAULT_STORE_NAME}” for the demo.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={save} loading={loading}>Create Storefront</Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.cream },
  headingIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  title: { marginTop: theme.spacing.md, color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  copy: { color: theme.colors.muted, lineHeight: 22, marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg },
  logoPicker: { height: 150, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.lg, ...theme.shadows.sm },
  logo: { width: 88, height: 88, borderRadius: 44 },
  logoText: { marginTop: theme.spacing.sm, color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  hint: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: -theme.spacing.sm, marginBottom: theme.spacing.lg },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md },
});
