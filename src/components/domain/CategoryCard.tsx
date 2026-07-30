import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import * as Icons from 'lucide-react-native';

interface CategoryCardProps {
  label: string;
  icon: string;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ label, icon, onPress }) => {
  const Icon = (Icons as any)[icon] ?? Icons.Tag;
  return (
    <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Browse ${label}`}>
      <View style={styles.iconBox}>
        <Icon color={theme.colors.primary.dark} size={20} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  root: {
    width: 90,
    height: 110,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  label: {
    textAlign: 'center',
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
  },
});
