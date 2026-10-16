import { ScrollView, type ViewProps } from 'react-native';

// Keep a single route-level scroller so centered forms still work on short screens.
export function FormFrame({ children, style, testID = 'form-scroll', ...props }: ViewProps) {
  return <ScrollView {...props} testID={testID} style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled"
    contentContainerStyle={[style, { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' }]}>
    {children}
  </ScrollView>;
}
