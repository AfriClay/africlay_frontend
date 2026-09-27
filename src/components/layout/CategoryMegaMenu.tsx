import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { CatalogCategory } from '../../services/productService';
import { theme } from '../../theme';
import { rootCategories } from '../../utils/categoryTree';

type Props = {
  categories: CatalogCategory[];
  activeSlug?: string;
  onSelect: (category: CatalogCategory) => void;
};

export const CategoryMegaMenu = ({ categories, activeSlug, onSelect }: Props) => {
  const roots = useMemo(() => rootCategories(categories), [categories]);
  const children = useMemo(() => {
    const grouped = new Map<string, CatalogCategory[]>();
    for (const category of categories) {
      if (!category.parent) continue;
      grouped.set(category.parent, [...(grouped.get(category.parent) ?? []), category]);
    }
    return grouped;
  }, [categories]);
  const [openRootId, setOpenRootId] = useState<string>();
  const [renderedRootId, setRenderedRootId] = useState<string>();
  const reveal = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const renderedRoot = roots.find(root => root.id === renderedRootId);

  const cancelScheduledClose = () => {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = undefined;
  };

  const close = () => {
    cancelScheduledClose();
    setOpenRootId(undefined);
  };

  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => setOpenRootId(undefined), 140);
  };

  const open = (root: CatalogCategory) => {
    cancelScheduledClose();
    if (children.get(root.id)?.length) setOpenRootId(root.id);
  };

  useEffect(() => () => cancelScheduledClose(), []);

  useEffect(() => {
    reveal.stopAnimation();
    if (openRootId) {
      setRenderedRootId(openRootId);
      reveal.setValue(0);
      Animated.timing(reveal, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(reveal, { toValue: 0, duration: 130, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setRenderedRootId(undefined);
    });
  }, [openRootId, reveal]);

  const select = (category: CatalogCategory) => {
    close();
    onSelect(category);
  };

  if (!roots.length) return null;

  return <View style={styles.root} onPointerEnter={cancelScheduledClose} onPointerLeave={scheduleClose}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bar}>
      {roots.map(root => {
        const expanded = openRootId === root.id;
        return <Pressable key={root.id} onHoverIn={() => open(root)} onFocus={() => open(root)} onPress={() => {
          if (!(children.get(root.id)?.length)) select(root);
          else setOpenRootId(current => current === root.id ? undefined : root.id);
        }} accessibilityRole="button" accessibilityLabel={`Browse ${root.label}`} accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.rootButton, (expanded || activeSlug === root.slug) && styles.rootButtonActive, pressed && styles.pressed]}>
          <Text numberOfLines={1} style={[styles.rootLabel, (expanded || activeSlug === root.slug) && styles.rootLabelActive]}>{root.label}</Text>
          <ChevronDown size={15} color={expanded ? theme.colors.white : theme.colors.primary.dark} />
        </Pressable>;
      })}
    </ScrollView>
    {renderedRoot ? <Animated.View pointerEvents={openRootId ? 'auto' : 'none'} style={[styles.panel, {
      opacity: reveal,
      transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
    }]}>
      <View style={styles.panelHeader}>
        <Pressable onPress={() => select(renderedRoot)} accessibilityRole="button" accessibilityLabel={`Shop all ${renderedRoot.label}`} style={styles.shopAll}>
          <Text style={styles.panelTitle}>{renderedRoot.label}</Text><Text style={styles.shopAllText}>Shop all</Text>
        </Pressable>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close category menu" style={styles.close}><X size={20} color={theme.colors.ink} /></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.columns}>
        {(children.get(renderedRoot.id) ?? []).map(branch => <View key={branch.id} style={styles.column}>
          <Pressable onPress={() => select(branch)} accessibilityRole="button" accessibilityLabel={`Browse ${branch.label}`} style={({ pressed }) => [styles.branchButton, pressed && styles.pressed]}>
            <Text style={styles.branchLabel}>{branch.label}</Text>
          </Pressable>
          {(children.get(branch.id) ?? []).map(leaf => <Pressable key={leaf.id} onPress={() => select(leaf)} accessibilityRole="button" accessibilityLabel={`Browse ${leaf.label}`} style={({ pressed }) => [styles.leafButton, pressed && styles.pressed]}>
            <Text style={styles.leafLabel}>{leaf.label}</Text>
          </Pressable>)}
        </View>)}
      </ScrollView>
    </Animated.View> : null}
  </View>;
};

const styles = StyleSheet.create({
  root: { position: 'relative', backgroundColor: theme.colors.white, borderBottomWidth: 1, borderBottomColor: theme.colors.border, zIndex: 30 },
  bar: { minHeight: 48, paddingHorizontal: theme.spacing.md, alignItems: 'center', gap: theme.spacing.xs },
  rootButton: { minHeight: 36, maxWidth: 220, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radii.sm },
  rootButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  rootLabel: { color: theme.colors.primary.dark, fontSize: 14, fontWeight: '700' },
  rootLabelActive: { color: theme.colors.white },
  pressed: { opacity: 0.75 },
  panel: { position: 'absolute', left: theme.spacing.md, right: theme.spacing.md, top: 48, maxHeight: 420, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.sm, elevation: 10, shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  panelHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingLeft: theme.spacing.md },
  shopAll: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  panelTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' },
  shopAllText: { color: theme.colors.primary.DEFAULT, fontWeight: '700' },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  columns: { padding: theme.spacing.md, gap: theme.spacing.lg },
  column: { width: 210, flexShrink: 0 },
  branchButton: { minHeight: 40, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  branchLabel: { color: theme.colors.ink, fontWeight: '800' },
  leafButton: { minHeight: 38, justifyContent: 'center', paddingVertical: theme.spacing.xs },
  leafLabel: { color: theme.colors.muted, fontSize: 14 },
});
