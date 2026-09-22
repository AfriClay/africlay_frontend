import { z } from 'zod';
import { Conversation, Message } from '../types/message';
import { apiClient } from './api';

const person = z.object({ id: z.string().uuid(), full_name: z.string(), email: z.string() });
const messageSchema = z.object({
  id: z.string().uuid(), conversation_id: z.string().uuid(), sender: person,
  body: z.string(), created_at: z.string(), read_at: z.string().nullish(), is_from_me: z.boolean(),
});
const conversationSchema = z.object({
  id: z.string().uuid(), buyer: person, seller: person, last_message_at: z.string(),
  unread_count: z.number().int().nonnegative(),
  last_message: z.object({ body: z.string() }).nullish(), messages: z.array(messageSchema),
});
type RawConversation = z.infer<typeof conversationSchema>;
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error('The messaging response was incomplete. Please retry.');
  return result.data;
};
const toMessage = (raw: z.infer<typeof messageSchema>): Message => ({
  id: raw.id, conversationId: raw.conversation_id, from: raw.is_from_me ? 'You' : raw.sender.full_name || raw.sender.email,
  text: raw.body, timestamp: raw.created_at, unread: !raw.read_at && !raw.is_from_me,
});
const toConversation = (raw: RawConversation, userId: string): Conversation => {
  const other = raw.buyer.id === userId ? raw.seller : raw.buyer;
  return { id: raw.id, name: other.full_name || other.email, recipientId: other.id,
    lastMessage: raw.last_message?.body ?? '', timestamp: raw.last_message_at,
    unreadCount: raw.unread_count };
};

export const messageService = {
  fetchConversations: async (userId: string): Promise<Conversation[]> => {
    const raw = await apiClient('/messages/conversations/');
    const parsed = parse(z.object({ results: z.array(conversationSchema) }), raw);
    return parsed.results.map(item => toConversation(item, userId));
  },
  createConversation: async (target: { seller_id: string; store_id?: string; product_id?: string; service_id?: string }, userId: string): Promise<Conversation> =>
    toConversation(parse(conversationSchema, await apiClient('/messages/conversations/', { method: 'POST', body: target })), userId),
  fetchMessages: async (conversationId: string): Promise<Message[]> => {
    const raw = await apiClient(`/messages/conversations/${encodeURIComponent(conversationId)}/`);
    return parse(conversationSchema, raw).messages.map(toMessage);
  },
  sendMessage: async (conversationId: string, body: string): Promise<Message> =>
    toMessage(parse(messageSchema, await apiClient(`/messages/conversations/${encodeURIComponent(conversationId)}/messages/`,
      { method: 'POST', body: { body } }))),
};
