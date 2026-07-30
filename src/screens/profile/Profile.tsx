import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { useNavigation } from '@react-navigation/native';

export const Profile: React.FC = () => {
  const auth = useAuth();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Avatar name={auth.user?.name ?? 'Guest'} />
        <View style={styles.info}>
          <Text style={styles.name}>{auth.user?.name ?? 'Guest'}</Text>
          <Text style={styles.location}>{auth.user?.location ?? ''}</Text>
          {auth.user?.verified ? <Text style={styles.verified}>Verified User</Text> : null}
        </View>
      </View>
      <ScrollView style={styles.menu}>
        <Text style={styles.link} onPress={() => navigation.navigate('MyOrders')}>My Orders</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Messages')}>Messages</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('MyAddresses')}>My Addresses</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('PaymentMethodsWallet')}>Payment Methods & Wallet</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('MyReviews')}>My Reviews</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Settings')}>Settings</Text>
        <Text style={styles.link} onPress={() => navigation.navigate('SupportHelp')}>Help & Support</Text>
        <Text style={styles.logout} onPress={async () => { await auth.logout(); navigation.reset({ index: 0, routes: [{ name: 'GetStarted' }] }); }}>Logout</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { flexDirection: 'row', padding: theme.spacing.lg, alignItems: 'center' },
  info: { marginLeft: theme.spacing.md },
  name: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  location: { color: theme.colors.muted },
  verified: { marginTop: theme.spacing.xs, color: theme.colors.secondary.DEFAULT, fontWeight: '700' },
  menu: { padding: theme.spacing.lg },
  link: { paddingVertical: theme.spacing.sm, color: theme.colors.ink, fontWeight: '700' },
  logout: { paddingVertical: theme.spacing.sm, color: theme.colors.error, fontWeight: '700', marginTop: theme.spacing.md },
});
