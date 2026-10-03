import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Search } from '../../screens/search/Search';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenProduct: (productId: string) => void;
  onOpenSeller: (sellerId: string) => void;
};

export const CompactSearchPanel: React.FC<Props> = ({ visible, onClose, onOpenProduct, onOpenSeller }) => {
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotionSafe();
  const translateY = useSharedValue(Math.max(height, 1));
  const [mounted, setMounted] = useState(visible);
  const [presented, setPresented] = useState(visible);
  const [focusRequest, setFocusRequest] = useState(0);

  const requestFocus = useCallback(() => setFocusRequest(value => value + 1), []);
  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setPresented(true);
    }
    if (reduceMotion) {
      translateY.value = visible ? 0 : Math.max(height, 1);
      if (visible) requestFocus();
      else setPresented(false);
      return;
    }
    translateY.value = withTiming(visible ? 0 : Math.max(height, 1), {
      duration: visible ? 220 : 180,
    }, finished => {
      if (!finished) return;
      if (visible) runOnJS(requestFocus)();
      else runOnJS(setPresented)(false);
    });
  }, [height, reduceMotion, requestFocus, translateY, visible]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [close, visible]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const openProduct = (productId: string) => {
    close();
    onOpenProduct(productId);
  };
  const openSeller = (sellerId: string) => {
    close();
    onOpenSeller(sellerId);
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityViewIsModal={visible}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      aria-hidden={!visible}
      style={[styles.panel, !presented && styles.hidden, animatedStyle]}
    >
      <View style={styles.content}>
        {mounted ? <Search presentation="overlay" focusRequest={focusRequest} onDismiss={close} onOpenProduct={openProduct} onOpenSeller={openSeller} /> : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1200,
    elevation: 1200,
  },
  content: { flex: 1 },
  hidden: { display: 'none' },
});
