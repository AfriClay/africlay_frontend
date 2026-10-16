import { lazy, Suspense, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';


export const lazyScreen = (
  loader: () => Promise<{ default: ComponentType<any> }>,
): ComponentType<any> => {
  const LazyComponent = lazy(loader);
  const DeferredScreen = (props: object) => (
    <Suspense fallback={<View style={styles.loading}><ActivityIndicator color={theme.colors.primary.DEFAULT} accessibilityLabel="Loading page" /></View>}>
      <LazyComponent {...props} />
    </Suspense>
  );
  return DeferredScreen;
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.cream },
});
