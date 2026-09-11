import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BadgeCheck, PackagePlus, Store, TrendingUp } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

const benefits = [
  { icon: Store, text: 'Create your own AfriClay storefront' },
  { icon: PackagePlus, text: 'List and manage products from your phone' },
  { icon: TrendingUp, text: 'Receive orders and track your earnings' },
];

export const StartSelling: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isGuest, verificationStatus } = useAuth();

  const start = () => {
    if (isGuest) {
      navigation.getParent()?.getParent()?.navigate('AuthStack');
      return;
    }
    navigation.navigate('KYCUpload');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.icon}><BadgeCheck color={theme.colors.secondary.DEFAULT} size={38} /></View>
        <Text style={styles.title}>Start Selling on AfriClay</Text>
        <Text style={styles.copy}>Reach buyers across Africa with a verified storefront and simple tools for products, orders, and earnings.</Text>
      </View>
      <View style={styles.benefits}>
        {benefits.map(item => {
          const Icon = item.icon;
          return <View key={item.text} style={styles.benefit}><Icon color={theme.colors.primary.DEFAULT} size={22} /><Text style={styles.benefitText}>{item.text}</Text></View>;
        })}
      </View>
      {verificationStatus === 'rejected' ? <Text style={styles.rejected}>Your previous submission needs changes. Submit fresh documents to try again.</Text> : null}
      <Button onPress={start}>{isGuest ? 'Create Account to Sell' : 'Begin Seller Verification'}</Button>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.cream },
  hero: { alignItems: 'center' },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: theme.colors.primary.dark, alignItems: 'center', justifyContent: 'center' },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center', marginTop: theme.spacing.lg },
  copy: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center', marginTop: theme.spacing.sm },
  benefits: { marginVertical: theme.spacing.xl, gap: theme.spacing.md },
  benefit: { minHeight: 54, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.white },
  benefitText: { flex: 1, marginLeft: theme.spacing.md, color: theme.colors.ink },
  rejected: { color: theme.colors.error, marginBottom: theme.spacing.md, textAlign: 'center' },
});
