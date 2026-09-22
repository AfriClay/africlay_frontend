import React, { useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatBubble } from '../../components/domain/ChatBubble';
import { ErrorState } from '../../components/ui/ErrorState';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { useAuth } from '../../hooks/useAuth';
import { MessagesStackParamList } from '../../navigation/MessagesStack';
import { getApiErrorMessage } from '../../services/api';
import { messageService } from '../../services/messageService';
import { theme } from '../../theme';
import { Message } from '../../types/message';

export const ConversationThread: React.FC = () => {
  const { params } = useRoute<RouteProp<MessagesStackParamList, 'ConversationThread'>>();
  const conversationId = params?.conversationId ?? '';
  const auth = useAuth();
  const userId = auth.user?.id ?? '';
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['messages', userId, conversationId], queryFn: () => messageService.fetchMessages(conversationId), enabled: Boolean(userId && conversationId) });
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [authSheet, setAuthSheet] = useState(false);
  const busy = useRef(false);
  const listRef = useRef<FlatList<Message>>(null);
  const messages = useMemo(() => [...(query.data ?? [])].sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()), [query.data]);

  const send = async () => {
    if (!userId) { setAuthSheet(true); return; }
    if (!text.trim() || busy.current) return;
    busy.current = true;
    setSending(true);
    setError(undefined);
    try {
      await messageService.sendMessage(conversationId, text.trim());
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['messages', userId, conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    } catch (cause) { setError(getApiErrorMessage(cause, 'Unable to send message.')); }
    finally { busy.current = false; setSending(false); }
  };

  return <SafeAreaView style={styles.container} edges={['bottom']}>
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
      {query.isError ? <ErrorState message="Unable to load this conversation." onRetry={() => void query.refetch()} /> :
        query.isLoading ? <Text style={styles.notice}>Loading messages...</Text> :
        <FlatList ref={listRef} data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={[styles.list, messages.length === 0 && styles.emptyList]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onRefresh={() => void query.refetch()} refreshing={query.isFetching}
          ListEmptyComponent={<Text style={styles.notice}>No messages yet.</Text>} />}
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Write a message..." placeholderTextColor={theme.colors.muted}
          style={styles.input} accessibilityLabel="Message input" returnKeyType="send" onSubmitEditing={() => void send()} />
        <Pressable onPress={() => void send()} disabled={sending || !text.trim() || !userId} style={styles.sendButton}
          accessibilityRole="button" accessibilityState={{ disabled: sending || !text.trim() || !userId }}>
          <Text style={styles.sendText}>{sending ? 'Sending...' : 'Send'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Log in to message sellers." />
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  keyboard: { flex: 1 },
  list: { flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm },
  emptyList: { justifyContent: 'center' },
  composer: { flexDirection: 'row', padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.white },
  input: { flex: 1, minHeight: 48, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, color: theme.colors.ink,
    backgroundColor: theme.colors.cream, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radii.md, marginRight: theme.spacing.sm },
  sendButton: { minWidth: 76, minHeight: 48, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  notice: { color: theme.colors.muted, padding: theme.spacing.lg },
  error: { color: theme.colors.error, padding: theme.spacing.md },
});
