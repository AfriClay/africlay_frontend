import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CatalogImage } from '../ui/CatalogImage';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { theme } from '../../theme';

export function ProductGallery({ images, name, children }: { images?: string[]; name: string; children?: ReactNode }) {
  const { isExpanded } = useResponsiveLayout();
  const [selected, setSelected] = useState(0);
  const urls = (Array.isArray(images) ? images : []).filter(uri => typeof uri === 'string' && uri.trim());
  const index = Math.min(selected, Math.max(0, urls.length - 1));
  return <View style={styles.gallery}>
    <View style={styles.frame}>
      <CatalogImage uri={urls[index]} label={name} style={isExpanded ? styles.expanded : styles.image} contentFit={isExpanded ? 'contain' : 'cover'} />
      {children}
    </View>
    {urls.length > 1 && <ScrollView horizontal contentContainerStyle={styles.thumbnails}>
      {urls.map((uri, i) => <Pressable key={`${uri}-${i}`} onPress={() => setSelected(i)}
        accessibilityRole="button" accessibilityLabel={`Product image ${i + 1} of ${urls.length}`}
        accessibilityState={{ selected: i === index }} style={[styles.thumbnail, i === index && styles.selected]}>
        <CatalogImage uri={uri} label={`${name}, thumbnail ${i + 1}`} style={styles.preview} contentFit="contain" />
      </Pressable>)}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  gallery: { minWidth: 0, marginBottom: theme.spacing.lg },
  frame: { borderRadius: theme.radii.lg, overflow: 'hidden' },
  image: { width: '100%', height: 300 },
  expanded: { width: '100%', aspectRatio: 1 },
  thumbnails: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs },
  thumbnail: { width: 64, height: 64, padding: theme.spacing.xs, borderWidth: 2, borderColor: theme.colors.border, borderRadius: theme.radii.sm },
  selected: { borderColor: theme.colors.primary.DEFAULT },
  preview: { width: '100%', height: '100%' },
});
