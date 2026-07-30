import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { ChatBubble } from '../../components/domain/ChatBubble';
import { theme } from '../../theme';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { BottomSheet } from '../../components/ui/BottomSheet';

export const ConversationThread: React.FC = () => {
  const route = useRoute<any>();
  const { conversationId, name } = route.params;
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { data: messages = [] } = useQuery({ queryKey: ['messages', conversationId], queryFn: () => messageService.fetchMessages(conversationId) });
  const [text, setText] = useState('');
  const [authSheet, setAuthSheet] = useState(false);

  useEffect(() => {
    // refetch when conversationId changes
  }, [conversationId]);

  const send = async () => {
    if (auth.isGuest) {
      setAuthSheet(true);
      return;
    }
    if (!text.trim()) return;
    await messageService.sendMessage(conversationId, text.trim());
    setText('');
    // simulate auto-reply
    setTimeout(async () => {
    await messageService.sendAutoReply(conversationId, 'Thanks — we will get back to you shortly.');
    queryClient.invalidateQueries(['messages', conversationId] as any);
    }, 1200);
    queryClient.invalidateQueries(['messages', conversationId] as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      <FlatList data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <ChatBubble message={item} />} inverted contentContainerStyle={styles.list} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message..." style={styles.input} accessibilityLabel="Message input" />
          <Pressable onPress={send} style={styles.sendButton} accessibilityRole="button"><Text style={styles.sendText}>Send</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
      <BottomSheet visible={authSheet} onClose={() => setAuthSheet(false)} title="Create a free account to continue" description="Register or log in to message sellers and support." actionLabel="Log In" onAction={() => { setAuthSheet(false); }} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  title: { fontSize: theme.typography.h3.fontSize, fontWeight: '700', color: theme.colors.ink, margin: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg },
  composer: { flexDirection: 'row', padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.white },
  input: { flex: 1, padding: theme.spacing.sm, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginRight: theme.spacing.sm },
  sendButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.md, justifyContent: 'center' },
  sendText: { color: theme.colors.white, fontWeight: '700' },
});
