import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react-native';
import { CatalogImage } from '../ui/CatalogImage';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { theme } from '../../theme';

export function ProductGallery({ images, imageAlts, name, children }: { images?: string[]; imageAlts?: string[]; name: string; children?: ReactNode }) {
  const { isExpanded } = useResponsiveLayout();
  const reducedMotion = useReducedMotionSafe();
  const [selected, setSelected] = useState(0);
  const [enlarged, setEnlarged] = useState(false);
  const urls = (Array.isArray(images) ? images : []).filter(uri => typeof uri === 'string' && uri.trim());
  const index = Math.min(selected, Math.max(0, urls.length - 1));
  return <View style={styles.gallery}>
    <View style={styles.frame}>
      <Pressable onPress={() => setEnlarged(true)} disabled={!urls.length} accessibilityRole="button"
        accessibilityLabel={`View ${name} image ${index + 1} larger`} accessibilityState={{ disabled: !urls.length }}>
        <CatalogImage uri={urls[index]} label={imageAlts?.[index] || name} style={isExpanded ? styles.expanded : styles.image} contentFit="contain" />
        {urls.length > 0 && <View style={styles.zoomHint}><Expand size={16} color={theme.colors.ink} /><Text style={styles.zoomText}>View photo</Text></View>}
      </Pressable>
      {urls.length > 1 && <Text style={styles.imageCount} accessibilityLabel={`Image ${index + 1} of ${urls.length}`}>{index + 1} / {urls.length}</Text>}
      {children}
    </View>
    {urls.length > 1 && <ScrollView horizontal contentContainerStyle={styles.thumbnails}>
      {urls.map((uri, i) => <Pressable key={`${uri}-${i}`} onPress={() => setSelected(i)}
        accessibilityRole="button" accessibilityLabel={`Product image ${i + 1} of ${urls.length}`}
        accessibilityState={{ selected: i === index }} style={[styles.thumbnail, i === index && styles.selected]}>
        <CatalogImage uri={uri} label={`${imageAlts?.[i] || name}, thumbnail ${i + 1}`} style={styles.preview} contentFit="contain" />
      </Pressable>)}
    </ScrollView>}
    <Modal visible={enlarged} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setEnlarged(false)}>
      <View style={styles.modalBackdrop} accessibilityViewIsModal>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{name}</Text>
            <Pressable onPress={() => setEnlarged(false)} accessibilityRole="button" accessibilityLabel="Close photo viewer" style={styles.modalButton}><X size={22} color={theme.colors.white} /></Pressable>
          </View>
          <CatalogImage uri={urls[index]} label={`${imageAlts?.[index] || name}, image ${index + 1} of ${urls.length}`} style={styles.modalImage} contentFit="contain" />
          {urls.length > 1 && <View style={styles.modalControls}>
            <Pressable onPress={() => setSelected((index + urls.length - 1) % urls.length)} accessibilityRole="button" accessibilityLabel="Previous product photo" style={styles.modalButton}><ChevronLeft size={24} color={theme.colors.white} /></Pressable>
            <Text style={styles.modalCount}>{index + 1} / {urls.length}</Text>
            <Pressable onPress={() => setSelected((index + 1) % urls.length)} accessibilityRole="button" accessibilityLabel="Next product photo" style={styles.modalButton}><ChevronRight size={24} color={theme.colors.white} /></Pressable>
          </View>}
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  gallery: { minWidth: 0, marginBottom: theme.spacing.lg },
  frame: { borderRadius: theme.radii.lg, overflow: 'hidden' },
  zoomHint: { position: 'absolute', top: theme.spacing.smd, right: theme.spacing.smd, backgroundColor: theme.colors.white, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.sm, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  zoomText: { color: theme.colors.ink, fontSize: theme.typography.small.fontSize, fontWeight: '600' },
  image: { width: '100%', height: 300, backgroundColor: theme.colors.white },
  expanded: { width: '100%', aspectRatio: 1, backgroundColor: theme.colors.white },
  imageCount: { position: 'absolute', right: theme.spacing.smd, bottom: theme.spacing.smd, overflow: 'hidden', backgroundColor: theme.colors.white, color: theme.colors.ink, fontSize: theme.typography.small.fontSize, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill },
  thumbnails: { gap: theme.spacing.sm, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.xs },
  thumbnail: { width: 64, height: 64, padding: theme.spacing.xs, borderWidth: 2, borderColor: theme.colors.border, borderRadius: theme.radii.sm },
  selected: { borderColor: theme.colors.primary.DEFAULT },
  preview: { width: '100%', height: '100%' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.88)', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md },
  modalContent: { width: '100%', maxWidth: 1000, height: '90%', gap: theme.spacing.sm },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  modalTitle: { color: theme.colors.white, fontWeight: '700', flex: 1 },
  modalButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalImage: { flex: 1, width: '100%', borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  modalControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xl },
  modalCount: { color: theme.colors.white, fontWeight: '700' },
});
