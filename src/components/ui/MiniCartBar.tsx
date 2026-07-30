import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';

interface MiniCartBarProps {
  count: number;
  subtotal: number;
  onPress: () => void;
}

export const MiniCartBar: React.FC<MiniCartBarProps> = ({ count, subtotal, onPress }) => {
  const reduce = useReducedMotionSafe();

  if (reduce) {
    return (
      <View style={styles.root}>
        <Pressable onPress={onPress} style={styles.container} accessibilityRole="button" accessibilityLabel="View cart">
          <Text style={styles.text}>{`${count} items · ${formatCurrency(subtotal)}`}</Text>
          <View style={styles.button}> 
            <Text style={styles.buttonText}>View Cart</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <MotiView
      from={{ translateY: 100, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      transition={{ type: 'timing' }}
      style={styles.root}
    >
      <Pressable onPress={onPress} style={styles.container} accessibilityRole="button" accessibilityLabel="View cart">
        <Text style={styles.text}>{`${count} items · ${formatCurrency(subtotal)}`}</Text>
        <View style={styles.button}> 
          <Text style={styles.buttonText}>View Cart</Text>
        </View>
      </Pressable>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: 90,
    zIndex: 10,
  },
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  text: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  button: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: theme.typography.body.fontSize,
  },
});
