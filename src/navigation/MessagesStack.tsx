import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MessagesList } from '../screens/messages/MessagesList';
import { ConversationThread } from '../screens/messages/ConversationThread';
import { ROUTES } from '../constants/routes';

export type MessagesStackParamList = {
  Messages: undefined;
  ConversationThread: { conversationId: string; name: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Messages" component={MessagesList} />
    <Stack.Screen name="ConversationThread" component={ConversationThread} />
  </Stack.Navigator>
);
