import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Message } from '../../types/message';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isOwn = message.from === 'You';
  return (
    <View style={[styles.root, isOwn ? styles.own : styles.other]}>
      <Text style={styles.text}>{message.text}</Text>
      <Text style={styles.timestamp}>{new Date(message.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    maxWidth: '80%',
    padding: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.sm,
  },
  own: {
    backgroundColor: theme.colors.primary.DEFAULT,
    alignSelf: 'flex-end',
  },
  other: {
    backgroundColor: theme.colors.secondary.tint,
    alignSelf: 'flex-start',
  },
  text: {
    color: theme.colors.ink,
    fontSize: theme.typography.body.fontSize,
  },
  timestamp: {
    marginTop: theme.spacing.xs,
    color: theme.colors.muted,
    fontSize: theme.typography.small.fontSize,
    textAlign: 'right',
  },
});
