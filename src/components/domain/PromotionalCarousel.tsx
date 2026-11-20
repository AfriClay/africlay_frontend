import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { ArrowRight, ImageOff } from 'lucide-react-native';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatCurrency';
import { priceUnitSuffix } from '../../utils/priceUnit';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { useResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';

interface PromotionalCarouselProps {
  products: Product[];
  loading?: boolean;
  onProductPress: (productId: string) => void;
}

export const PromotionalCarousel = ({ products, loading, onProductPress }: PromotionalCarouselProps) => {
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
      {loading ? <View accessibilityLabel="Loading featured products" style={[styles.skeleton, { height: isExpanded ? Math.min(360, Math.max(300, width / 4.5)) : 232 }]} /> : width > 0 && (
        <Animated.ScrollView ref={scroll} testID="promotional-carousel" horizontal snapToInterval={width} snapToAlignment="start"
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
              <Pressable accessibilityRole="button"
                onPress={() => onProductPress(product.id)}
                style={({ pressed }) => [styles.card, { minHeight: isExpanded ? Math.min(360, Math.max(300, width / 4.5)) : 232 }, pressed && styles.pressed]}>
                <View style={[styles.copy, isExpanded && styles.expandedCopy]}>
                  <View>
                    <Text numberOfLines={1} style={styles.eyebrow}>{product.category}</Text>
                    <Text numberOfLines={isExpanded ? 3 : 2} style={[styles.title, isExpanded && styles.expandedTitle]}>{product.name}</Text>
                    <Text numberOfLines={2} style={[styles.price, isExpanded && styles.expandedPrice]}>{product.priceOptions?.length ? 'From ' : ''}{formatCurrency(product.price, product.currency)}{priceUnitSuffix(product.priceUnit)}</Text>
                  </View>
                  <View style={styles.cta}><Text style={styles.ctaText}>View product</Text><ArrowRight size={17} strokeWidth={1.8} color={theme.colors.white} /></View>
                </View>
                <View style={styles.imageArea}>
                  {product.images[0] && !failedImages[product.id] ? (
                    <Image source={{ uri: product.images[0] }} alt={product.imageRecords?.[0]?.altText || product.name} accessibilityLabel={product.imageRecords?.[0]?.altText || product.name} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" transition={reducedMotion ? 0 : 180}
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
  card: { flexDirection: 'row', borderRadius: 24, backgroundColor: theme.colors.secondary.tint, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  pressed: { opacity: 0.94 },
  copy: { width: '56%', padding: theme.spacing.md, justifyContent: 'space-between', alignItems: 'flex-start' },
  expandedCopy: { width: '44%', padding: theme.spacing.xl },
  eyebrow: { color: theme.colors.primary.dark, fontSize: 11, lineHeight: 17, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  title: { color: theme.colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '800', marginBottom: theme.spacing.sm },
  expandedTitle: { fontSize: 34, lineHeight: 41, marginBottom: theme.spacing.md },
  price: { color: theme.colors.secondary.dark, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  expandedPrice: { fontSize: 30, lineHeight: 37 },
  cta: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center', backgroundColor: theme.colors.primary.dark, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.md, minHeight: 46 },
  ctaText: { color: theme.colors.white, fontSize: 14, fontWeight: '700' },
  imageArea: { flex: 1, backgroundColor: theme.colors.white, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', justifyContent: 'center' },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.border },
  dotTrack: { width: 24, height: 6, alignItems: 'center' },
  indicator: { position: 'absolute', width: 24, height: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary.DEFAULT },
  skeleton: { borderRadius: 24, backgroundColor: theme.colors.border, marginBottom: theme.spacing.md },
});
