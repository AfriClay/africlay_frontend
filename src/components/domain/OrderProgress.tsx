import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { theme } from '../../theme';
import { OrderStatus } from '../../types/order';

const steps: Array<{ status: Exclude<OrderStatus, 'cancelled'>; label: string }> = [
  { status: 'pending', label: 'Payment' },
  { status: 'processing', label: 'Processing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'delivered', label: 'Delivered' },
];

export const OrderProgress = ({ status }: { status: OrderStatus }) => {
  if (status === 'cancelled') {
    return <View style={styles.cancelled}><Text style={styles.cancelledText}>This order was cancelled.</Text></View>;
  }
  const activeIndex = steps.findIndex(step => step.status === status);
  return <View style={styles.root} accessibilityLabel={`Order status: ${steps[activeIndex]?.label ?? status}`}>
    {steps.map((step, index) => {
      const complete = index <= activeIndex;
      return <View key={step.status} style={styles.step}>
        <View style={[styles.dot, complete && styles.dotComplete]}>{index < activeIndex ? <Check size={14} color={theme.colors.white} /> : null}</View>
        <Text style={[styles.label, complete && styles.labelComplete]}>{step.label}</Text>
        {index < steps.length - 1 ? <View style={[styles.line, index < activeIndex && styles.lineComplete]} /> : null}
      </View>;
    })}
  </View>;
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  step: { flex: 1, alignItems: 'center', position: 'relative', minWidth: 0 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.border, zIndex: 1 },
  dotComplete: { backgroundColor: theme.colors.primary.DEFAULT },
  label: { marginTop: theme.spacing.xs, color: theme.colors.muted, fontSize: theme.typography.small.fontSize, textAlign: 'center' },
  labelComplete: { color: theme.colors.primary.dark, fontWeight: '700' },
  line: { position: 'absolute', top: 11, left: '50%', width: '100%', height: 2, backgroundColor: theme.colors.border },
  lineComplete: { backgroundColor: theme.colors.primary.DEFAULT },
  cancelled: { marginTop: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.error, borderRadius: theme.radii.md },
  cancelledText: { color: theme.colors.error, fontWeight: '700' },
});
