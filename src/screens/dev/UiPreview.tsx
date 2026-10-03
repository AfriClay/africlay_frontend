import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Heart, Search } from 'lucide-react-native';
import { Button, StickyButtonBar } from '../../components/ui/Button';
import { SearchField, SearchTrigger } from '../../components/ui/SearchField';
import { ThemeProvider, useAppTheme } from '../../contexts/ThemeContext';
import { getResponsiveLayout } from '../../contexts/ResponsiveLayoutContext';
import { theme } from '../../theme';

type PreviewState = 'suggestions' | 'results' | 'empty' | 'error';
type PreviewWidth = 360 | 720 | 960;

const PreviewContent = () => {
  const { colors, mode, toggleMode } = useAppTheme();
  const [query, setQuery] = useState('woven basket');
  const [state, setState] = useState<PreviewState>('results');
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>(360);
  const layout = getResponsiveLayout(previewWidth, 720, true);

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <View><Text style={[styles.title, { color: colors.text }]}>UI preview</Text><Text style={[styles.caption, { color: colors.textMuted }]}>Development fixtures only</Text></View>
        <Button size="sm" variant="secondary" onPress={toggleMode}>{mode === 'light' ? 'Dark theme' : 'Light theme'}</Button>
      </View>

      <View style={styles.controls}>
        {([360, 720, 960] as PreviewWidth[]).map(value => <Button key={value} size="sm" variant={previewWidth === value ? 'primary' : 'secondary'} onPress={() => setPreviewWidth(value)}>{value === 360 ? 'Compact' : value === 720 ? 'Medium' : 'Expanded'}</Button>)}
      </View>
      <Text style={[styles.caption, { color: colors.textMuted }]}>isCompact: {String(layout.isCompact)} · columns: {layout.productColumns}</Text>

      <View style={[styles.previewFrame, { maxWidth: previewWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Buttons</Text>
        <View style={styles.buttonGrid}>
          <Button onPress={() => undefined}>Primary</Button>
          <Button variant="secondary" onPress={() => undefined}>Secondary</Button>
          <Button variant="tertiary" onPress={() => undefined}>Tertiary</Button>
          <Button variant="destructive" onPress={() => undefined}>Delete item</Button>
          <Button disabled onPress={() => undefined}>Disabled</Button>
          <Button loading loadingLabel="Saving" onPress={() => undefined}>Save changes</Button>
          <Button status="success" successLabel="Saved" onPress={() => undefined}>Save</Button>
          <Button status="error" errorLabel="Try again" variant="destructive" onPress={() => undefined}>Submit</Button>
          <Button variant="icon" icon={<Heart size={20} color={colors.text} />} accessibilityLabel="Save to wishlist" onPress={() => undefined} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Search</Text>
        <SearchTrigger onPress={() => undefined} />
        <SearchField value={query} onChangeText={setQuery} showCancel onCancel={() => setQuery('')} />
        <View style={styles.controls}>
          {(['suggestions', 'results', 'empty', 'error'] as PreviewState[]).map(value => <Button key={value} size="sm" variant={state === value ? 'primary' : 'secondary'} onPress={() => setState(value)}>{value}</Button>)}
        </View>
        <View style={[styles.fixture, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {state === 'suggestions' ? <><Text style={[styles.fixtureTitle, { color: colors.text }]}>Recent searches</Text><Text style={{ color: colors.textMuted }}>woven basket · ceramic mug</Text></> : null}
          {state === 'results' ? <><Text style={[styles.fixtureTitle, { color: colors.text }]}>Products</Text><View style={styles.fixtureResult}><Search size={18} color={colors.accent} /><View><Text style={{ color: colors.text, fontWeight: '700' }}>Handwoven market basket</Text><Text style={{ color: colors.textMuted }}>KSh 2,800 · In stock</Text></View></View></> : null}
          {state === 'empty' ? <><Text style={[styles.fixtureTitle, { color: colors.text }]}>No matches found</Text><Text style={{ color: colors.textMuted }}>Try another product or seller.</Text></> : null}
          {state === 'error' ? <><Text style={[styles.fixtureTitle, { color: colors.danger }]}>Search is unavailable</Text><Text style={{ color: colors.textMuted }}>Check your connection and retry.</Text><Button size="sm" variant="secondary" onPress={() => setState('results')}>Retry</Button></> : null}
        </View>
      </View>
    </ScrollView>
    <StickyButtonBar><Button fullWidth onPress={() => undefined}>Sticky primary action</Button></StickyButtonBar>
  </View>;
};

export const UiPreview = () => <ThemeProvider><PreviewContent /></ThemeProvider>;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.md },
  title: { fontFamily: 'Inter_800ExtraBold', fontSize: theme.typography.h2.fontSize },
  caption: { fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.xs },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginVertical: theme.spacing.md },
  previewFrame: { width: '100%', alignSelf: 'center', borderWidth: 1, borderRadius: theme.radii.surface, padding: theme.spacing.md, gap: theme.spacing.md },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.h3.fontSize, marginTop: theme.spacing.sm },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' },
  fixture: { minHeight: 112, borderWidth: 1, borderRadius: theme.radii.control, padding: theme.spacing.md, gap: theme.spacing.sm },
  fixtureTitle: { fontFamily: 'Inter_700Bold', fontSize: theme.typography.body.fontSize },
  fixtureResult: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd },
});
