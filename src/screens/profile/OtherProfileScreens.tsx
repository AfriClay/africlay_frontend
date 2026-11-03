import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { AddressForm } from '../../components/domain/AddressForm';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { addressService, AddressInput, SavedAddress } from '../../services/addressService';
import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/api';
import { theme } from '../../theme';

export const MyAddresses: React.FC = () => {
  const userId = useAuth().user?.id ?? '';
  const client = useQueryClient();
  const key = ['addresses', userId] as const;
  const query = useQuery({ queryKey: key, queryFn: addressService.list, enabled: Boolean(userId) });
  const [editing, setEditing] = useState<SavedAddress | 'new' | null>(null);
  const [deleteId, setDeleteId] = useState<string>();
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const save = async (input: AddressInput) => {
    if (editing && editing !== 'new') await addressService.update(editing.id, input);
    else await addressService.create(input);
    await client.invalidateQueries({ queryKey: key });
    setEditing(null);
  };
  const remove = async (id: string) => {
    if (deleting) return;
    setDeleting(true);
    setError(undefined);
    try { await addressService.remove(id); await client.invalidateQueries({ queryKey: key }); setDeleteId(undefined); }
    catch (cause) { setError(getApiErrorMessage(cause, 'Unable to delete address.')); }
    finally { setDeleting(false); }
  };
  if (!userId) return <SafeAreaView style={styles.container}><EmptyState title="Sign in to view addresses" description="Saved addresses belong to your account." /></SafeAreaView>;
  if (query.isError) return <ErrorState message={getApiErrorMessage(query.error, 'Unable to load addresses.')} onRetry={() => void query.refetch()} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}>
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    {editing ? <ScrollView contentContainerStyle={styles.content}><AddressForm key={editing === 'new' ? 'new' : editing.id}
      initial={editing === 'new' ? undefined : editing} onSave={save} onCancel={() => setEditing(null)} /></ScrollView> :
      query.isLoading ? <Text style={styles.note}>Loading addresses...</Text> : <FlatList data={query.data ?? []} keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => <View style={styles.row}>
          <MapPin color={theme.colors.primary.DEFAULT} size={20} />
          <View style={styles.rowContent}><Text style={styles.name}>{item.street_address}{item.is_default ? ' (Default)' : ''}</Text>
            <Text style={styles.note}>{[item.city, item.postal_code, item.country].filter(Boolean).join(', ')}</Text>
            <View style={styles.actions}><Button size="sm" variant="tertiary" accessibilityLabel={`Edit ${item.street_address}`} onPress={() => setEditing(item)}>Edit</Button>
              {deleteId === item.id ? <><Button size="sm" variant="destructive" onPress={() => void remove(item.id)} loading={deleting} loadingLabel="Deleting">Confirm delete</Button><Button size="sm" variant="tertiary" onPress={() => setDeleteId(undefined)} disabled={deleting}>Cancel</Button></> :
                <Button size="sm" variant="tertiary" accessibilityLabel={`Delete ${item.street_address}`} onPress={() => setDeleteId(item.id)}>Delete</Button>}
            </View>
          </View>
        </View>}
        ListEmptyComponent={<EmptyState title="No saved addresses" description="Add an address for checkout." />}
        ListFooterComponent={<Button variant="outline" onPress={() => setEditing('new')}>Add New Address</Button>} />}
  </SafeAreaView>;
};

export const Settings: React.FC = () => {
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const client = useQueryClient();
  const profileQuery = useQuery({ queryKey: ['profile', userId], queryFn: authService.currentUser, enabled: Boolean(userId) });
  const [name, setName] = useState(auth.user?.name ?? '');
  const [phone, setPhone] = useState(auth.user?.phoneNumber ?? '');
  const [bio, setBio] = useState(auth.user?.bio ?? '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<'profile' | 'preferences'>();
  const startEditing = () => {
    const source = profileQuery.data ?? auth.user;
    setName(source?.name ?? ''); setPhone(source?.phoneNumber ?? ''); setBio(source?.bio ?? '');
    setError(undefined); setSuccess(undefined); setEditing(true);
  };
  const save = async () => {
    if (saving || !name.trim()) { setError('Enter your name.'); return; }
    setSaving(true); setError(undefined); setSuccess(undefined);
    try {
      await auth.saveProfile({ name: name.trim(), phoneNumber: phone.trim(), bio: bio.trim() });
      await client.invalidateQueries({ queryKey: ['profile', userId] });
      setEditing(false); setSuccess('profile');
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to update profile.')); }
    finally { setSaving(false); }
  };
  const updateEmailPreference = async (key: 'email_order_updates' | 'email_seller_sales' | 'email_booking_updates' | 'email_seller_bookings', enabled: boolean) => {
    if (savingEmail || !profileQuery.data) return;
    setSavingEmail(true); setError(undefined); setSuccess(undefined);
    try {
      await auth.saveProfile({ notificationPreferences: {
        email_order_updates: profileQuery.data.notificationPreferences?.email_order_updates !== false,
        email_seller_sales: profileQuery.data.notificationPreferences?.email_seller_sales === true,
        email_booking_updates: profileQuery.data.notificationPreferences?.email_booking_updates !== false,
        email_seller_bookings: profileQuery.data.notificationPreferences?.email_seller_bookings === true,
        [key]: enabled,
      } });
      await client.invalidateQueries({ queryKey: ['profile', userId] });
      setSuccess('preferences');
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to save email preferences.')); }
    finally { setSavingEmail(false); }
  };
  if (!userId) return <EmptyState title="Sign in to edit your profile" description="Profile details belong to your account." />;
  if (profileQuery.isError) return <ErrorState message="Unable to load your profile." onRetry={() => void profileQuery.refetch()} />;
  return <SafeAreaView style={styles.container} edges={['bottom']}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Profile</Text>
    {profileQuery.isLoading ? <Text style={styles.note}>Loading profile...</Text> : editing ? <>
      <Input label="Full name" required accessibilityLabel="Full name" value={name} onChangeText={setName} autoComplete="name" />
      <Input label="Phone" optional accessibilityLabel="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
      <Input label="Bio" optional accessibilityLabel="Bio" value={bio} onChangeText={setBio} multiline placeholder="Tell customers a little about yourself" />
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Button onPress={() => void save()} loading={saving}>Save Profile</Button>
      <Button variant="outline" onPress={() => setEditing(false)} disabled={saving}>Cancel</Button>
    </> : <>
      <Text style={styles.name}>{profileQuery.data?.name}</Text>
      <Text style={styles.note}>{profileQuery.data?.email}</Text>
      <Text style={styles.note}>{profileQuery.data?.phoneNumber || 'No phone number'}</Text>
      <Text style={styles.note}>{profileQuery.data?.bio || 'No bio'}</Text>
      {success === 'profile' && <Text style={styles.success} accessibilityRole="alert">Profile updated.</Text>}
      <Button onPress={startEditing}>Edit Profile</Button>
    </>}
    {!profileQuery.isLoading && <View style={styles.preferences}>
      <Text style={styles.heading}>Email updates</Text>
      <Text style={styles.note}>Choose which marketplace updates you receive by email. Account verification and password reset emails are always sent.</Text>
      <View style={styles.preferenceRow}>
        <View style={styles.rowContent}><Text style={styles.name}>Order updates</Text><Text style={styles.note}>Payment, shipping, cancellation and delivery updates for your purchases.</Text></View>
        <Switch accessibilityLabel="Email me updates about my orders" disabled={savingEmail} value={profileQuery.data?.notificationPreferences?.email_order_updates !== false} onValueChange={value => void updateEmailPreference('email_order_updates', value)} />
      </View>
      <View style={styles.preferenceRow}>
        <View style={styles.rowContent}><Text style={styles.name}>Service bookings</Text><Text style={styles.note}>Requests, confirmations and changes to your bookings.</Text></View>
        <Switch accessibilityLabel="Email me updates about my service bookings" disabled={savingEmail} value={profileQuery.data?.notificationPreferences?.email_booking_updates !== false} onValueChange={value => void updateEmailPreference('email_booking_updates', value)} />
      </View>
      {['seller', 'both'].includes(profileQuery.data?.role ?? '') && <View style={styles.preferenceRow}>
        <View style={styles.rowContent}><Text style={styles.name}>New purchases</Text><Text style={styles.note}>Get an email when a customer payment for your product is confirmed.</Text></View>
        <Switch accessibilityLabel="Email me when customers purchase my products" disabled={savingEmail} value={profileQuery.data?.notificationPreferences?.email_seller_sales === true} onValueChange={value => void updateEmailPreference('email_seller_sales', value)} />
      </View>}
      {['seller', 'both'].includes(profileQuery.data?.role ?? '') && <View style={styles.preferenceRow}>
        <View style={styles.rowContent}><Text style={styles.name}>New service bookings</Text><Text style={styles.note}>Get an email when someone requests your service.</Text></View>
        <Switch accessibilityLabel="Email me about new service bookings" disabled={savingEmail} value={profileQuery.data?.notificationPreferences?.email_seller_bookings === true} onValueChange={value => void updateEmailPreference('email_seller_bookings', value)} />
      </View>}
      {error && !editing && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {success === 'preferences' && !editing && <Text style={styles.success} accessibilityRole="alert">Preferences saved.</Text>}
    </View>}
  </ScrollView></SafeAreaView>;
};

const faqs = [
  { question: 'How do I place an order?', answer: 'Add a product to your cart, select an address, and place the order. Payment is not collected in the app.' },
  { question: 'Can I track delivery?', answer: 'Live delivery tracking is not available yet. My Orders shows the status currently held by the backend.' },
];
export const SupportHelp: React.FC = () => {
  const [open, setOpen] = useState<number>();
  return <SafeAreaView style={styles.container} edges={['bottom']}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.heading}>Help & Support</Text>
    {faqs.map((faq, index) => <Pressable key={faq.question} style={styles.row} onPress={() => setOpen(open === index ? undefined : index)} accessibilityRole="button" accessibilityState={{ expanded: open === index }}>
      <View><Text style={styles.name}>{faq.question}</Text>{open === index && <Text style={styles.note}>{faq.answer}</Text>}</View>
    </Pressable>)}
    <Text style={styles.note}>In-app support messaging is not available.</Text>
  </ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { padding: theme.spacing.lg, gap: theme.spacing.md },
  heading: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.white, padding: theme.spacing.md, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm },
  rowContent: { flex: 1 },
  name: { color: theme.colors.ink, fontWeight: '700' },
  note: { color: theme.colors.muted, marginVertical: theme.spacing.xs },
  actions: { flexDirection: 'row', gap: theme.spacing.lg, marginTop: theme.spacing.sm },
  error: { color: theme.colors.error, marginVertical: theme.spacing.sm },
  success: { color: theme.colors.success, marginVertical: theme.spacing.sm },
  preferences: { gap: theme.spacing.sm, marginTop: theme.spacing.lg },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
});
