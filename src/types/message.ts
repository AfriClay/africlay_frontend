export interface Message {
  id: string;
  conversationId: string;
  from: string;
  text: string;
  timestamp: string;
  unread?: boolean;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatarUrl?: string;
  recipientId: string;
}
