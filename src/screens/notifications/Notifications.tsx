import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Bell, X } from 'lucide-react-native';

export const Notifications: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Notifications'>>();
  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationService.fetchNotifications() });
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Notifications</Text><Pressable style={styles.closeButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close notifications"><X color={theme.colors.ink} size={22} /></Pressable></View>
      {isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={styles.itemPlaceholder} />
          ))}
        </View>
      ) : (
        <FlatList data={notifications} keyExtractor={item => item.id} renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => item.orderId ? navigation.navigate('AppTabs', { screen: 'Profile', params: { screen: 'OrderDetails', params: { orderId: item.orderId } } }) : undefined} accessibilityRole="button">
            <View style={styles.itemIcon}><Bell color={theme.colors.primary.DEFAULT} size={20} /></View>
            <View style={styles.itemCopy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemBody}>{item.body}</Text><Text style={styles.itemTime}>{item.time}</Text></View>
          </Pressable>
        )} contentContainerStyle={styles.list} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink },
  closeButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: theme.spacing.lg },
  item: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm, flexDirection: 'row', ...theme.shadows.sm },
  itemIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primary.tint, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.sm },
  itemCopy: { flex: 1 },
  itemTitle: { color: theme.colors.ink, fontWeight: '700' },
  itemBody: { color: theme.colors.muted },
  itemTime: { color: theme.colors.muted, fontSize: theme.typography.small.fontSize, marginTop: theme.spacing.xs },
  itemPlaceholder: { height: 72, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginBottom: theme.spacing.sm },
});
