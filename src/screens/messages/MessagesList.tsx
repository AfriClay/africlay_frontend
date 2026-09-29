import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { MessagePreviewCard } from '../../components/domain/MessagePreviewCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MessagesStackParamList } from '../../navigation/MessagesStack';
import { Search } from 'lucide-react-native';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export const MessagesList: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MessagesStackParamList, 'MessagesInbox'>>();
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const conversationsQuery = useQuery({ queryKey: ['conversations', userId], queryFn: () => messageService.fetchConversations(userId), enabled: Boolean(userId) });
  const { data: conversations = [], isLoading } = conversationsQuery;
  const [authSheet, setAuthSheet] = useState(false);
  const [query, setQuery] = useState('');
  const filteredConversations = useMemo(() => conversations.filter(conversation => `${conversation.name} ${conversation.lastMessage}`.toLowerCase().includes(query.toLowerCase())), [conversations, query]);

  const openConversation = (convId: string, name: string) => {
    if (auth.isGuest) {
      setAuthSheet(true);
      return;
    }
    navigation.navigate('ConversationThread', { conversationId: convId, name });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      <View style={styles.searchBar}><Search color={theme.colors.muted} size={18} /><TextInput value={query} onChangeText={setQuery} placeholder="Search messages…" placeholderTextColor={theme.colors.muted} style={styles.searchInput} accessibilityLabel="Search messages" /></View>
      {!userId ? <EmptyState title="Sign in to view messages" description="Conversations belong to your account." /> : conversationsQuery.isError ?
        <ErrorState message="Unable to load conversations." onRetry={() => void conversationsQuery.refetch()} /> : isLoading ? (
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.skeletonRoot}>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonCopy}>
                  <View style={styles.skeletonTitle} />
                  <View style={styles.skeletonText} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList data={filteredConversations} keyExtractor={item => item.id} renderItem={({ item }) => (
          <MessagePreviewCard conversation={item} onPress={() => openConversation(item.id, item.name)} />
        )} ListEmptyComponent={<EmptyState title="No conversations found" description="Conversations with sellers will appear here." />} contentContainerStyle={filteredConversations.length ? styles.list : styles.emptyList} />
      )}

      <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Register or log in to message sellers and support." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, margin: theme.spacing.lg },
  searchBar: { minHeight: 48, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderRadius: theme.radii.lg, backgroundColor: theme.colors.white, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, marginLeft: theme.spacing.sm, color: theme.colors.ink, fontSize: theme.typography.body.fontSize },
  list: { paddingHorizontal: theme.spacing.lg },
  emptyList: { flexGrow: 1, paddingHorizontal: theme.spacing.lg },
  skeletonRoot: { marginBottom: theme.spacing.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center' },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.border },
  skeletonCopy: { marginLeft: theme.spacing.sm, flex: 1 },
  skeletonTitle: { height: 14, width: '40%', backgroundColor: theme.colors.border, borderRadius: theme.radii.sm },
  skeletonText: { height: 12, width: '60%', backgroundColor: theme.colors.border, borderRadius: theme.radii.sm, marginTop: theme.spacing.sm },
});
