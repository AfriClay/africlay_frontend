import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Button } from '../ui/Button';
import type { CatalogTag } from '../../services/productService';
import { theme } from '../../theme';

type Props = {
  tags: CatalogTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  relevantCategoryIds?: string[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
  maxSelected?: number;
};

export const TagPicker: React.FC<Props> = ({
  tags,
  selectedIds,
  onChange,
  relevantCategoryIds = [],
  loading = false,
  error = false,
  onRetry,
  disabled = false,
  maxSelected = 5,
}) => {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const relevantIds = useMemo(() => new Set(relevantCategoryIds), [relevantCategoryIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedTags = useMemo(
    () => selectedIds.map(id => tags.find(tag => tag.id === id)).filter((tag): tag is CatalogTag => Boolean(tag)),
    [selectedIds, tags],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const rankedTags = useMemo(() => tags
    .filter(tag => !selectedSet.has(tag.id) && (!normalizedQuery || `${tag.label} ${tag.slug}`.toLowerCase().includes(normalizedQuery)))
    .map(tag => ({
      tag,
      rank: tag.categoryIds.some(id => relevantIds.has(id)) ? 0 : tag.categoryIds.length === 0 ? 1 : 2,
    }))
    .sort((a, b) => a.rank - b.rank || a.tag.label.localeCompare(b.tag.label)),
  [normalizedQuery, relevantIds, selectedSet, tags]);
  const visibleTags = normalizedQuery || showAll
    ? rankedTags.map(item => item.tag)
    : rankedTags.filter(item => item.rank < 2).slice(0, 12).map(item => item.tag);
  const canAdd = selectedIds.length < maxSelected && !disabled;

  if (loading) return <Text style={styles.message}>Loading tags...</Text>;
  if (error) return <View style={styles.failure}>
    <Text style={styles.error}>Unable to load tags.</Text>
    {onRetry ? <Button size="sm" variant="tertiary" onPress={onRetry}>Retry</Button> : null}
  </View>;
  if (!tags.length) return <Text style={styles.message}>No tags are available.</Text>;

  return <View style={styles.container}>
    <View style={styles.headingRow}>
      <Text style={styles.heading}>Tags</Text>
      <Text style={styles.count}>{selectedIds.length}/{maxSelected}</Text>
    </View>
    {selectedTags.length ? <View style={styles.selectedList}>
      {selectedTags.map(tag => <Pressable
        key={tag.id}
        onPress={() => onChange(selectedIds.filter(id => id !== tag.id))}
        disabled={disabled}
        hitSlop={4}
        style={styles.selectedChip}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${tag.label}`}
      >
        <Text style={styles.selectedText}>{tag.label}</Text>
        <X color={theme.colors.white} size={14} />
      </Pressable>)}
    </View> : null}
    <View style={styles.searchField}>
      <Search color={theme.colors.muted} size={18} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        editable={!disabled}
        placeholder="Search tags"
        placeholderTextColor={theme.colors.muted}
        style={styles.searchInput}
        accessibilityLabel="Search tags"
      />
    </View>
    <View style={styles.options}>
      {visibleTags.map(tag => <Pressable
        key={tag.id}
        onPress={() => canAdd && onChange([...selectedIds, tag.id])}
        disabled={!canAdd}
        hitSlop={4}
        style={[styles.optionChip, !canAdd && styles.optionDisabled]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canAdd }}
        accessibilityLabel={`Add ${tag.label}`}
      >
        <Text style={styles.optionText}>{tag.label}</Text>
      </Pressable>)}
    </View>
    {!normalizedQuery && rankedTags.length > visibleTags.length ? <Button size="sm" variant="tertiary" onPress={() => setShowAll(value => !value)}>
      {showAll ? 'Show suggested' : 'Show all tags'}
    </Button> : null}
    {normalizedQuery && !visibleTags.length ? <Text style={styles.message}>No matching tags.</Text> : null}
  </View>;
};

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.md },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.xs },
  heading: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  count: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize },
  selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.sm },
  selectedChip: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.DEFAULT },
  selectedText: { color: theme.colors.white, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  searchField: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: theme.spacing.sm, color: theme.colors.ink },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  optionChip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: theme.spacing.sm, borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  optionDisabled: { opacity: 0.45 },
  optionText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize },
  message: { color: theme.colors.muted, lineHeight: 20, marginBottom: theme.spacing.md },
  failure: { alignItems: 'flex-start', marginBottom: theme.spacing.md },
  error: { color: theme.colors.error, lineHeight: 20 },
});
