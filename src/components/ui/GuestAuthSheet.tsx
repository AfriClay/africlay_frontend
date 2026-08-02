import React from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { BottomSheet } from './BottomSheet';

interface GuestAuthSheetProps {
  visible: boolean;
  onClose: () => void;
  description: string;
}

export const GuestAuthSheet: React.FC<GuestAuthSheetProps> = ({ visible, onClose, description }) => {
  const navigation = useNavigation<NavigationProp<{ AuthStack: { screen: 'Register' | 'Login' } }>>();

  const openAuthScreen = (screen: 'Register' | 'Login') => {
    onClose();
    navigation.navigate('AuthStack', { screen });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Create a free account to continue"
      description={description}
      actionLabel="Create Account"
      onAction={() => openAuthScreen('Register')}
      secondaryActionLabel="Log In"
      onSecondaryAction={() => openAuthScreen('Login')}
    />
  );
};
