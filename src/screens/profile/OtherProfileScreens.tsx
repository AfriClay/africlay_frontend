import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

export const MyAddresses: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>My Addresses</Text>
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.card}><Text style={styles.address}>Kilimani, Nairobi\nKenya</Text></View>
      <View style={styles.card}><Text style={styles.address}>Westlands, Nairobi\nKenya</Text></View>
    </ScrollView>
  </SafeAreaView>
);

export const PaymentMethodsWallet: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Wallet & Payment Methods</Text>
    <View style={styles.card}><Text style={styles.address}>Balance: KSh 12,500\nPending: KSh 1,500</Text></View>
  </SafeAreaView>
);

export const MyReviews: React.FC = () => (
  <SafeAreaView style={styles.container}><Text style={styles.title}>My Reviews</Text><Text style={styles.note}>You have 5 reviews.</Text></SafeAreaView>
);

export const Settings: React.FC = () => (
  <SafeAreaView style={styles.container}><Text style={styles.title}>Settings</Text><Text style={styles.note}>Notifications: On\nLanguage: English\nVersion: 1.0.0</Text></SafeAreaView>
);

export const SupportHelp: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Help & Support</Text>
    <Text style={styles.faqTitle}>How to order</Text>
    <Text style={styles.faqText}>Search, add to cart, and checkout.</Text>
    <Text style={styles.faqTitle}>Delivery</Text>
    <Text style={styles.faqText}>Delivery estimates are shown on product pages.</Text>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, marginBottom: theme.spacing.md },
  list: { paddingBottom: theme.spacing.xl },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  address: { color: theme.colors.ink },
  note: { color: theme.colors.muted },
  faqTitle: { fontWeight: '700', marginTop: theme.spacing.md },
  faqText: { color: theme.colors.muted },
});
