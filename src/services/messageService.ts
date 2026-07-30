import { conversations, messages } from '../mock/messages';
import { Conversation, Message } from '../types/message';
import { simulateNetwork } from './api';

let chatMessages = [...messages];

export const messageService = {
  fetchConversations: async (): Promise<Conversation[]> => {
    return simulateNetwork(conversations);
  },
  fetchMessages: async (conversationId: string): Promise<Message[]> => {
    const thread = chatMessages.filter(item => item.conversationId === conversationId);
    return simulateNetwork(thread);
  },
  sendMessage: async (conversationId: string, text: string): Promise<Message> => {
    const message: Message = {
      id: `msg-${Date.now()}`,
      conversationId,
      from: 'You',
      text,
      timestamp: new Date().toISOString(),
    };
    chatMessages = [...chatMessages, message];
    return simulateNetwork(message);
  },
  sendAutoReply: async (conversationId: string, text: string): Promise<Message> => {
    const reply: Message = {
      id: `msg-${Date.now()}-reply`,
      conversationId,
      from: 'AfriClay Support',
      text,
      timestamp: new Date().toISOString(),
    };
    chatMessages = [...chatMessages, reply];
    return simulateNetwork(reply);
  },
};
