import { Conversation, Message } from '../types/message';

export const conversations: Conversation[] = [
  {
    id: 'conv-zuri',
    name: 'Zuri Crafts',
    lastMessage: 'Thank you! Your order will be…',
    timestamp: '09:34',
    unreadCount: 1,
    recipientId: 'seller-zuri',
  },
  {
    id: 'conv-support',
    name: 'AfriClay Support',
    lastMessage: 'Hello! How can we help you?',
    timestamp: '08:12',
    unreadCount: 0,
    recipientId: 'support',
  },
  {
    id: 'conv-john',
    name: 'John M.',
    lastMessage: 'Is the item still available?',
    timestamp: 'Yesterday',
    unreadCount: 0,
    recipientId: 'john-m',
  },
  {
    id: 'conv-grace',
    name: 'Grace W.',
    lastMessage: 'Okay, thank you ??',
    timestamp: '2d',
    unreadCount: 0,
    recipientId: 'grace-w',
  },
  {
    id: 'conv-movers',
    name: 'Best Movers',
    lastMessage: 'We have received your booking',
    timestamp: '3d',
    unreadCount: 0,
    recipientId: 'best-movers',
  },
];

export const messages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-zuri',
    from: 'Zuri Crafts',
    text: 'Thank you! Your order will be dispatched by tomorrow.',
    timestamp: '09:34',
    unread: true,
  },
  {
    id: 'msg-2',
    conversationId: 'conv-zuri',
    from: 'You',
    text: 'Great, thank you. Can I get a tracking update later?',
    timestamp: '09:31',
  },
  {
    id: 'msg-3',
    conversationId: 'conv-support',
    from: 'AfriClay Support',
    text: 'Hello! How can we help you?',
    timestamp: '08:12',
  },
];
