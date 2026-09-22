import React, { useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AddressInput, SavedAddress } from '../../services/addressService';
import { getApiErrorMessage } from '../../services/api';
import { theme } from '../../theme';

const fields = z.object({
  street_address: z.string().trim().min(5, 'Enter a street address'),
  city: z.string().trim().min(2, 'Enter a city'),
  postal_code: z.string().trim().min(2, 'Enter a postal code'),
  country: z.string().trim().min(2, 'Enter a country'),
});

export function AddressForm({ initial, onSave, onCancel }: {
  initial?: SavedAddress;
  onSave: (input: AddressInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [street, setStreet] = useState(initial?.street_address ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [postal, setPostal] = useState(initial?.postal_code ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [recipient, setRecipient] = useState(initial?.recipient_name ?? '');
  const [phone, setPhone] = useState(initial?.phone_number ?? '');
  const [isDefault, setDefault] = useState(initial?.is_default ?? false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string>();

  const save = async () => {
    if (pending.current) return;
    const parsed = fields.safeParse({ street_address: street, city, postal_code: postal, country });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message); return; }
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await onSave({ ...parsed.data, recipient_name: recipient.trim(), phone_number: phone.trim(),
        is_default: isDefault, address_type: initial?.address_type ?? 'shipping' });
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Unable to save address.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <View style={styles.form}>
    <Input label="Recipient" value={recipient} onChangeText={setRecipient} accessibilityLabel="Recipient" />
    <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" accessibilityLabel="Phone" />
    <Input label="Street address" value={street} onChangeText={setStreet} accessibilityLabel="Street address" />
    <Input label="City" value={city} onChangeText={setCity} accessibilityLabel="City" />
    <Input label="Postal code" value={postal} onChangeText={setPostal} accessibilityLabel="Postal code" />
    <Input label="Country" value={country} onChangeText={setCountry} accessibilityLabel="Country" />
    <View style={styles.defaultRow}><Text style={styles.label}>Default address</Text><Switch value={isDefault} onValueChange={setDefault} /></View>
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <View style={styles.actions}><Button variant="outline" onPress={onCancel} disabled={busy}>Cancel</Button><Button onPress={() => void save()} loading={busy}>Save Address</Button></View>
  </View>;
}

const styles = StyleSheet.create({
  form: { gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  defaultRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: theme.colors.ink },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
  error: { color: theme.colors.error },
});
