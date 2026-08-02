import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CreditCard, MapPin, Plus, ShieldCheck, Smartphone, WalletCards } from 'lucide-react-native';
import { ReviewCard } from '../../components/domain/ReviewCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Button } from '../../components/ui/Button';
import { reviewService } from '../../services/reviewService';
import { walletService } from '../../services/walletService';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

const addresses = [
  { id: 'address-home', label: 'Home', lines: 'Westlands, Nairobi\nKenya', isDefault: true },
  { id: 'address-work', label: 'Work', lines: 'Kilimani, Nairobi\nKenya', isDefault: false },
];

export const MyAddresses: React.FC = () => {
  const [sheetVisible, setSheetVisible] = useState(false);
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={addresses}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={styles.roundIcon}><MapPin color={theme.colors.primary.DEFAULT} size={20} /></View>
            <View style={styles.cardCopy}><View style={styles.labelRow}><Text style={styles.cardTitle}>{item.label}</Text>{item.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}</View><Text style={styles.note}>{item.lines}</Text></View>
          </View>
        )}
        ListFooterComponent={<Button variant="outline" onPress={() => setSheetVisible(true)}>Add New Address</Button>}
        contentContainerStyle={styles.list}
      />
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title="Address form ready" description="Saved-address editing will connect to the account API when the backend is available." actionLabel="Got it" onAction={() => setSheetVisible(false)} />
    </SafeAreaView>
  );
};

export const PaymentMethodsWallet: React.FC = () => {
  const [sheetVisible, setSheetVisible] = useState(false);
  const { data: wallet, isLoading } = useQuery({ queryKey: ['wallet'], queryFn: walletService.fetchBalance });
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.walletCard}>
          <View style={styles.walletHeading}><WalletCards color={theme.colors.white} size={24} /><Text style={styles.walletLabel}>Available Balance</Text></View>
          <Text style={styles.walletBalance}>{isLoading ? 'Loading…' : formatCurrency(wallet?.balance ?? 0)}</Text>
          <Text style={styles.walletPending}>Pending in escrow: {formatCurrency(wallet?.pending ?? 0)}</Text>
          <Pressable style={styles.topUpButton} onPress={() => setSheetVisible(true)} accessibilityRole="button"><Plus color={theme.colors.ink} size={18} /><Text style={styles.topUpText}>Top Up Wallet</Text></Pressable>
        </View>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentCard}><View style={styles.roundIcon}><Smartphone color={theme.colors.primary.DEFAULT} size={20} /></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>M-Pesa</Text><Text style={styles.note}>+254 ••• ••• 678</Text></View><Text style={styles.defaultBadge}>Primary</Text></View>
        <View style={styles.paymentCard}><View style={styles.roundIcon}><CreditCard color={theme.colors.primary.DEFAULT} size={20} /></View><View style={styles.cardCopy}><Text style={styles.cardTitle}>Visa</Text><Text style={styles.note}>•••• 4242</Text></View></View>
        <View style={styles.securityNote}><ShieldCheck color={theme.colors.success} size={19} /><Text style={styles.securityText}>Payments are encrypted and protected by AfriClay escrow.</Text></View>
      </ScrollView>
      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title="Top up with M-Pesa" description="A secure M-Pesa prompt would be sent to your registered phone number." actionLabel="Send Demo Prompt" onAction={() => setSheetVisible(false)} />
    </SafeAreaView>
  );
};

export const MyReviews: React.FC = () => {
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ['reviews'], queryFn: reviewService.fetchReviews });
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading ? <Text style={styles.loading}>Loading reviews…</Text> : <FlatList data={reviews} keyExtractor={item => item.id} renderItem={({ item }) => <ReviewCard review={item} />} contentContainerStyle={styles.list} />}
    </SafeAreaView>
  );
};

export const Settings: React.FC = () => {
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}><View style={styles.cardCopy}><Text style={styles.cardTitle}>Order updates</Text><Text style={styles.note}>Delivery and payment status</Text></View><Switch value={orderUpdates} onValueChange={setOrderUpdates} trackColor={{ true: theme.colors.primary.DEFAULT, false: theme.colors.border }} /></View>
        <View style={styles.settingRow}><View style={styles.cardCopy}><Text style={styles.cardTitle}>Offers & promotions</Text><Text style={styles.note}>Marketplace deals and new sellers</Text></View><Switch value={promotions} onValueChange={setPromotions} trackColor={{ true: theme.colors.primary.DEFAULT, false: theme.colors.border }} /></View>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.settingRow}><View style={styles.cardCopy}><Text style={styles.cardTitle}>Language</Text><Text style={styles.note}>English</Text></View></View>
        <View style={styles.settingRow}><View style={styles.cardCopy}><Text style={styles.cardTitle}>Version</Text><Text style={styles.note}>1.0.0</Text></View></View>
      </ScrollView>
    </SafeAreaView>
  );
};

const faqs = [
  { id: 'order', question: 'How do I place an order?', answer: 'Choose a product, add it to your cart, confirm your delivery address, and pay securely at checkout.' },
  { id: 'delivery', question: 'How can I track delivery?', answer: 'Open My Orders and select an active order to view its live delivery timeline.' },
  { id: 'escrow', question: 'How does payment protection work?', answer: 'AfriClay holds eligible payments in escrow until delivery is confirmed.' },
];

export const SupportHelp: React.FC = () => {
  const [openId, setOpenId] = useState<string>();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'SupportHelp'>>();
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.supportHero}><Text style={styles.supportTitle}>How can we help?</Text><Text style={styles.note}>Browse common questions or message AfriClay Support.</Text></View>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {faqs.map(faq => {
          const open = openId === faq.id;
          return (
            <Pressable key={faq.id} style={styles.faqCard} onPress={() => setOpenId(open ? undefined : faq.id)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <View style={styles.faqHeading}><Text style={styles.cardTitle}>{faq.question}</Text>{open ? <ChevronUp color={theme.colors.primary.DEFAULT} size={20} /> : <ChevronDown color={theme.colors.muted} size={20} />}</View>
              {open ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
            </Pressable>
          );
        })}
        <Button onPress={() => navigation.getParent()?.navigate('Messages')}>Message Support</Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  list: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  addressCard: { minHeight: 90, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  paymentCard: { minHeight: 72, backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', ...theme.shadows.sm },
  roundIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm },
  cardCopy: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: theme.colors.ink, fontWeight: '800' },
  note: { color: theme.colors.muted, lineHeight: 21, marginTop: 2 },
  defaultBadge: { alignSelf: 'flex-start', color: theme.colors.primary.dark, backgroundColor: theme.colors.primary.tint, borderRadius: theme.radii.pill, paddingHorizontal: theme.spacing.sm, paddingVertical: 2, fontSize: theme.typography.small.fontSize, fontWeight: '700', marginLeft: theme.spacing.sm },
  walletCard: { borderRadius: theme.radii.lg, padding: theme.spacing.lg, backgroundColor: theme.colors.primary.dark, marginBottom: theme.spacing.lg, ...theme.shadows.md },
  walletHeading: { flexDirection: 'row', alignItems: 'center' },
  walletLabel: { color: theme.colors.white, marginLeft: theme.spacing.sm, fontWeight: '700' },
  walletBalance: { color: theme.colors.white, fontSize: 32, fontWeight: '800', marginTop: theme.spacing.lg },
  walletPending: { color: theme.colors.white, opacity: 0.78, marginTop: theme.spacing.xs },
  topUpButton: { minHeight: 44, marginTop: theme.spacing.lg, borderRadius: theme.radii.md, backgroundColor: theme.colors.secondary.DEFAULT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  topUpText: { color: theme.colors.ink, fontWeight: '800', marginLeft: theme.spacing.xs },
  sectionTitle: { color: theme.colors.ink, fontSize: theme.typography.h3.fontSize, fontWeight: '800', marginTop: theme.spacing.md, marginBottom: theme.spacing.xs },
  securityNote: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.tint, marginTop: theme.spacing.md },
  securityText: { flex: 1, marginLeft: theme.spacing.sm, color: theme.colors.primary.dark, fontSize: theme.typography.small.fontSize },
  settingRow: { minHeight: 68, backgroundColor: theme.colors.white, borderRadius: theme.radii.md, paddingHorizontal: theme.spacing.md, flexDirection: 'row', alignItems: 'center' },
  supportHero: { padding: theme.spacing.lg, borderRadius: theme.radii.lg, backgroundColor: theme.colors.primary.tint, marginBottom: theme.spacing.md },
  supportTitle: { color: theme.colors.primary.dark, fontSize: theme.typography.h2.fontSize, fontWeight: '800' },
  faqCard: { padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  faqHeading: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqAnswer: { color: theme.colors.muted, lineHeight: 21, marginTop: theme.spacing.sm },
  loading: { color: theme.colors.muted, padding: theme.spacing.lg },
});
