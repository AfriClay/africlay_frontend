import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, SearchX, ShieldX, TriangleAlert } from 'lucide-react-native';
import { MarketplaceBrand } from './MarketplaceBrand';
import { Button } from './Button';
import { theme } from '../../theme';

export type ErrorKind = 'not-found' | 'forbidden' | 'unavailable' | 'unexpected';

type AppErrorPageProps = {
  kind: ErrorKind;
  title: string;
  message: string;
  fullPage?: boolean;
  onRetry?: () => void;
  onBack?: () => void;
  onHome?: () => void;
  homeLabel?: string;
};

export const AppErrorPage = ({ kind, title, message, fullPage = false, onRetry, onBack, onHome, homeLabel = 'Browse marketplace' }: AppErrorPageProps) => {
  const Icon = kind === 'not-found' ? SearchX : kind === 'forbidden' ? ShieldX : kind === 'unexpected' ? TriangleAlert : AlertCircle;
  const content = <View style={[styles.card, !fullPage && styles.inlineCard]}>
    <View style={styles.icon}><Icon size={28} color={theme.colors.primary.dark} /></View>
    <Text style={styles.label}>{kind === 'not-found' ? '404 · PAGE NOT FOUND' : kind === 'forbidden' ? 'ACCESS REQUIRED' : kind === 'unexpected' ? 'SOMETHING WENT WRONG' : 'UNAVAILABLE'}</Text>
    <Text style={styles.title} accessibilityRole="header">{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {(onRetry || onBack || onHome) ? <View style={styles.actions}>
      {onRetry ? <Button onPress={onRetry} accessibilityLabel="Try again">Try again</Button> : null}
      {onBack ? <Button variant={onRetry ? 'outline' : 'primary'} onPress={onBack}>Go back</Button> : null}
      {onHome ? <Button variant={onRetry || onBack ? 'outline' : 'primary'} onPress={onHome}>{homeLabel}</Button> : null}
    </View> : null}
  </View>;

  if (!fullPage) return <View style={styles.inline}>{content}</View>;
  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
    <View style={styles.brand}><MarketplaceBrand compact /></View>
    {content}
  </ScrollView>;
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.cream },
  pageContent: { flexGrow: 1, width: '100%', maxWidth: 780, alignSelf: 'center', justifyContent: 'center', padding: 20, paddingBottom: 48 },
  brand: { alignSelf: 'center', marginBottom: 28 },
  card: { width: '100%', maxWidth: 580, alignSelf: 'center', alignItems: 'center', padding: 30, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  inline: { flex: 1, minHeight: 220, justifyContent: 'center', padding: 16 },
  inlineCard: { padding: 22 },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint },
  label: { marginTop: 17, color: theme.colors.primary.dark, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 10, color: theme.colors.ink, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  message: { maxWidth: 430, marginTop: 10, color: theme.colors.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 26 },
});
