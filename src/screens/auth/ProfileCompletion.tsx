import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../constants/routes';
import { Input } from '../../components/ui/Input';

export const ProfileCompletion: React.FC = () => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const auth = useAuth();
  const navigation = useNavigation<any>();

  const handleSave = async () => {
    await auth.saveProfile({ name: name || auth.user?.name, location: city ? `${city}, Kenya` : auth.user?.location });
    navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete your profile</Text>
      <Text style={styles.copy}>Add details to make checkout faster. You can skip this step and update later.</Text>
      <View style={styles.avatarBox}>
        <Text style={styles.avatarText}>Photo picker coming soon</Text>
      </View>
      <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" accessibilityLabel="Full name" />
      <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" accessibilityLabel="Phone number" />
      <Input label="Address" value={address} onChangeText={setAddress} placeholder="Delivery address" accessibilityLabel="Delivery address" />
      <Input label="City" value={city} onChangeText={setCity} placeholder="City" accessibilityLabel="City" />
      <Button onPress={handleSave} accessibilityLabel="Save and Continue">Save & Continue</Button>
      <Pressable onPress={() => navigation.reset({ index: 0, routes: [{ name: 'AppTabs' }] })} accessibilityRole="button">
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.cream,
    flexGrow: 1,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '800',
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  copy: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
  },
  avatarBox: {
    height: 120,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  avatarText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
  skip: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.body.fontSize,
  },
});
