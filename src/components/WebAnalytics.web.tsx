import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { theme } from '../theme';

const PROJECT_ID = 'zg9qfr6s13';
const CONSENT_KEY = 'africlay:clarity-consent:v1';
type Consent = 'accepted' | 'declined' | null;
type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };
type ClarityWindow = Window & { clarity?: Clarity };

const savedConsent = (): Consent => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
};

const startClarity = () => {
  if (document.getElementById('africlay-clarity')) return;
  // Never send marketplace, account, checkout, or operations page text in recordings.
  document.getElementById('root')?.setAttribute('data-clarity-mask', 'true');
  const clarityWindow = window as ClarityWindow;
  clarityWindow.clarity ??= Object.assign(((...args: unknown[]) => {
    const queue = clarityWindow.clarity?.q ?? [];
    queue.push(args);
    if (clarityWindow.clarity) clarityWindow.clarity.q = queue;
  }) as Clarity, { q: [] as unknown[][] });
  clarityWindow.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  const script = document.createElement('script');
  script.id = 'africlay-clarity';
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${PROJECT_ID}`;
  document.head.appendChild(script);
};

export const WebAnalytics = () => {
  const { width } = useWindowDimensions();
  const [consent, setConsent] = useState<Consent>(savedConsent);
  const [open, setOpen] = useState(consent === null);
  useEffect(() => { if (consent === 'accepted') startClarity(); }, [consent]);

  const choose = (choice: Exclude<Consent, null>) => {
    try { window.localStorage.setItem(CONSENT_KEY, choice); } catch { /* Choice lasts until refresh. */ }
    setConsent(choice);
    setOpen(false);
    if (choice === 'declined' && document.getElementById('africlay-clarity')) {
      (window as ClarityWindow).clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
      // Clarity can still record without cookies; reload removes its running script.
      window.location.reload();
    }
  };

  return <View style={[styles.container, { bottom: width < 700 ? 92 : 18 }]} pointerEvents="box-none">
    {open ? <View style={styles.panel} accessibilityRole="alert">
      <Text style={styles.title}>Help improve AfriClay</Text>
      <Text style={styles.copy}>Allow Microsoft Clarity to measure visits and interactions? Page content is masked in recordings. You can change this choice anytime.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => choose('declined')} style={styles.secondary}><Text style={styles.secondaryText}>No thanks</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => choose('accepted')} style={styles.primary}><Text style={styles.primaryText}>Allow analytics</Text></Pressable>
      </View>
    </View> : <Pressable accessibilityRole="button" accessibilityLabel="Analytics privacy choices" onPress={() => setOpen(true)} style={styles.manage}><Text style={styles.manageText}>Privacy choices</Text></Pressable>}
  </View>;
};

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 1000, alignItems: 'flex-start' },
  panel: { width: '100%', maxWidth: 430, backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 12, elevation: 5 },
  title: { color: theme.colors.ink, fontSize: 17, fontWeight: '700' },
  copy: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  primary: { backgroundColor: theme.colors.primary.DEFAULT, borderRadius: 8, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: { borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  secondaryText: { color: theme.colors.ink, fontWeight: '700' },
  manage: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 20, minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
  manageText: { color: theme.colors.muted, fontSize: 12 },
});
