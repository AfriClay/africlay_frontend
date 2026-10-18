import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { theme } from '../../theme';

export function FormFrame({ children, style, testID = 'form-scroll', ...props }: ViewProps) {
  return <ScrollView {...props} testID={testID} style={styles.viewport} keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
    <View style={[styles.inner, style]}>{children}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: 0, backgroundColor: theme.colors.cream },
  content: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto', backgroundColor: theme.colors.cream },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1 },
});
