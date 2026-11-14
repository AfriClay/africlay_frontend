import { lazy, Suspense, type ComponentType } from 'react';
import { PageSkeleton } from './PageSkeleton';

export const lazyScreen = (
  loader: () => Promise<{ default: ComponentType<any> }>,
): ComponentType<any> => {
  const LazyComponent = lazy(loader);
  const DeferredScreen = (props: object) => (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <LazyComponent {...props} />
    </Suspense>
  );
  return DeferredScreen;
};
