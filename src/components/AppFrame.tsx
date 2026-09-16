import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

export const AppFrame = ({ children }: PropsWithChildren) => (
  <View style={styles.container}>{children}</View>
);

const styles = StyleSheet.create({ container: { flex: 1 } });
