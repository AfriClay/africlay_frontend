import { ScrollView, type ViewProps } from 'react-native';

// Static native forms keep their composition; web gets one route-level scroller.
export function FormFrame({ children, style, ...props }: ViewProps) {
  return <ScrollView {...props} style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled"
    contentContainerStyle={[style, { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' }]}>
    {children}
  </ScrollView>;
}
