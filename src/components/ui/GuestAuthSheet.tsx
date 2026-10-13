import React, { useEffect, useRef } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { BottomSheet } from './BottomSheet';

interface GuestAuthSheetProps {
  visible: boolean;
  onClose: () => void;
  description: string;
  onAuthenticated?: () => void;
}

export const GuestAuthSheet: React.FC<GuestAuthSheetProps> = ({ visible, onClose, description, onAuthenticated }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const userId = useAuth().user?.id;
  const awaitingAuthentication = useRef(false);
  const resume = useRef(onAuthenticated);
  resume.current = onAuthenticated;

  useEffect(() => {
    if (!userId || !awaitingAuthentication.current) return;
    awaitingAuthentication.current = false;
    onClose();
    resume.current?.();
  }, [onClose, userId]);

  const closeSheet = () => {
    awaitingAuthentication.current = false;
    onClose();
  };

  const openAuthScreen = (screen: 'Register' | 'Login') => {
    awaitingAuthentication.current = true;
    onClose();
    navigation.navigate('AuthStack', { screen });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={closeSheet}
      title="Create a free account to continue"
      description={description}
      actionLabel="Create Account"
      onAction={() => openAuthScreen('Register')}
      secondaryActionLabel="Log In"
      onSecondaryAction={() => openAuthScreen('Login')}
    />
  );
};
