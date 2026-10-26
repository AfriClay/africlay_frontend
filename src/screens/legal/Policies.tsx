import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertCircle, BookOpenCheck, ChevronDown, ChevronRight, ChevronUp, Download, ShieldCheck, Truck, WalletCards } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getPolicy, policies, type PolicyDocument, type PolicySection } from '../../content/policies';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { theme } from '../../theme';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Policies'>;
type PolicyRoute = RouteProp<RootStackParamList, 'Policies'>;

const policyIcons = {
  'partner-terms': ShieldCheck,
  'shipping-and-delivery': Truck,
  'seller-commission': WalletCards,
} as const;

const sectionText = (section: PolicySection) => section.blocks.map(block => block.kind === 'table'
  ? block.rows.flat().join(' ')
  : block.text).join(' ');

const PolicyCard = ({ policy, onPress }: { policy: PolicyDocument; onPress: () => void }) => {
  const Icon = policyIcons[policy.id];
  return <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={`Read ${policy.title}`}
    style={({ pressed }) => [styles.policyCard, pressed && styles.pressed]}>
    <View style={styles.cardIcon}><Icon size={22} color={theme.colors.primary.dark} /></View>
    <View style={styles.cardCopy}>
      <Text style={styles.audience}>{policy.audience}</Text>
      <Text style={styles.cardTitle}>{policy.title}</Text>
      <Text style={styles.summary}>{policy.summary}</Text>
      {policy.version ? <Text style={styles.version}>{policy.version}</Text> : null}
    </View>
    <ChevronRight size={21} color={theme.colors.muted} />
  </Pressable>;
};

const PolicyTable = ({ rows }: { rows: string[][] }) => <View style={styles.table} accessibilityRole="summary">
  {rows.map((row, rowIndex) => {
    const header = rowIndex === 0 && row.some(cell => /sale price|seller share|africlay market/i.test(cell));
    return <View key={`${rowIndex}-${row.join('-')}`} style={[styles.tableRow, header && styles.tableHeader]}>
      {row.map((cell, cellIndex) => <Text key={`${cellIndex}-${cell}`} style={[styles.tableCell, cellIndex === 0 && styles.tableLead, header && styles.tableHeaderText]}>{cell}</Text>)}
    </View>;
  })}
</View>;

const PolicySectionView = ({ section, expanded, onToggle }: { section: PolicySection; expanded: boolean; onToggle: () => void }) => <View style={styles.section}>
  <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}>
    <Text style={styles.sectionTitle}>{section.title}</Text>
    {expanded ? <ChevronUp size={20} color={theme.colors.primary.dark} /> : <ChevronDown size={20} color={theme.colors.primary.dark} />}
  </Pressable>
  {expanded ? <View style={styles.sectionBody}>{section.blocks.map((block, index) => block.kind === 'table'
    ? <PolicyTable key={`table-${index}`} rows={block.rows} />
    : block.kind === 'bullet'
      ? <View key={`bullet-${index}`} style={styles.bulletRow}><Text style={styles.bulletMark}>•</Text><Text style={styles.bodyText}>{block.text}</Text></View>
      : <Text key={`paragraph-${index}`} style={styles.bodyText}>{block.text}</Text>)}</View> : null}
</View>;

export const Policies = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<PolicyRoute>();
  const policy = getPolicy(route.params?.policyId);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setQuery('');
    setExpanded(new Set([0]));
  }, [policy?.id]);

  const matchingSections = useMemo(() => {
    if (!policy) return [];
    const needle = query.trim().toLowerCase();
    return policy.sections.map((section, index) => ({ section, index })).filter(({ section }) => !needle || `${section.title} ${sectionText(section)}`.toLowerCase().includes(needle));
  }, [policy, query]);

  const setAll = (open: boolean) => setExpanded(open && policy ? new Set(policy.sections.map((_, index) => index)) : new Set());
  const downloadSource = () => {
    if (policy) void Linking.openURL(`https://www.africlaymarket.com${policy.downloadPath}`);
  };
  const toggle = (index: number) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    return next;
  });

  if (!policy) return <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView testID="policies-scroll" style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}><BookOpenCheck size={30} color={theme.colors.primary.dark} /></View>
        <Text style={styles.title}>Terms & Policies</Text>
        <Text style={styles.lead}>Clear rules for buying, selling, delivery, and marketplace settlements. These documents are public and can be reviewed without an account.</Text>
      </View>
      <View style={styles.policyList}>{policies.map(item => <PolicyCard key={item.id} policy={item} onPress={() => navigation.push('Policies', { policyId: item.id })} />)}</View>
    </ScrollView>
  </SafeAreaView>;

  const searching = Boolean(query.trim());
  return <SafeAreaView style={styles.container} edges={['bottom']}>
    <ScrollView testID="policies-scroll" style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>TERMS & POLICIES</Text>
      <Text style={styles.title}>{policy.title}</Text>
      <Text style={styles.subtitle}>{policy.subtitle}</Text>
      <View style={styles.metaRow}><Text style={styles.meta}>{policy.audience}</Text>{policy.version ? <Text style={styles.meta}>{policy.version}</Text> : null}</View>
      <Text style={styles.lead}>{policy.summary}</Text>
      <View style={styles.download}><Button size="sm" variant="secondary" icon={<Download size={18} color={theme.colors.primary.dark} />} onPress={downloadSource}>Download source document</Button></View>
      {policy.hasPlaceholders ? <View style={styles.warning}><AlertCircle size={20} color={theme.colors.warning} /><Text style={styles.warningText}>This partner agreement template contains bracketed commercial fields that must be completed in the signed agreement.</Text></View> : null}

      <View style={styles.highlights}>
        <Text style={styles.highlightsTitle}>Key points</Text>
        {policy.highlights.map(item => <View key={item} style={styles.bulletRow}><Text style={styles.bulletMark}>•</Text><Text style={styles.bodyText}>{item}</Text></View>)}
      </View>

      <View style={styles.searchBlock}>
        <Input label="Search this policy" value={query} onChangeText={setQuery} placeholder="Search sections or wording" accessibilityLabel={`Search ${policy.title}`} />
        <View style={styles.controls}>
          <Button size="sm" variant="secondary" onPress={() => setAll(true)}>Expand all</Button>
          <Button size="sm" variant="tertiary" onPress={() => setAll(false)}>Collapse all</Button>
        </View>
      </View>

      <View style={styles.sections}>
        {matchingSections.map(({ section, index }) => <PolicySectionView key={`${index}-${section.title}`} section={section} expanded={searching || expanded.has(index)} onToggle={() => toggle(index)} />)}
        {!matchingSections.length ? <Text style={styles.empty}>No policy sections match “{query.trim()}”.</Text> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: theme.colors.cream },
  scroll: { flex: 1, minHeight: 0 },
  content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  hero: { maxWidth: 720, marginBottom: theme.spacing.xl },
  heroIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.sm, marginBottom: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h1.fontSize, lineHeight: theme.typography.h1.lineHeight, fontWeight: '800' },
  subtitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, lineHeight: theme.typography.h3.lineHeight, fontWeight: '700', marginTop: theme.spacing.xs },
  lead: { maxWidth: 760, color: theme.colors.muted, fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight, marginTop: theme.spacing.smd },
  eyebrow: { color: theme.colors.primary.dark, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.2, marginBottom: theme.spacing.xs },
  policyList: { gap: theme.spacing.smd },
  policyCard: { minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md },
  cardIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.sm },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, lineHeight: theme.typography.h3.lineHeight, fontWeight: '800', marginTop: 2 },
  summary: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight, marginTop: theme.spacing.xs },
  audience: { color: theme.colors.primary.dark, fontSize: 11, lineHeight: 16, fontWeight: '700', textTransform: 'uppercase' },
  version: { color: theme.colors.muted, fontSize: 12, marginTop: theme.spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.smd },
  meta: { color: theme.colors.primary.dark, backgroundColor: theme.colors.primary.tint, paddingHorizontal: theme.spacing.smd, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, fontSize: theme.typography.small.fontSize, fontWeight: '700' },
  download: { alignItems: 'flex-start', marginTop: theme.spacing.md },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginTop: theme.spacing.lg, paddingVertical: theme.spacing.smd, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.secondary.DEFAULT },
  warningText: { flex: 1, color: theme.colors.warning, lineHeight: 20 },
  highlights: { marginTop: theme.spacing.xl, paddingVertical: theme.spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  highlightsTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginBottom: theme.spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm, marginVertical: 3 },
  bulletMark: { width: 12, color: theme.colors.primary.DEFAULT, fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight, fontWeight: '800' },
  bodyText: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.body.fontSize, lineHeight: theme.typography.body.lineHeight },
  searchBlock: { marginTop: theme.spacing.xl },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: -theme.spacing.xs },
  sections: { marginTop: theme.spacing.lg },
  section: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  sectionHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.smd },
  sectionTitle: { flex: 1, color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, lineHeight: theme.typography.h3.lineHeight, fontWeight: '800' },
  sectionBody: { gap: theme.spacing.smd, paddingBottom: theme.spacing.lg },
  table: { borderWidth: 1, borderColor: theme.colors.border },
  tableRow: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.white },
  tableHeader: { backgroundColor: theme.colors.primary.dark },
  tableCell: { flexGrow: 1, flexBasis: 180, minWidth: 0, padding: theme.spacing.smd, color: theme.colors.ink, fontSize: theme.typography.small.fontSize, lineHeight: theme.typography.small.lineHeight },
  tableLead: { fontWeight: '700' },
  tableHeaderText: { color: theme.colors.white, fontWeight: '800' },
  empty: { color: theme.colors.muted, paddingVertical: theme.spacing.xl, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
