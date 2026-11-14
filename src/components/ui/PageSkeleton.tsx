import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../../theme';

type Variant = 'marketplace' | 'list' | 'detail' | 'store';

export const PageSkeleton = ({ variant = 'list' }: { variant?: Variant }) => {
  const { width } = useWindowDimensions();
  const compact = width < 600;
  return <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel="Loading page">
    {variant === 'marketplace' && <View style={styles.header}><View style={[styles.block, styles.brand]} /><View style={[styles.block, styles.search]} /></View>}
    <View style={styles.content}>
      {variant === 'detail' || variant === 'store' ? <View style={[styles.block, styles.hero, variant === 'detail' && styles.detailHero]} /> : null}
      {variant === 'marketplace' && <View style={[styles.block, styles.hero]} />}
      <View style={[styles.block, styles.title]} />
      <View style={[styles.block, styles.line]} />
      {variant === 'detail' && <View style={[styles.block, styles.lineShort]} />}
      <View style={styles.grid}>
        {Array.from({ length: variant === 'detail' ? 2 : 4 }).map((_, index) => <View key={index} style={[styles.block, styles.card, { width: compact ? (width < 360 ? '100%' : '48%') : '23%' }]} />)}
      </View>
      <Text style={styles.caption}>Loading...</Text>
    </View>
  </View>;
};

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: theme.colors.cream },
  header: { height: 64, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, backgroundColor: theme.colors.white },
  content: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: theme.spacing.md, gap: theme.spacing.md },
  block: { backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.md },
  brand: { width: 112, height: 34 },
  search: { flex: 1, height: 34 },
  hero: { height: 185 },
  detailHero: { height: 255 },
  title: { width: '55%', height: 28, marginTop: theme.spacing.md },
  line: { width: '82%', height: 18 },
  lineShort: { width: '50%', height: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm },
  card: { height: 190 },
  caption: { color: theme.colors.muted, fontSize: 13 },
});
