import React from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { MessagePreviewCard } from '../../components/domain/MessagePreviewCard';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { BottomSheet } from '../../components/ui/BottomSheet';

export const MessagesList: React.FC = () => {
  const navigation = useNavigation<any>();
  const auth = useAuth();
  const { data: conversations = [] } = useQuery({ queryKey: ['conversations'], queryFn: () => messageService.fetchConversations() });
  const [authSheet, setAuthSheet] = React.useState(false);

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
      <FlatList data={conversations} keyExtractor={item => item.id} renderItem={({ item }) => (
        <Pressable onPress={() => openConversation(item.id, item.name)}>
          <MessagePreviewCard conversation={item} onPress={() => openConversation(item.id, item.name)} />
        </Pressable>
      )} contentContainerStyle={styles.list} />
      <BottomSheet visible={authSheet} onClose={() => setAuthSheet(false)} title="Create a free account to continue" description="Register or log in to message sellers and support." actionLabel="Create Account" onAction={() => { setAuthSheet(false); navigation.navigate('Register'); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, margin: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg },
});
