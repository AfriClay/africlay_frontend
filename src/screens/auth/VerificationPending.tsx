import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Clock3, ShieldCheck } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { FormFrame } from '../../components/layout/FormFrame';

export const VerificationPending: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const approveDemo = async () => {
    setLoading(true);
    try {
      await auth.approveSellerVerification();
      if (!auth.user) navigation.navigate('StorefrontSetup');
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Unable to update verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormFrame style={styles.container}>
      <View style={styles.icon}><Clock3 color={theme.colors.secondary.DEFAULT} size={38} /></View>
      <Text style={styles.title}>Verification pending</Text>
      <Text style={styles.copy}>Your documents were submitted successfully. AfriClay will notify you when the review is complete.</Text>
      <View style={styles.notice}><ShieldCheck color={theme.colors.primary.DEFAULT} size={20} /><Text style={styles.noticeText}>Most seller reviews are completed within 24 hours.</Text></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={approveDemo} loading={loading}>Approve for Demo Testing</Button>
      <Text style={styles.demoNote}>Demo control: simulates the approval webhook so you can test storefront and seller tools.</Text>
    </FormFrame>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center', backgroundColor: theme.colors.cream },
  icon: { width: 76, height: 76, borderRadius: 38, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary.tint },
  title: { marginTop: theme.spacing.lg, color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center' },
  copy: { color: theme.colors.muted, lineHeight: 22, textAlign: 'center', marginTop: theme.spacing.sm },
  notice: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.primary.tint, marginVertical: theme.spacing.xl },
  noticeText: { flex: 1, marginLeft: theme.spacing.sm, color: theme.colors.primary.dark },
  demoNote: { marginTop: theme.spacing.sm, color: theme.colors.muted, fontSize: theme.typography.small.fontSize, textAlign: 'center' },
  error: { color: theme.colors.error, marginBottom: theme.spacing.md, textAlign: 'center' },
});
