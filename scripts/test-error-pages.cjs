const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { getStateFromPath } = require('@react-navigation/core');

const source = file => readFileSync(path.join(__dirname, '..', file), 'utf8');
const linkingExports = {};
vm.runInNewContext(ts.transpileModule(source('src/navigation/linking.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: linkingExports });
const { linking } = linkingExports;

const routeChain = pathName => {
  const names = [];
  let state = getStateFromPath(pathName, linking.config);
  while (state?.routes?.length) {
    const route = state.routes[state.index ?? 0];
    names.push(route.name);
    state = route.state;
  }
  return names;
};

test('unknown direct links open the AfriClay not-found route', () => {
  for (const url of ['/unknown-page', '/operations/unknown', '/account/unknown']) {
    assert.deepEqual(routeChain(url), ['NotFound']);
  }
  assert.match(source('src/navigation/RootNavigator.tsx'), /<Stack.Screen name="NotFound" component={NotFoundScreen} \/>/g);
  assert.match(source('src/screens/common/NotFoundScreen.tsx'), /navigation\.canGoBack\(\)/);
  assert.match(source('src/screens/common/NotFoundScreen.tsx'), /canAccessOperations\(user\)/);
  assert.match(source('src/screens/common/NotFoundScreen.tsx'), /operations \? 'Open dashboard' : 'Browse marketplace'/);
});

test('existing public and staff deep links still resolve to their screens', () => {
  assert.deepEqual(routeChain('/product/a-product'), ['AppTabs', 'Home', 'ProductDetails']);
  assert.deepEqual(routeChain('/operations/finance'), ['FinanceDashboard']);
  assert.deepEqual(routeChain('/riders/apply'), ['RiderApplication']);
});

test('runtime and data errors offer recovery without exposing debug details', () => {
  assert.match(source('App.tsx'), /<AppCrashBoundary><AppContent \/><\/AppCrashBoundary>/);
  assert.match(source('src/components/AppCrashBoundary.tsx'), /getDerivedStateFromError/);
  assert.match(source('src/components/AppCrashBoundary.tsx'), /onRetry=\{\(\) => this\.setState\(\{ failed: false \}\)\}/);
  assert.match(source('src/components/ui/ErrorState.tsx'), /<AppErrorPage kind=\{kind\}/);
  assert.doesNotMatch(source('src/components/ui/AppErrorPage.tsx'), /error\.stack|error\.message/);
});
