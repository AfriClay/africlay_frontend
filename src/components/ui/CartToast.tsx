import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { theme } from '../../theme';

export function CartToast({ event, bottom = 16 }: { event: number; bottom?: number }) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotionSafe();
  useEffect(() => {
    if (!event) {
      setVisible(false);
      opacity.setValue(0);
      return;
    }
    let active = true;
    setVisible(true);
    const entry = Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 160, useNativeDriver: false });
    entry.start();
    let exit: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(() => {
      exit = Animated.timing(opacity, { toValue: 0, duration: reducedMotion ? 0 : 160, useNativeDriver: false });
      exit.start(({ finished }) => { if (active && finished) setVisible(false); });
    }, 2500);
    return () => { active = false; clearTimeout(timer); entry.stop(); exit?.stop(); };
  }, [event, opacity, reducedMotion]);
  if (!visible) return null;
  return <Animated.View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, { bottom, opacity, pointerEvents: 'none',
    transform: [{ translateY: reducedMotion ? 0 : opacity.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}>
    <Check size={20} color={theme.colors.white} /><Text style={styles.text}>Item added to cart</Text>
  </Animated.View>;
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', maxWidth: '90%', zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md,
    borderRadius: theme.radii.sm, backgroundColor: theme.colors.primary.dark },
  text: { color: theme.colors.white, flexShrink: 1, fontWeight: '600' },
});
