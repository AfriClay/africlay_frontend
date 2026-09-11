import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MessagesList } from '../screens/messages/MessagesList';
import { ConversationThread } from '../screens/messages/ConversationThread';
import { theme } from '../theme';

export type MessagesStackParamList = {
  Messages: undefined;
  ConversationThread: { conversationId: string; name: string };
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export const MessagesStack = () => (
  <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.cream }, headerTintColor: theme.colors.ink, headerBackButtonDisplayMode: 'minimal' }}>
    <Stack.Screen name="Messages" component={MessagesList} options={{ headerShown: false }} />
    <Stack.Screen name="ConversationThread" component={ConversationThread} options={({ route }) => ({ title: route.params.name })} />
  </Stack.Navigator>
);
