import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { Conversation } from '../../types/message';
import { Avatar } from '../ui/Avatar';

interface MessagePreviewCardProps {
  conversation: Conversation;
  onPress: () => void;
}

export const MessagePreviewCard: React.FC<MessagePreviewCardProps> = ({ conversation, onPress }) => (
  <Pressable style={styles.root} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open conversation with ${conversation.name}`}>
    <Avatar name={conversation.name} imageUrl={conversation.avatarUrl} />
    <View style={styles.copy}>
      <Text style={styles.name}>{conversation.name}</Text>
      <Text style={styles.message}>{conversation.lastMessage}</Text>
    </View>
    <View style={styles.right}>
      <Text style={styles.time}>{conversation.timestamp}</Text>
      {conversation.unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{conversation.unreadCount}</Text></View> : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  name: {
    color: theme.colors.ink,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  copy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  message: {
    color: theme.colors.muted,
    maxWidth: 200,
  },
  right: {
    alignItems: 'flex-end',
  },
  time: {
    color: theme.colors.muted,
    fontSize: theme.typography.small.fontSize,
    marginBottom: theme.spacing.xs,
  },
  badge: {
    backgroundColor: theme.colors.secondary.DEFAULT,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeText: {
    color: theme.colors.ink,
    fontSize: theme.typography.small.fontSize,
    fontWeight: '700',
  },
});
