import { NavigationProp, useNavigation } from '@react-navigation/native';
import { LockKeyhole } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { theme } from '../../theme';
import { Button } from './Button';

export const AuthRequiredState = ({
  title = 'Account required',
  description,
}: {
  title?: string;
  description: string;
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  return <SafeAreaView style={styles.container}>
    <View style={styles.content}>
      <View style={styles.icon}><LockKeyhole color={theme.colors.primary.DEFAULT} size={30} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.actions}>
        <Button fullWidth onPress={() => navigation.navigate('AuthStack', { screen: 'Login' })}>Log In</Button>
        <Button fullWidth variant="secondary" onPress={() => navigation.navigate('AuthStack', { screen: 'Register' })}>Create Account</Button>
      </View>
    </View>
  </SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  icon: { width: 58, height: 58, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary.tint, marginBottom: theme.spacing.md },
  title: { color: theme.colors.ink, fontSize: theme.typography.h2.fontSize, fontWeight: '800', textAlign: 'center' },
  description: { maxWidth: 440, color: theme.colors.muted, textAlign: 'center', lineHeight: 22, marginTop: theme.spacing.sm },
  actions: { width: '100%', maxWidth: 360, gap: theme.spacing.sm, marginTop: theme.spacing.xl },
});
