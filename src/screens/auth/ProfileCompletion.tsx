import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';

export const ProfileCompletion: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const auth = useAuth();

  const handleSave = async () => {
    const baseUser = auth.user ?? auth.pendingUser;
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try { await auth.saveProfile({ name: name || baseUser?.name, phoneNumber: phone }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save profile.'); }
    finally { setSaving(false); }
  };

  const handleSkip = async () => {
    if (saving) return;
    setSaving(true);
    try { await auth.saveProfile({}); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to continue.'); setSaving(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Complete your profile</Text>
      <Text style={styles.copy}>Add details to make checkout faster. You can skip this step and update later.</Text>
      <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" accessibilityLabel="Full name" />
      <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" accessibilityLabel="Phone number" />
      {error && <Text style={styles.copy} accessibilityRole="alert">{error}</Text>}
      <Button onPress={() => void handleSave()} loading={saving} accessibilityLabel="Save and Continue">Save & Continue</Button>
      <Pressable onPress={handleSkip} accessibilityRole="button">
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
