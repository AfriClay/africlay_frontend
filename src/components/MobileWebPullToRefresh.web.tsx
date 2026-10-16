import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, Check } from 'lucide-react-native';
import { theme } from '../theme';

const PULL_THRESHOLD = 72;
const MAX_PULL = 104;
const COMPACT_TOUCH_QUERY = '(max-width: 767px) and (hover: none) and (pointer: coarse)';
const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [contenteditable="true"], [role="button"], [role="slider"], [role="dialog"], [data-pull-refresh-ignore]';

const findVerticalScroller = (target: HTMLElement | null) => {
  let node = target;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return document.scrollingElement as HTMLElement | null;
};

const isInsideHorizontalScroller = (target: HTMLElement | null) => {
  let node = target;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1) return true;
    node = node.parentElement;
  }
  return false;
};

export const MobileWebPullToRefresh = () => {
  const client = useQueryClient();
  const [supported, setSupported] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullDistanceRef = useRef(0);
  const gesture = useRef({ tracking: false, vertical: false, startX: 0, startY: 0 });
  const refreshingRef = useRef(false);

  const updatePullDistance = (distance: number) => {
    pullDistanceRef.current = distance;
    setPullDistance(distance);
  };

  useEffect(() => {
    const media = window.matchMedia(COMPACT_TOUCH_QUERY);
    const update = () => setSupported(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const previousOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = 'none';

    const reset = () => {
      gesture.current = { tracking: false, vertical: false, startX: 0, startY: 0 };
      if (!refreshingRef.current) updatePullDistance(0);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || refreshingRef.current) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const scroller = findVerticalScroller(target);
      if (!scroller || scroller.scrollTop > 0 || target?.closest(INTERACTIVE_SELECTOR) || isInsideHorizontalScroller(target)) return;
      const touch = event.touches[0];
      gesture.current = { tracking: true, vertical: false, startX: touch.clientX, startY: touch.clientY };
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!gesture.current.tracking || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - gesture.current.startX);
      const deltaY = touch.clientY - gesture.current.startY;
      if (!gesture.current.vertical) {
        if (Math.max(deltaX, Math.abs(deltaY)) < 8) return;
        if (deltaY <= 0 || deltaX >= Math.abs(deltaY)) {
          reset();
          return;
        }
        gesture.current.vertical = true;
      }
      if (event.cancelable) event.preventDefault();
      updatePullDistance(Math.min(MAX_PULL, deltaY * 0.58));
    };
    const runRefresh = async () => {
      refreshingRef.current = true;
      setRefreshing(true);
      updatePullDistance(PULL_THRESHOLD);
      const minimumVisibleTime = new Promise(resolve => window.setTimeout(resolve, 450));
      try {
        await Promise.all([client.refetchQueries({ type: 'active' }), minimumVisibleTime]);
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
        updatePullDistance(0);
      }
    };
    const onTouchEnd = () => {
      const shouldRefresh = gesture.current.vertical && pullDistanceRef.current >= PULL_THRESHOLD;
      gesture.current = { tracking: false, vertical: false, startX: 0, startY: 0 };
      if (shouldRefresh) void runRefresh();
      else updatePullDistance(0);
    };

    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
    window.addEventListener('touchcancel', reset, { capture: true, passive: true });
    return () => {
      document.documentElement.style.overscrollBehaviorY = previousOverscroll;
      window.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('touchcancel', reset, true);
    };
  }, [client, supported]);

  const ready = pullDistance >= PULL_THRESHOLD;
  const visible = refreshing || pullDistance > 0;
  if (!supported || !visible) return null;
  return <View
    testID="mobile-web-refresh"
    accessibilityLiveRegion="polite"
    accessibilityLabel={refreshing ? 'Refreshing page data' : ready ? 'Release to refresh' : 'Pull to refresh'}
    style={[styles.positioner, { transform: [{ translateY: Math.max(-52, pullDistance - 52) }] }]}
  >
    <View style={styles.pill}>
      {refreshing
        ? <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
        : ready ? <Check size={18} color={theme.colors.primary.DEFAULT} /> : <ArrowDown size={18} color={theme.colors.primary.DEFAULT} />}
      <Text style={styles.label}>{refreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}</Text>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  positioner: { position: 'absolute', top: 8, left: 0, right: 0, zIndex: 5000, alignItems: 'center', pointerEvents: 'none' },
  pill: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  label: { color: theme.colors.ink, fontSize: 14, fontWeight: '700' },
});
