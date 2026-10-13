import { Platform } from 'react-native';
import type { ParamListBase } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import { useReducedMotionSafe } from '../hooks/useReducedMotionSafe';
import { theme } from '../theme';

export const createAppStackNavigator = <ParamList extends ParamListBase>() => {
  if (Platform.OS === 'web') {
    return createStackNavigator<ParamList>() as unknown as ReturnType<typeof createNativeStackNavigator<ParamList>>;
  }
  return createNativeStackNavigator<ParamList>();
};

export const useAppStackScreenOptions = (): NativeStackNavigationOptions => {
  const reducedMotion = useReducedMotionSafe();
  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.colors.cream },
    headerTintColor: theme.colors.ink,
    headerBackButtonDisplayMode: 'minimal',
    ...(Platform.OS === 'web'
      ? {
          cardStyleInterpolator: reducedMotion
            ? CardStyleInterpolators.forNoAnimation
            : CardStyleInterpolators.forHorizontalIOS,
          gestureEnabled: false,
        }
      : {
          animation: reducedMotion ? 'none' : 'default',
        }),
  } as NativeStackNavigationOptions;
};
