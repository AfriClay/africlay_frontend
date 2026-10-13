import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { MessagesList } from '../screens/messages/MessagesList';
import { ConversationThread } from '../screens/messages/ConversationThread';
import { createAppStackNavigator, useAppStackScreenOptions } from './appStack';

export type MessagesStackParamList = {
  MessagesInbox: undefined;
  ConversationThread: { conversationId: string; name: string };
};

const Stack = createAppStackNavigator<MessagesStackParamList>();

export const MessagesStack = () => {
  const stackOptions = useAppStackScreenOptions();
  return <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MessagesInbox" component={MessagesList} options={{ headerShown: false }} />
    <Stack.Screen
      name="ConversationThread"
      component={ConversationThread}
      options={({ route }: { route: RouteProp<MessagesStackParamList, 'ConversationThread'> }): NativeStackNavigationOptions => ({ title: route.params.name })}
    />
  </Stack.Navigator>;
};
