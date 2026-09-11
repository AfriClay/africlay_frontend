import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messageService } from '../../services/messageService';
import { ChatBubble } from '../../components/domain/ChatBubble';
import { theme } from '../../theme';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { GuestAuthSheet } from '../../components/ui/GuestAuthSheet';
import { MessagesStackParamList } from '../../navigation/MessagesStack';

export const ConversationThread: React.FC = () => {
  const route = useRoute<RouteProp<MessagesStackParamList, 'ConversationThread'>>();
  const { conversationId } = route.params;
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
    await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }, 1200);
    await queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <ChatBubble message={item} />} inverted contentContainerStyle={styles.list} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message..." style={styles.input} accessibilityLabel="Message input" />
          <Pressable onPress={send} style={styles.sendButton} accessibilityRole="button"><Text style={styles.sendText}>Send</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
      <GuestAuthSheet visible={authSheet} onClose={() => setAuthSheet(false)} description="Register or log in to message sellers and support." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  list: { paddingHorizontal: theme.spacing.lg },
  composer: { flexDirection: 'row', padding: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.white },
  input: { flex: 1, padding: theme.spacing.sm, backgroundColor: theme.colors.border, borderRadius: theme.radii.md, marginRight: theme.spacing.sm },
  sendButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radii.md, justifyContent: 'center' },
  sendText: { color: theme.colors.white, fontWeight: '700' },
});
