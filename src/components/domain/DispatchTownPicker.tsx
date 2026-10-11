import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, MapPin, Search, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import { theme } from '../../theme';

type Props = {
  towns: string[];
  value: string;
  onChange: (town: string) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
};

export const DispatchTownPicker: React.FC<Props> = ({
  towns,
  value,
  onChange,
  loading = false,
  error = false,
  onRetry,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredTowns = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? towns.filter(town => town.toLowerCase().includes(normalized)) : towns;
  }, [query, towns]);
  const blocked = disabled || loading || error || !towns.length;
  const close = () => { setOpen(false); setQuery(''); };

  return <View style={styles.root}>
    <Text style={styles.label}>Dispatch town</Text>
    <Pressable
      onPress={() => !blocked && setOpen(true)}
      disabled={blocked}
      style={({ pressed }) => [styles.field, value && styles.selectedField, blocked && styles.disabled, pressed && !blocked && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Choose dispatch town"
      accessibilityState={{ disabled: blocked, expanded: open }}
    >
      <MapPin color={value ? theme.colors.primary.DEFAULT : theme.colors.muted} size={20} />
      <Text numberOfLines={1} style={[styles.value, !value && styles.placeholder]}>
        {value || (loading ? 'Loading towns...' : 'Choose the parcel pickup town')}
      </Text>
      <ChevronDown color={theme.colors.muted} size={20} />
    </Pressable>
    <Text style={styles.help}>Delivery fees are calculated from this town to the buyer.</Text>
    {error ? <View style={styles.errorRow}>
      <Text style={styles.error}>Unable to load dispatch towns.</Text>
      {onRetry ? <Button size="sm" variant="tertiary" onPress={onRetry}>Retry</Button> : null}
    </View> : null}

    <Modal transparent animationType="slide" visible={open} onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close dispatch town picker" />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.title}>Dispatch town</Text>
              <Text style={styles.subtitle}>Where parcels are handed over for delivery</Text>
            </View>
            <Button variant="icon" size="sm" icon={<X color={theme.colors.ink} size={21} />} onPress={close} accessibilityLabel="Close" />
          </View>
          <View style={styles.searchField}>
            <Search color={theme.colors.muted} size={19} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search towns"
              placeholderTextColor={theme.colors.muted}
              autoCorrect={false}
              style={styles.searchInput}
              accessibilityLabel="Search dispatch towns"
            />
          </View>
          <FlatList
            data={filteredTowns}
            keyExtractor={item => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <Pressable
              onPress={() => { onChange(item); close(); }}
              style={({ pressed }) => [styles.option, item === value && styles.optionSelected, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected: item === value }}
            >
              <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>{item}</Text>
            </Pressable>}
            ListEmptyComponent={<Text style={styles.empty}>No matching town.</Text>}
          />
        </SafeAreaView>
      </View>
    </Modal>
  </View>;
};

const styles = StyleSheet.create({
  root: { marginBottom: theme.spacing.md },
  label: { marginBottom: theme.spacing.xs, color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  field: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  selectedField: { borderColor: theme.colors.primary.DEFAULT },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  value: { flex: 1, minWidth: 0, color: theme.colors.ink },
  placeholder: { color: theme.colors.muted },
  help: { marginTop: theme.spacing.xs, color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: 18 },
  errorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { flex: 1, color: theme.colors.error, fontSize: theme.typography.small.fontSize },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,13,13,0.45)' },
  sheet: { maxHeight: '78%', minHeight: '58%', padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderTopLeftRadius: theme.radii.lg, borderTopRightRadius: theme.radii.lg },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800' },
  subtitle: { marginTop: theme.spacing.xs, color: theme.colors.muted, fontSize: theme.typography.small.fontSize },
  searchField: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.cream },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: theme.spacing.sm, color: theme.colors.ink },
  list: { paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.lg },
  option: { minHeight: 46, justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  optionSelected: { backgroundColor: theme.colors.primary.tint, borderBottomColor: theme.colors.primary.tint },
  optionText: { color: theme.colors.ink },
  optionTextSelected: { color: theme.colors.primary.dark, fontWeight: '800' },
  empty: { padding: theme.spacing.lg, color: theme.colors.muted, textAlign: 'center' },
});
