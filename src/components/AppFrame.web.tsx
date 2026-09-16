import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export const AppFrame = ({ children }: PropsWithChildren) => {
  return <View style={styles.frame}>{children}</View>;
};

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: 0, minWidth: 0, width: '100%', backgroundColor: theme.colors.cream },
});
