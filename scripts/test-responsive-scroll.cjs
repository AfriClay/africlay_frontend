const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');

test('the shared web viewport keeps nested route scrollers bounded', () => {
  const frame = source('src/components/AppFrame.web.tsx');
  const shell = source('src/components/layout/MarketplaceShell.tsx');
  const stack = source('src/navigation/appStack.ts');
  assert.match(frame, /useWindowDimensions/);
  assert.match(frame, /\{ height, maxHeight: height \}/);
  assert.match(shell, /mobile: \{ flex: 1, minHeight: 0/);
  assert.match(shell, /main: \{ flex: 1, minHeight: 0/);
  assert.match(shell, /route: \{ flex: 1, minHeight: 0/);
  assert.match(stack, /cardStyle: \{ flex: 1, minHeight: 0, height: '100%', maxHeight: '100%', overflow: 'hidden' \}/);
});

test('checkout and short-screen entry pages own a vertical scroll viewport', () => {
  const checkout = source('src/screens/cart/Checkout.tsx');
  const operationsLogin = source('src/screens/admin/OperationsLogin.tsx');
  const startSelling = source('src/screens/seller/StartSelling.tsx');
  const nativeForms = source('src/components/layout/FormFrame.tsx');
  assert.match(checkout, /testID="checkout-scroll"/);
  assert.match(checkout, /scroll: \{ flex: 1, minHeight: 0 \}/);
  assert.match(checkout, /content: \{ padding: theme\.spacing\.lg, paddingBottom: theme\.spacing\.xxl \}/);
  assert.match(operationsLogin, /<ScrollView[^>]+contentContainerStyle=\{styles\.root\}/);
  assert.match(startSelling, /<ScrollView[^>]+contentContainerStyle=\{styles\.content\}/);
  assert.match(nativeForms, /<ScrollView/);
  assert.match(nativeForms, /contentContainerStyle=\{\[style, \{ flexGrow: 1, flexShrink: 0, flexBasis: 'auto' \}\]\}/);
});

test('every content screen has a vertical scrolling owner or an intentional exemption', () => {
  const screensRoot = path.join(root, 'src', 'screens');
  const files = [];
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith('.tsx')) files.push(absolute);
    }
  };
  visit(screensRoot);

  const exempt = new Set([
    'admin/AdminPortal.tsx',
    'admin/FinanceDashboard.tsx',
    'admin/SalesDashboard.tsx',
    'admin/SuperAdminDashboard.tsx',
    'auth/Splash.tsx',
  ]);
  const missing = files.filter(file => {
    const relative = path.relative(screensRoot, file).replaceAll('\\', '/');
    if (exempt.has(relative)) return false;
    return !/\b(?:ScrollView|FlatList|SectionList|FormFrame)\b/.test(readFileSync(file, 'utf8'));
  }).map(file => path.relative(root, file));
  assert.deepEqual(missing, []);
});

test('pull to refresh is compact-web-only and does not ship a native gesture', () => {
  const app = source('App.tsx');
  const webRefresh = source('src/components/MobileWebPullToRefresh.web.tsx');
  const nativeRefresh = source('src/components/MobileWebPullToRefresh.tsx');
  assert.match(app, /<MobileWebPullToRefresh \/>/);
  assert.match(webRefresh, /max-width: 767px/);
  assert.match(webRefresh, /pointer: coarse/);
  assert.match(webRefresh, /refetchQueries\(\{ type: 'active' \}\)/);
  assert.match(webRefresh, /touchstart/);
  assert.match(webRefresh, /touchmove/);
  assert.match(webRefresh, /overscrollBehaviorY = 'none'/);
  assert.match(nativeRefresh, /MobileWebPullToRefresh = \(\) => null/);
  assert.doesNotMatch(nativeRefresh, /touch|refetch|RefreshControl/);

  const nativePullScreens = [
    'src/screens/cart/Cart.tsx',
    'src/screens/messages/ConversationThread.tsx',
    'src/screens/notifications/Notifications.tsx',
    'src/screens/seller/SellerBookings.tsx',
    'src/screens/seller/SellerOrders.tsx',
    'src/screens/profile/MyBookings.tsx',
    'src/screens/profile/MyOrders.tsx',
    'src/screens/profile/OtherProfileScreens.tsx',
    'src/screens/profile/Wallet.tsx',
    'src/screens/profile/Wishlist.tsx',
  ];
  for (const screen of nativePullScreens) {
    const contents = source(screen);
    assert.doesNotMatch(contents, /\brefreshControl=\{|\brefreshing=\{|\bonRefresh=\{/, `${screen} still enables native pull to refresh`);
  }
});
