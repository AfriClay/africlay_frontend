import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';

export const Notifications: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationService.fetchNotifications() });
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList data={notifications} keyExtractor={item => item.id} renderItem={({ item }) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemBody}>{item.body}</Text>
        </View>
      )} contentContainerStyle={styles.list} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, margin: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg },
  item: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.sm, ...theme.shadows.sm },
  itemTitle: { color: theme.colors.ink, fontWeight: '700' },
  itemBody: { color: theme.colors.muted },
});
