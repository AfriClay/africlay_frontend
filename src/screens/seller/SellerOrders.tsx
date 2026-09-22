import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import { theme } from '../../theme';

export const SellerOrders: React.FC = () => <SafeAreaView style={styles.container}>
  <View style={styles.content}><EmptyState title="Seller orders unavailable" description="Order management is not available from the backend yet." /></View>
</SafeAreaView>;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { flex: 1, justifyContent: 'center', padding: theme.spacing.lg },
});
