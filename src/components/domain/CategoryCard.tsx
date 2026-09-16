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
  const { isExpanded, isWide } = useResponsiveLayout();
  const [failedUri, setFailedUri] = useState<string>();
  const Icon = categoryIconMap[icon] ?? Tag;
  return (
    <Pressable style={({ pressed }) => [styles.root, isExpanded && { width: isWide ? '11%' : '22%', maxWidth: 120 }, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${label}`}>
      <View style={styles.visual}>
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
  root: { width: '23%', alignItems: 'center', paddingBottom: theme.spacing.sm },
  visual: { width: '100%', aspectRatio: 1, borderRadius: theme.radii.pill, backgroundColor: theme.colors.secondary.tint, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border },
  arc: { position: 'absolute', width: '90%', height: '90%', borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.secondary.DEFAULT, bottom: '-35%', right: '-20%' },
  label: { textAlign: 'center', color: theme.colors.ink, ...theme.typography.marketplace.label, minHeight: 34 },
});
