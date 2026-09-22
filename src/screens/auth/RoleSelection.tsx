import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui/Button';
import { FormFrame } from '../../components/layout/FormFrame';
import { useAuth } from '../../hooks/useAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { theme } from '../../theme';

export const RoleSelection: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'>>();
  const role = useAuth().pendingUser?.role;
  return <FormFrame style={styles.container}>
    <Text style={styles.title}>Account verified</Text>
    <Text style={styles.copy}>Your account role is {role ?? 'buyer'}. Roles are set when the account is created and cannot be changed here.</Text>
    <Button onPress={() => navigation.navigate('ProfileCompletion')}>Continue</Button>
  </FormFrame>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, marginBottom: theme.spacing.sm },
  copy: { color: theme.colors.muted, marginBottom: theme.spacing.lg, fontSize: theme.typography.body.fontSize },
});
