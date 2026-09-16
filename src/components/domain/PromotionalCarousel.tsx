import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ArrowRight, ImageOff } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { theme } from '../../theme';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatCurrency';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

interface PromotionalCarouselProps {
  products: Product[];
  loading?: boolean;
  onProductPress: (productId: string) => void;
}

export const PromotionalCarousel = ({ products, loading, onProductPress }: PromotionalCarouselProps) => {
  const { fontScale } = useWindowDimensions();
  const { isExpanded, isWeb } = useResponsiveLayout();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const scroll = useRef<ScrollView>(null);
  const activeRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotionSafe();
  const count = products.length;

  useEffect(() => {
    const next = Math.min(activeRef.current, Math.max(0, count - 1));
    activeRef.current = next;
    setActive(next);
    scrollX.setValue(next * width);
    scroll.current?.scrollTo({ x: next * width, animated: false });
  }, [width, count, scrollX]);

  if (!loading && !count) return null;
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {loading ? <View accessibilityLabel="Loading featured products" style={styles.skeleton} /> : width > 0 && (
        <Animated.ScrollView ref={scroll} horizontal snapToInterval={width} snapToAlignment="start"
          decelerationRate="fast" disableIntervalMomentum directionalLockEnabled bounces={false} overScrollMode="never"
          showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: !isWeb })}
          onMomentumScrollEnd={event => {
            const next = Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.x / width)));
            activeRef.current = next;
            setActive(next);
          }}>
          {products.map(product => (
            <View key={product.id} style={{ width, paddingHorizontal: theme.spacing.xs }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Shop ${product.name}, ${formatCurrency(product.price)}`}
                onPress={() => onProductPress(product.id)}
                style={({ pressed }) => [styles.card, { minHeight: (isExpanded ? Math.min(400, Math.max(260, width / 2.8)) : Math.max(196, width / 1.85)) * Math.max(1, fontScale) }, pressed && styles.pressed]}>
                <View style={styles.copy}>
                  <Text style={styles.eyebrow}>{product.category}</Text>
                  <Text style={styles.title}>{product.name}</Text>
                  <Text style={styles.price}>{formatCurrency(product.price)}</Text>
                  <View style={styles.cta}><Text style={styles.ctaText}>Shop now</Text><ArrowRight size={16} strokeWidth={1.8} color={theme.colors.white} /></View>
                </View>
                <View style={styles.imageArea}>
                  {product.images[0] && !failedImages[product.id] ? (
                    <Image source={{ uri: product.images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" transition={reducedMotion ? 0 : 180}
                      onError={() => setFailedImages(current => ({ ...current, [product.id]: true }))} />
                  ) : <ImageOff size={36} strokeWidth={1.5} color={theme.colors.primary.DEFAULT} />}
                </View>
              </Pressable>
            </View>
          ))}
        </Animated.ScrollView>
      )}
      {count > 1 && width > 0 && !loading && <View style={styles.pagination}>
        {products.map((product, index) => <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Show ${product.name}, ${index + 1} of ${count}`} accessibilityState={{ selected: index === active }}
          onPress={() => {
            activeRef.current = index;
            setActive(index);
            scroll.current?.scrollTo({ x: index * width, animated: !reducedMotion });
          }} style={styles.dotTarget}>
          <View style={styles.dotTrack}>
            <View style={styles.dot} />
            <Animated.View style={[styles.indicator, reducedMotion ? { opacity: index === active ? 1 : 0 } : {
              opacity: scrollX.interpolate({ inputRange: [(index - 1) * width, index * width, (index + 1) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
              transform: [{ scaleX: scrollX.interpolate({ inputRange: [(index - 1) * width, index * width, (index + 1) * width], outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' }) }],
            }]} />
          </View>
        </Pressable>)}
      </View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: theme.radii.lg, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  pressed: { opacity: 0.88 },
  copy: { width: '51%', padding: theme.spacing.md, justifyContent: 'center', alignItems: 'flex-start' },
  eyebrow: { ...theme.typography.marketplace.eyebrow, color: theme.colors.primary.DEFAULT, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  title: { ...theme.typography.marketplace.heading, color: theme.colors.ink, marginBottom: theme.spacing.sm },
  price: { ...theme.typography.marketplace.promotion, color: theme.colors.primary.dark, marginBottom: theme.spacing.md },
  cta: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', backgroundColor: theme.colors.primary.dark, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.md, minHeight: 44 },
  ctaText: { ...theme.typography.marketplace.label, color: theme.colors.white },
  imageArea: { flex: 1, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center' },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.border },
  dotTrack: { width: 24, height: 6, alignItems: 'center' },
  indicator: { position: 'absolute', width: 24, height: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.DEFAULT },
  skeleton: { height: 196, borderRadius: theme.radii.lg, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
});
