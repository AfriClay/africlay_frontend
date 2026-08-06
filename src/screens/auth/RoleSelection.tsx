import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { theme } from '../../theme';

const roles: ReadonlyArray<{ id: 'buyer' | 'seller' | 'both'; title: string; description: string }> = [
  { id: 'buyer', title: 'Buyer', description: 'Browse and buy authentic African products and services.' },
  { id: 'seller', title: 'Seller', description: 'List products and services for customers across Africa.' },
  { id: 'both', title: 'Both', description: 'Buy as a customer and sell or offer services too.' },
];

export const RoleSelection: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'>>();
  const auth = useAuth();

  const handleSelect = (role: 'buyer' | 'seller' | 'both') => {
    auth.selectRole(role);
    navigation.navigate(role === 'buyer' ? 'ProfileCompletion' : 'KYCUpload');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your role</Text>
      <Text style={styles.copy}>Select the role that best matches how you want to use AfriClay.</Text>
      {roles.map(role => (
        <Pressable key={role.id} style={styles.card} onPress={() => handleSelect(role.id)} accessibilityRole="button" accessibilityLabel={role.title}>
          <Text style={styles.cardTitle}>{role.title}</Text>
          <Text style={styles.cardDescription}>{role.description}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.cream, padding: theme.spacing.lg },
  title: { fontSize: theme.typography.h2.fontSize, fontWeight: '800', color: theme.colors.ink, marginBottom: theme.spacing.sm },
  copy: { color: theme.colors.muted, marginBottom: theme.spacing.lg, fontSize: theme.typography.body.fontSize },
  card: { backgroundColor: theme.colors.white, borderRadius: theme.radii.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md, ...theme.shadows.sm },
  cardTitle: { fontSize: theme.typography.body.fontSize, fontWeight: '700', marginBottom: theme.spacing.xs },
  cardDescription: { color: theme.colors.muted },
});
