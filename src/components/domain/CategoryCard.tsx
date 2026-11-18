import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { Droplet, Home, Leaf, MoreHorizontal, Scissors, Smartphone, Sparkles, Tag, Wrench, type LucideIcon } from 'lucide-react-native';

interface CategoryCardProps {
  label: string;
  imageUri?: string;
  imageLoading?: boolean;
  onPress: () => void;
}

export const categoryIconMap: Record<string, LucideIcon> = {
  Droplet,
  Home,
  Leaf,
  MoreHorizontal,
  Scissors,
  Smartphone,
  Sparkles,
  Tool: Wrench,
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ label, imageUri, imageLoading, onPress }) => {
  const { isExpanded } = useResponsiveLayout();
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <Pressable style={({ pressed }) => [styles.root, isExpanded && styles.desktopRoot, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${label}`}>
      <View style={[styles.visual, isExpanded && styles.desktopVisual, imageLoading && styles.loadingVisual]}>
        {imageUri && imageUri !== failedUri
          ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" onError={() => setFailedUri(imageUri)} />
          : !imageLoading && <Text style={styles.fallbackInitial}>{label.charAt(0)}</Text>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  root: { width: 72, alignItems: 'center', paddingBottom: theme.spacing.sm },
  desktopRoot: { width: 116, maxWidth: 116 },
  visual: { width: 64, height: 64, borderRadius: theme.radii.pill, backgroundColor: theme.colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  desktopVisual: { width: 116, height: 116 },
  loadingVisual: { backgroundColor: theme.colors.border },
  fallbackInitial: { color: theme.colors.primary.dark, fontSize: 28, fontWeight: '700' },
  label: { textAlign: 'center', color: theme.colors.ink, ...theme.typography.marketplace.label, fontSize: 11, lineHeight: 15, minHeight: 30 },
});
