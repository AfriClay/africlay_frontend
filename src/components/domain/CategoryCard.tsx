import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { Droplet, Home, Leaf, MoreHorizontal, Scissors, Smartphone, Sparkles, Tag, Wrench, type LucideIcon } from 'lucide-react-native';

interface CategoryCardProps {
  label: string;
  icon: string;
  imageUri?: string;
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

export const CategoryCard: React.FC<CategoryCardProps> = ({ label, icon, imageUri, onPress }) => {
  const { isExpanded } = useResponsiveLayout();
  const [failedUri, setFailedUri] = useState<string>();
  const Icon = categoryIconMap[icon] ?? Tag;
  return (
    <Pressable style={({ pressed }) => [styles.root, isExpanded && styles.desktopRoot, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${label}`}>
      <View style={[styles.visual, isExpanded && styles.desktopVisual]}>
        {imageUri && imageUri !== failedUri ? (
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" onError={() => setFailedUri(imageUri)} />
        ) : <>
          <View style={styles.arc} />
          <Icon color={theme.colors.primary.dark} size={34} strokeWidth={1.4} />
        </>}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  root: { width: 72, alignItems: 'center', paddingBottom: theme.spacing.sm },
  desktopRoot: { width: 116, maxWidth: 116 },
  visual: { width: 64, height: 64, borderRadius: theme.radii.pill, backgroundColor: theme.colors.secondary.tint, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  desktopVisual: { width: 116, height: 116 },
  arc: { position: 'absolute', width: '90%', height: '90%', borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT, bottom: '-35%', right: '-20%' },
  label: { textAlign: 'center', color: theme.colors.ink, ...theme.typography.marketplace.label, fontSize: 11, lineHeight: 15, minHeight: 30 },
});
