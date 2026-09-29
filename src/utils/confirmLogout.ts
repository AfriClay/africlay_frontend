import { Alert, Platform } from 'react-native';

export const confirmLogout = (onConfirm: () => void): void => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Log out of AfriClay?')) onConfirm();
    return;
  }
  Alert.alert('Log out?', 'You will need to sign in again to access your account.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log Out', style: 'destructive', onPress: onConfirm },
  ]);
};
