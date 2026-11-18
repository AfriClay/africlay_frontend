import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { Droplet, Home, House, Leaf, MonitorSmartphone, MoreHorizontal, Scissors, Shirt, ShoppingBasket, Smartphone, Sparkles, Sprout, Tag, Wrench, type LucideIcon } from 'lucide-react-native';

interface CategoryCardProps {
  label: string;
  icon: string;
  onPress: () => void;
}

export const categoryIconMap: Record<string, LucideIcon> = {
  Droplet,
  Home,
  House,
  Leaf,
  MonitorSmartphone,
  MoreHorizontal,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Sprout,
  Tag,
  Tool: Wrench,
};

const categoryTones: Record<string, { background: string; foreground: string; accent: string }> = {
  MonitorSmartphone: { background: '#E8F2EC', foreground: '#185F18', accent: '#C9E3D0' },
  House: { background: '#FBF0E1', foreground: '#8B4512', accent: '#F0D9B8' },
  Shirt: { background: '#EEEAF4', foreground: '#665079', accent: '#DCD4E8' },
  Sparkles: { background: '#F7E9EE', foreground: '#9A4D6B', accent: '#EDCED9' },
  ShoppingBasket: { background: '#FFF1DD', foreground: '#956015', accent: '#F4DFBB' },
  Sprout: { background: '#EAF1E2', foreground: '#496B2B', accent: '#D4E4C5' },
};

export const CategoryCard: React.FC<CategoryCardProps> = ({ label, icon, onPress }) => {
  const { isExpanded } = useResponsiveLayout();
  const Icon = categoryIconMap[icon] ?? Tag;
  const tone = categoryTones[icon] ?? { background: theme.colors.primary.tint, foreground: theme.colors.primary.dark, accent: '#C9E3D0' };
  return (
    <Pressable style={({ pressed }) => [styles.root, isExpanded && styles.desktopRoot, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${label}`}>
      <View style={[styles.visual, isExpanded && styles.desktopVisual, { backgroundColor: tone.background }]}>
        <View style={[styles.innerRing, isExpanded && styles.desktopInnerRing, { borderColor: tone.accent }]}>
          <Icon color={tone.foreground} size={isExpanded ? 46 : 28} strokeWidth={1.55} />
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  root: { width: 72, alignItems: 'center', paddingBottom: theme.spacing.sm },
  desktopRoot: { width: 116, maxWidth: 116 },
  visual: { width: 64, height: 64, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm },
  desktopVisual: { width: 116, height: 116 },
  innerRing: { width: 48, height: 48, borderRadius: theme.radii.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  desktopInnerRing: { width: 86, height: 86 },
  label: { textAlign: 'center', color: theme.colors.ink, ...theme.typography.marketplace.label, fontSize: 11, lineHeight: 15, minHeight: 30 },
});
