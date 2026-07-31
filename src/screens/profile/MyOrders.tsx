import React from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { OrderCard } from '../../components/domain/OrderCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';

export const MyOrders: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders'], queryFn: () => orderService.fetchOrders() });

  const openOrder = (orderId: string) => navigation.navigate('OrderDetails', { orderId });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      {isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={{ height: 90, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.md }} />
          ))}
        </View>
      ) : (
        <FlatList data={orders} keyExtractor={item => item.id} renderItem={({ item }) => (
          <Pressable onPress={() => openOrder(item.id)} accessibilityRole="button" accessibilityLabel={`Open order ${item.id}`}>
            <OrderCard order={item} onPress={() => openOrder(item.id)} />
          </Pressable>
        )} contentContainerStyle={styles.list} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, margin: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg },
});
