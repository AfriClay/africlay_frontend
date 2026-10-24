const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { StackRouter, CommonActions } = require('@react-navigation/routers');
const { getStateFromPath } = require('@react-navigation/core');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');

function transpile(relativePath, requireModule = require) {
  const exports = {};
  const code = ts.transpileModule(source(relativePath), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule });
  return exports;
}

function routeChain(state) {
  const chain = [];
  let current = state;
  while (current?.routes?.length) {
    const route = current.routes[current.index ?? 0];
    chain.push(route.name);
    current = route.state;
  }
  return chain;
}

test('signed-out startup opens the marketplace and keeps authentication modal', () => {
  const auth = source('src/contexts/AuthContext.tsx');
  const navigator = source('src/navigation/RootNavigator.tsx');
  assert.match(auth, /const signedOut = \{ isGuest: true/);
  assert.match(navigator, /initialRouteName="AppTabs"/);
  assert.match(navigator, /<Stack\.Screen name="AppTabs"/);
  assert.match(navigator, /<Stack\.Screen name="AuthStack"/);
  assert.doesNotMatch(navigator, /!user\s*&&\s*!isGuest/);
});

test('public marketplace deep links remain available without authentication', () => {
  const { linking } = transpile('src/navigation/linking.ts', name => {
    throw new Error(`Unexpected runtime import: ${name}`);
  });
  const paths = [
    ['/product/sisal-rug', ['AppTabs', 'Home', 'ProductDetails']],
    ['/store/artisan-shop', ['AppTabs', 'Home', 'SellerStore']],
    ['/services/web-design', ['AppTabs', 'Home', 'ServiceDetails']],
    ['/search/shoes', ['AppTabs', 'Search', 'SearchLanding']],
  ];
  for (const [url, expected] of paths) {
    assert.deepEqual(routeChain(getStateFromPath(url, linking.config)), expected);
  }
});

test('catalog, store, service and review reads are anonymous', () => {
  const products = source('src/services/productService.ts');
  const services = source('src/services/serviceService.ts');
  const reviews = source('src/services/reviewService.ts');
  assert.match(products, /const path = `\/products\/[\s\S]*apiClient\(path, \{ auth: false \}\)/);
  assert.match(products, /apiClient\('\/stores\/', \{ auth: false \}\)/);
  assert.match(products, /`\/products\/\$\{encodeURIComponent\(slug\)\}\/`, \{ auth: false \}/);
  assert.match(products, /`\/stores\/\$\{encodeURIComponent\(slug\)\}\/`, \{ auth: false \}/);
  assert.match(services, /apiClient\(`\/services\/\?\$\{params\}`, \{ auth: false \}\)/);
  assert.match(services, /`\/services\/\$\{encodeURIComponent\(slug\)\}\/`, \{ auth: false \}/);
  assert.match(reviews, /apiClient\(`\/reviews\/\?\$\{target\.type\}=\$\{encodeURIComponent\(target\.id\)\}`, \{ auth: false \}\)/);
});

test('private destinations and sensitive actions retain explicit authentication gates', () => {
  const profile = source('src/navigation/ProfileStack.tsx');
  const sell = source('src/navigation/SellTab.tsx');
  const checkout = source('src/screens/cart/Checkout.tsx');
  const review = source('src/components/domain/ReviewSection.tsx');
  const service = source('src/screens/home/ServiceDetails.tsx');
  const authSheet = source('src/components/ui/GuestAuthSheet.tsx');
  const wishlist = source('src/components/domain/WishlistToggle.tsx');
  const protectedScreens = {
    MyOrders: 'ProtectedMyOrders', MyAddresses: 'ProtectedAddresses', Wishlist: 'ProtectedWishlist',
    Notifications: 'ProtectedNotifications', MyBookings: 'ProtectedBookings', Wallet: 'ProtectedWallet', Settings: 'ProtectedSettings',
  };
  for (const [screen, component] of Object.entries(protectedScreens)) {
    assert.match(profile, new RegExp(`name="${screen}"[^>]*component=\\{${component}\\}`));
  }
  assert.match(sell, /if \(!user\)[\s\S]*<AuthRequiredState/);
  assert.match(checkout, /<GuestAuthSheet[\s\S]*Your cart is saved/);
  assert.match(review, /onAuthenticated=\{startReview\}/);
  assert.match(service, /Review the booking details, then tap Request booking/i);
  assert.match(authSheet, /awaitingAuthentication\.current = true[\s\S]*navigate\('AuthStack'/);
  assert.match(authSheet, /if \(!userId \|\| !awaitingAuthentication\.current\) return;[\s\S]*resume\.current\?\.\(\)/);
  assert.match(wishlist, /resumeAfterAuth[\s\S]*wishlist\.toggle\(productId\)/);
  assert.doesNotMatch(checkout, /onAuthenticated=\{submit\}/);
});

test('buy now checks out only the selected product without mutating the normal cart', () => {
  const product = source('src/screens/home/ProductDetails.tsx');
  const checkout = source('src/screens/cart/Checkout.tsx');
  const orders = source('src/services/orderService.ts');

  assert.match(product, /navigate\('Checkout', \{ buyNowProductId: product\.id, buyNowQuantity: 1 \}\)/);
  assert.doesNotMatch(product, /const buyNow[\s\S]*?cart\.addItem[\s\S]*?navigate\('Checkout'/);
  assert.match(checkout, /buy_now_product_id: buyNowProductId/);
  assert.match(checkout, /data=\{checkoutItems\}/);
  assert.match(checkout, /: cart\.items/);
  assert.match(orders, /buy_now_product_id\?: string/);
  assert.match(orders, /buy_now_quantity\?: number/);
});

test('authentication modal returns to the preserved in-app destination', () => {
  const router = StackRouter({ initialRouteName: 'AppTabs' });
  const options = { routeNames: ['AppTabs', 'Cart', 'Checkout', 'AuthStack'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  const destination = { screen: 'Profile', params: { screen: 'MyOrders', params: { filter: 'pending' } } };
  state = router.getStateForAction(state, CommonActions.navigate('AppTabs', destination), options);
  state = router.getStateForAction(state, CommonActions.navigate('AuthStack', { screen: 'Login' }), options);
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  assert.equal(state.routes[state.index].name, 'AppTabs');
  assert.deepEqual(state.routes[state.index].params, destination);

  const navigator = source('src/navigation/RootNavigator.tsx');
  assert.match(navigator, /activeRoute\?\.name !== 'AuthStack'/);
  assert.match(navigator, /rootState\.routes\.length > 1[\s\S]*CommonActions\.goBack/);
  assert.match(navigator, /else \{[\s\S]*resetRoot\(\{ index: 0, routes: \[\{ name: 'AppTabs'/);
});

test('guest cart persists valid items and supports add, update and remove', async () => {
  const memory = new Map();
  const asyncStorage = {
    getItem: async key => memory.get(key) ?? null,
    setItem: async (key, value) => { memory.set(key, value); },
  };
  const cart = transpile('src/services/guestCartStorage.ts', name => {
    if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: asyncStorage };
    throw new Error(`Unexpected runtime import: ${name}`);
  });
  const product = { productId: 'p-1', productSlug: 'woven-basket', name: 'Woven basket', price: 1200 };
  let items = cart.addGuestCartItem([], product, 1);
  items = cart.addGuestCartItem(items, product, 2);
  assert.equal(items[0].quantity, 3);
  items = cart.updateGuestCartQuantity(items, 'guest:p-1', 4);
  await cart.guestCartStorage.save(items);
  assert.equal(JSON.stringify(await cart.guestCartStorage.load()), JSON.stringify(items));
  assert.equal(cart.removeGuestCartItem(items, 'guest:p-1').length, 0);

  memory.set(cart.GUEST_CART_STORAGE_KEY, JSON.stringify([...items, { id: 'bad', productId: 'p-2', name: 'Bad', price: -1, quantity: 0 }]));
  assert.equal((await cart.guestCartStorage.load()).length, 1);
});

test('guest cart transfer only removes items after the existing cart API accepts them', () => {
  const context = source('src/contexts/CartContext.tsx');
  const accepted = context.indexOf('await cartService.addItem(item.productId, item.quantity);');
  const removed = context.indexOf('remaining = remaining.filter', accepted);
  const persisted = context.indexOf('await guestCartStorage.save(remaining);', removed);
  assert.ok(accepted >= 0 && removed > accepted && persisted > removed);
  assert.doesNotMatch(context, /mergeGuestCart|\/cart\/merge/);
});

test('logout and account switches clear only private query caches and scope cart queries by user', () => {
  const app = source('App.tsx');
  const catalogQueries = source('src/services/catalogQueries.ts');
  const cart = source('src/contexts/CartContext.tsx');
  assert.match(app, /activeIdentity = user\?\.id \?\? 'guest'/);
  assert.match(app, /client\.removeQueries\(\{ predicate: query => !isPublicCatalogQuery\(query\.queryKey\) \}\)/);
  assert.doesNotMatch(app, /client\.clear\(\)/);
  assert.match(catalogQueries, /PUBLIC_QUERY_ROOTS[\s\S]*'products'[\s\S]*'categories'[\s\S]*'services'[\s\S]*'reviews'/);
  assert.match(cart, /const cartKey = \(userId: string\) => \['cart', userId\]/);
  assert.match(cart, /removeQueries\(\{ queryKey: cartKey\(previousUserId\.current\), exact: true \}\)/);
});

test('seller accounts retain both buyer and seller access while protected roles remain distinct', () => {
  const roles = transpile('src/utils/roles.ts', name => {
    if (name === '../types/user') return {};
    throw new Error(`Unexpected runtime import: ${name}`);
  });
  assert.equal(roles.canAccessBuyerTools('seller'), true);
  assert.equal(roles.canAccessBuyerTools('buyer'), true);
  assert.equal(roles.canAccessSellerTools('seller'), true);
  assert.equal(roles.canAccessSellerTools('buyer'), false);
  assert.equal(roles.canAccessSellerTools(undefined), false);
});

test('Vercel keeps the SPA fallback required by direct public links', () => {
  const vercel = JSON.parse(source('vercel.json'));
  assert.ok(vercel.rewrites.some(rule => rule.source === '/:path*' && rule.destination === '/'));
});
