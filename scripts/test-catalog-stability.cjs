const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
const { TabRouter, StackRouter, CommonActions } = require('@react-navigation/routers');
const { getPathFromState, getStateFromPath } = require('@react-navigation/core');

const category = { id: 'category-id', slug: 'handmade', name: 'Handmade', parent: null };
const tag = { id: 'tag-id', slug: 'woven', name: 'Woven' };
const store = { id: 'store-id', owner: 'seller-id', slug: 'artisan-shop', name: 'Artisan Shop', description: 'Handmade goods', city: 'Nairobi', country: 'Kenya', logo: '/media/logo.png', banner: null, average_rating: '4.25', total_reviews: 4, total_products: 1, status: 'active' };
const publicStore = Object.fromEntries(Object.entries(store).filter(([key]) => !['owner', 'city', 'country'].includes(key)));
const product = { id: 'product-id', store: store.id, category: category.id, tags: [tag.id], images: [{ image: '/media/rug.png', is_primary: true, display_order: 1 }, { image: null, is_primary: false, display_order: 2 }], name: 'Sisal Rug', slug: 'sisal-rug', description: 'Handwoven', sku: 'RUG-001', price: '3200.50', price_unit: 'piece', currency: 'KES', stock_quantity: 5, weight_kg: '1.250', length_cm: '40.00', width_cm: '30.00', height_cm: '12.00', status: 'published', average_rating: 4.5, review_count: 12 };
const childCategory = { id: 'child-category-id', slug: 'farm-tools', name: 'Farm Tools', parent: category.id };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

function loadTypeScriptExports(file) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports });
  return exports;
}

function harness(responder = () => undefined) {
  const requests = [];
  const modules = new Map();
  const storage = new Map();
  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, Headers, FormData, URLSearchParams,
      process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/api' } },
      localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key),
      },
      fetch: async (url, init) => {
        const route = new URL(url);
        requests.push({ path: route.pathname, search: route.searchParams, init });
        const answer = await responder(route, init);
        if (answer) return answer;
        if (route.pathname.endsWith('/categories/')) return json([category]);
        if (route.pathname.endsWith('/categories/path/') && init.method === 'POST') return json({ parent: category, child: childCategory, created: true }, 201);
        if (route.pathname.endsWith('/tags/')) return json([tag]);
        if (route.pathname.endsWith('/products/')) return json([product]);
        if (route.pathname.endsWith('/stores/')) return json([publicStore]);
        if (route.pathname.endsWith('/stores/mine/')) return json(store);
        if (route.pathname.endsWith('/stores/artisan-shop/')) return json(publicStore);
        if (route.pathname.endsWith('/products/sisal-rug/')) return json(product);
        if (route.pathname.endsWith('/products/manage/')) return json([product]);
        if (route.pathname.endsWith('/products/manage/product-id/')) return json(product);
        if (route.pathname.endsWith('/products/manage/product-id/images/')) return json({ id: 'image-id', image: '/media/new.png' }, 201);
        throw new Error(`Unexpected route: ${route.pathname}`);
      },
      require(name) {
        if (name === 'react-native') return { Platform: { OS: 'web' } };
        if (name === 'expo-secure-store' || name.includes('async-storage')) throw new Error('Native or mock catalog storage loaded on web');
        if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), `${name}.ts`)));
        return require(name);
      },
    });
    return exports;
  }
  const api = load('services/api.ts');
  const service = load('services/productService.ts').productService;
  return {
    api, service, requests, storage, load,
    queries: load('services/catalogQueries.ts'),
    categoryTree: load('utils/categoryTree.ts'),
    identifiers: load('utils/productIdentifiers.ts'),
  };
}

test('tab history returns to the immediate previous tab', () => {
  assert.match(readFileSync(path.join(__dirname, '../src/navigation/AppTabs.tsx'), 'utf8'), /backBehavior="history"/);
  const router = TabRouter({ backBehavior: 'history' });
  const options = { routeNames: ['Home', 'Search', 'Sell'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  state = router.getStateForAction(state, CommonActions.navigate('Search'), options);
  state = router.getStateForAction(state, CommonActions.navigate('Sell'), options);
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  assert.equal(state.routes[state.index].name, 'Search');
});

test('nested stack back returns to the immediately previous route with its params', () => {
  const router = StackRouter({ initialRouteName: 'HomeFeed' });
  const options = { routeNames: ['HomeFeed', 'ProductListing', 'ProductDetails'], routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  state = router.getStateForAction(state, CommonActions.navigate('ProductListing', { categoryId: 'handmade' }), options);
  state = router.getStateForAction(state, CommonActions.navigate('ProductDetails', { productId: 'sisal-rug' }), options);
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  assert.equal(state.routes[state.index].name, 'ProductListing');
  assert.equal(state.routes[state.index].params.categoryId, 'handmade');
});

test('web navigation uses React Navigation linking and a reduced-motion-aware horizontal stack', () => {
  const root = readFileSync(path.join(__dirname, '../src/navigation/RootNavigator.tsx'), 'utf8');
  const stack = readFileSync(path.join(__dirname, '../src/navigation/appStack.ts'), 'utf8');
  const links = readFileSync(path.join(__dirname, '../src/navigation/linking.ts'), 'utf8');
  assert.match(root, /<NavigationContainer[^>]*linking=\{linking\}/);
  assert.match(stack, /Platform\.OS === 'web'/);
  assert.match(stack, /CardStyleInterpolators\.forHorizontalIOS/);
  assert.match(stack, /CardStyleInterpolators\.forNoAnimation/);
  assert.match(links, /ProductDetails: 'product\/:productId'/);
  assert.match(links, /AddEditProduct: 'products\/edit\/:productId\?'/);
  assert.doesNotMatch(root + links, /window\.location/);
});

test('product deep links round-trip without inventing a previous in-app route', () => {
  const { linking } = loadTypeScriptExports(path.join(__dirname, '../src/navigation/linking.ts'));
  const state = getStateFromPath('/product/sisal-rug', linking.config);
  const tabs = state.routes[0].state;
  const home = tabs.routes[tabs.index ?? 0].state;
  assert.equal(state.routes[0].name, 'AppTabs');
  assert.equal(tabs.routes[tabs.index ?? 0].name, 'Home');
  assert.equal(home.routes.length, 1);
  assert.equal(home.routes[0].name, 'ProductDetails');
  assert.equal(home.routes[0].params.productId, 'sisal-rug');
  assert.equal(getPathFromState(state, linking.config), '/product/sisal-rug');
});

test('product list maps backend IDs, category, tags, decimal price, stock and image objects', async () => {
  const { service, requests } = harness();
  const items = await service.fetchProducts();
  assert.equal(items.length, 1);
  assert.equal(items[0].id, product.id);
  assert.equal(items[0].slug, product.slug);
  assert.equal(items[0].sellerId, store.id);
  assert.equal(items[0].category, category.name);
  assert.equal(items[0].categoryId, category.id);
  assert.equal(items[0].tagIds[0], tag.id);
  assert.equal(items[0].price, 3200.5);
  assert.equal(items[0].priceUnit, 'piece');
  assert.equal(items[0].currency, 'KES');
  assert.equal(items[0].availableQuantity, 5);
  assert.equal(items[0].rating, 4.5);
  assert.equal(items[0].reviewCount, 12);
  assert.deepEqual(Array.from(items[0].images), ['https://api.example.test/media/rug.png']);
  assert.equal(requests.find(item => item.path === '/api/products/').init.credentials, 'omit');
});

test('catalog requests use category and text search without requiring a tag', async () => {
  const { service, requests } = harness();
  const page = await service.fetchProductPage({ category: 'handmade', search: 'Sisal Rug', limit: 24 });
  assert.equal(page.results.length, 1);
  const request = requests.find(item => item.path === '/api/products/');
  assert.equal(request.search.get('category'), 'handmade');
  assert.equal(request.search.get('search'), 'Sisal Rug');
  assert.equal(request.search.has('tag'), false);
});

test('public product detail navigates by slug and missing detail is null', async () => {
  const { service, requests } = harness(route => route.pathname.endsWith('/products/removed/') || route.pathname.endsWith('/products/product-id/') ? json({ detail: 'Not found' }, 404) : undefined);
  assert.equal((await service.fetchProductById('sisal-rug')).id, product.id);
  assert.equal(requests[0].path, '/api/products/sisal-rug/');
  assert.equal(await service.fetchProductById(product.id), null);
  assert.equal(await service.fetchProductById('removed'), null);
});

test('categories and tags use the backend list routes', async () => {
  const { service } = harness();
  assert.equal((await service.fetchCategories())[0].slug, 'handmade');
  assert.equal((await service.fetchTags())[0].slug, 'woven');
});

test('category hierarchy orders main, subcategory and detail levels safely', () => {
  const { categoryTree } = harness();
  const main = { id: 'main', slug: 'home', label: 'Home', icon: 'Tag' };
  const sub = { id: 'sub', slug: 'decor', label: 'Decor', icon: 'Tag', parent: main.id };
  const detail = { id: 'detail', slug: 'wall-art', label: 'Wall Art', icon: 'Tag', parent: sub.id };
  const flattened = categoryTree.flattenCategoryTree([detail, main, sub]);
  assert.deepEqual(Array.from(flattened, item => [item.category.id, item.depth]), [['main', 0], ['sub', 1], ['detail', 2]]);
  assert.deepEqual(Array.from(categoryTree.categoryBranchIds([detail, main, sub], main.id)), ['main', 'sub', 'detail']);
  assert.deepEqual(Array.from(categoryTree.leafCategoryItems([detail, main, sub]), item => item.category.id), ['detail']);
});

test('product cards clamp names and keep rating before price', () => {
  const source = readFileSync(path.join(__dirname, '../src/components/domain/ProductCard.tsx'), 'utf8');
  const categoryCard = readFileSync(path.join(__dirname, '../src/components/domain/CategoryCard.tsx'), 'utf8');
  const home = readFileSync(path.join(__dirname, '../src/screens/home/Home.tsx'), 'utf8');
  assert.match(source, /numberOfLines=\{2\}/);
  assert.match(source, /ellipsizeMode="tail"/);
  assert.ok(source.indexOf('<RatingBadge') < source.indexOf('formatCurrency(product.price'));
  assert.match(categoryCard, /desktopRoot: \{ width: 116, maxWidth: 116 \}/);
  assert.match(home, /desktopCategoryGrid: \{ justifyContent: 'flex-start', columnGap:/);
  assert.match(source, /priceUnitSuffix\(product\.priceUnit\)/);
  assert.match(home, /styles\.mobileProductGrid/);
  assert.match(home, /mobileProductGrid: \{ flexDirection: 'row', flexWrap: 'wrap'/);
  assert.doesNotMatch(home, /data=\{featured\}\s+horizontal/);
});

test('written sale units render as price per item without duplicating per', () => {
  const { priceUnitSuffix } = loadTypeScriptExports(path.join(__dirname, '../src/utils/priceUnit.ts'));
  assert.equal(priceUnitSuffix('mango'), ' per mango');
  assert.equal(priceUnitSuffix('kg'), ' per kg');
  assert.equal(priceUnitSuffix('per bunch'), ' per bunch');
  assert.equal(priceUnitSuffix(''), '');
});

test('desktop category menu keeps hierarchy and the listing exposes category filters on all sizes', () => {
  const source = readFileSync(path.join(__dirname, '../src/components/layout/CategoryMegaMenu.tsx'), 'utf8');
  const shell = readFileSync(path.join(__dirname, '../src/components/layout/MarketplaceShell.tsx'), 'utf8');
  const listing = readFileSync(path.join(__dirname, '../src/screens/home/ProductListing.tsx'), 'utf8');
  const sideMenu = readFileSync(path.join(__dirname, '../src/components/SideMenu.tsx'), 'utf8');
  assert.match(source, /rootCategories\(categories\)/);
  assert.match(source, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(source, /onHoverIn=\{\(\) => open\(root\)\}/);
  assert.match(source, /Animated\.timing\(reveal/);
  assert.match(source, /Shop all/);
  assert.doesNotMatch(shell, /Shop by category/);
  assert.match(listing, /<ScrollView horizontal[^>]*contentContainerStyle=\{styles\.categoryFilters\}/);
  assert.match(listing, /rootCategories\(categories\)/);
  assert.doesNotMatch(listing, /flattenCategoryTree/);
  assert.match(sideMenu, /rootCategories\(categoriesQuery\.data \?\? \[\]\)/);
});

test('new product identifiers are generated from the name without seller input', () => {
  const { identifiers } = harness();
  const generated = identifiers.productIdentifiers('Handmade Sisal Rug', 'ABC-123');
  assert.equal(generated.slug, 'handmade-sisal-rug-abc123');
  assert.equal(generated.sku, 'AF-ABC123');
});

test('category and tag filters use exact backend slug parameters and clear correctly', async () => {
  const { service, requests } = harness();
  await service.fetchProducts({ category: 'handmade', tag: 'woven' });
  await service.fetchProducts();
  const products = requests.filter(item => item.path === '/api/products/');
  assert.equal(products[0].search.get('category'), 'handmade');
  assert.equal(products[0].search.get('tag'), 'woven');
  assert.equal(products[1].search.toString(), 'limit=24');
});

test('array and paginated results normalize, including empty lists', async () => {
  const { service } = harness(route => route.pathname.endsWith('/products/') ? json({ count: 1, next: null, previous: null, results: [product] }) : undefined);
  assert.equal((await service.fetchProducts()).length, 1);
  const empty = harness(route => route.pathname.endsWith('/products/') ? json([]) : undefined);
  assert.deepEqual(Array.from(await empty.service.fetchProducts()), []);
});

test('missing images and nullable content have safe display defaults', async () => {
  const { service } = harness(route => route.pathname.endsWith('/products/') ? json([{ ...product, images: [], description: null, category: null, tags: [] }]) : undefined);
  const [item] = await service.fetchProducts();
  assert.deepEqual(Array.from(item.images), []);
  assert.equal(item.category, 'Uncategorized');
  assert.equal(item.description, '');
});

test('API failure and invalid catalog responses never fall back to mock products', async () => {
  const failure = harness(route => route.pathname.endsWith('/products/') ? json({ detail: 'Unavailable' }, 500) : undefined);
  await assert.rejects(failure.service.fetchProducts(), error => error.status === 500);
  const invalid = harness(route => route.pathname.endsWith('/products/') ? json([{ ...product, price: null }]) : undefined);
  await assert.rejects(invalid.service.fetchProducts(), /Catalog data/);
});

test('store list and detail map real store identifiers and media URLs', async () => {
  const { service, requests } = harness();
  const sellers = await service.fetchSellers();
  assert.equal(sellers[0].id, store.id);
  assert.equal(sellers[0].ownerId, undefined);
  assert.equal(sellers[0].verified, false);
  assert.equal(sellers[0].logoUrl, 'https://api.example.test/media/logo.png');
  assert.equal((await service.fetchSeller(store.id)).name, store.name);
  assert.ok(requests.some(item => item.path === '/api/stores/artisan-shop/'));
  const ownStore = await service.fetchOwnStore(store.owner);
  assert.equal(ownStore.id, store.id);
  assert.equal(ownStore.ownerId, store.owner);
  assert.ok(requests.some(item => item.path === '/api/stores/mine/'));
});

test('public marketplace surfaces do not expose seller dispatch locations', () => {
  const publicFiles = [
    '../src/screens/home/ProductDetails.tsx',
    '../src/screens/home/SellerStore.tsx',
    '../src/screens/search/Search.tsx',
    '../src/components/domain/SellerCard.tsx',
  ];
  for (const file of publicFiles) {
    assert.doesNotMatch(readFileSync(path.join(__dirname, file), 'utf8'), /seller\.location/);
  }
  const settings = readFileSync(path.join(__dirname, '../src/screens/seller/StoreSettings.tsx'), 'utf8');
  assert.match(settings, /Dispatch location/);
  assert.match(settings, /updateStore\(store\.slug, \{ city \}\)/);
});

test('store products use public products and the real store UUID', async () => {
  const { service, requests } = harness();
  assert.equal((await service.fetchProductsBySeller(store.id)).length, 1);
  const request = requests.find(item => item.path === '/api/products/' && item.search.get('store'));
  assert.equal(request.search.get('store'), store.id);
  assert.equal(request.search.get('limit'), '100');
});

test('seller product list and detail require bearer and use manage UUID routes', async () => {
  const { api, service, requests } = harness();
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  assert.equal((await service.fetchSellerProducts())[0].id, product.id);
  assert.equal((await service.fetchOwnedProductById(product.id)).slug, product.slug);
  for (const request of requests.filter(item => item.path.includes('/manage/'))) {
    assert.equal(request.init.headers.get('Authorization'), 'Bearer seller-access');
  }
});

const draft = { name: 'Sisal Rug', slug: 'sisal-rug', sku: 'RUG-001', description: 'Handwoven', categoryId: category.id, tagIds: [tag.id], price: 3200.5, priceUnit: 'piece', availableQuantity: 5, weightKg: 1.25, lengthCm: 40, widthCm: 30, heightCm: 12, status: 'draft' };

test('create and update use backend fields, POST and PATCH, not local storage', async () => {
  const { api, service, requests, storage } = harness((route, init) => route.pathname.includes('/manage/') && ['POST', 'PATCH'].includes(init.method) ? json({ ...product, status: 'draft' }, init.method === 'POST' ? 201 : 200) : undefined);
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  await service.addSellerProduct(store.owner, draft);
  await service.updateSellerProduct(store.owner, product.id, { ...draft, status: 'published' });
  const mutations = requests.filter(item => item.init.method === 'POST' || item.init.method === 'PATCH');
  assert.deepEqual(mutations.map(item => [item.path, item.init.method]), [['/api/products/manage/', 'POST'], ['/api/products/manage/product-id/', 'PATCH']]);
  assert.deepEqual(JSON.parse(mutations[0].init.body), { name: 'Sisal Rug', slug: 'sisal-rug', sku: 'RUG-001', description: 'Handwoven', category: category.id, tags: [tag.id], price: '3200.50', price_unit: 'piece', price_options: [], currency: 'KES', stock_quantity: 5, status: 'draft', weight_kg: '1.250', length_cm: '40.00', width_cm: '30.00', height_cm: '12.00' });
  assert.equal(JSON.parse(mutations[1].init.body).status, 'published');
  assert.equal(mutations[0].init.headers.get('Authorization'), 'Bearer seller-access');
  assert.equal(storage.has('africlay-seller-catalog-v1'), false);
});

test('named price choices round-trip through seller payload and public product detail', async () => {
  const optionId = '550e8400-e29b-41d4-a716-446655440000';
  const choice = { id: optionId, label: 'Small cabbage', price: '80.00', stock_quantity: 0, weight_kg: '1.000', active: true };
  const large = { id: '550e8400-e29b-41d4-a716-446655440001', label: 'Large cabbage', price: '150.00', stock_quantity: 3, weight_kg: '2.000', active: true };
  const { api, service, requests } = harness((route, init) => {
    if (route.pathname.endsWith('/products/sisal-rug/')) return json({ ...product, price: '80.00', price_options: [choice, large] });
    if (route.pathname.includes('/manage/') && init.method === 'POST') return json(product, 201);
    return undefined;
  });
  const detail = await service.fetchProductById('sisal-rug');
  assert.deepEqual(detail.priceOptions.map(option => [option.id, option.label, option.price, option.stockQuantity]), [[optionId, 'Small cabbage', 80, 0], [large.id, 'Large cabbage', 150, 3]]);
  assert.equal(detail.price, 150);
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  await service.addSellerProduct(store.owner, { ...draft, priceOptions: [{ label: 'Small cabbage', price: 80, stockQuantity: 3, weightKg: 1 }] });
  const payload = JSON.parse(requests.find(item => item.init.method === 'POST' && item.path.endsWith('/manage/')).init.body);
  assert.deepEqual(payload.price_options, [{ label: 'Small cabbage', price: '80.00', stock_quantity: 3, weight_kg: '1.000' }]);
});

test('legacy archived product measurements can be supplied when republishing', async () => {
  const archived = { ...product, status: 'archived', length_cm: null, width_cm: null, height_cm: null };
  const { api, service, requests } = harness((route, init) => {
    if (route.pathname.endsWith('/products/manage/product-id/') && (!init.method || init.method === 'GET')) return json(archived);
    if (route.pathname.endsWith('/products/manage/product-id/') && init.method === 'PATCH') return json({
      ...archived, status: 'published', length_cm: '25.00', width_cm: '20.00', height_cm: '15.00',
    });
    return undefined;
  });
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  const owned = await service.fetchOwnedProductById(product.id);
  assert.equal(owned.status, 'archived');
  assert.equal(owned.lengthCm, undefined);
  const restored = await service.updateSellerProduct(store.owner, product.id, {
    ...draft, status: 'published', lengthCm: 25, widthCm: 20, heightCm: 15,
  });
  assert.equal(restored.status, 'published');
  const update = requests.find(item => item.path.endsWith('/products/manage/product-id/') && item.init.method === 'PATCH');
  const body = JSON.parse(update.init.body);
  assert.deepEqual([body.status, body.length_cm, body.width_cm, body.height_cm],
    ['published', '25.00', '20.00', '15.00']);
});

test('archived products can be republished with weight and no dimensions', async () => {
  const archived = { ...product, status: 'archived', length_cm: null, width_cm: null, height_cm: null };
  const { api, service, requests } = harness((route, init) => {
    if (route.pathname.endsWith('/products/manage/product-id/') && init.method === 'PATCH') {
      return json({ ...archived, status: 'published' });
    }
    return undefined;
  });
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  const restored = await service.updateSellerProduct(store.owner, product.id, {
    ...draft, status: 'published', lengthCm: undefined, widthCm: undefined, heightCm: undefined,
  });
  assert.equal(restored.status, 'published');
  assert.equal(restored.lengthCm, undefined);
  const update = requests.find(item => item.path.endsWith('/products/manage/product-id/') && item.init.method === 'PATCH');
  const body = JSON.parse(update.init.body);
  assert.equal(body.weight_kg, '1.250');
  assert.deepEqual([body.length_cm, body.width_cm, body.height_cm], [null, null, null]);
});

test('seller UI exposes listing status and makes current visibility explicit', () => {
  const editor = readFileSync(path.join(__dirname, '../src/screens/seller/AddEditProduct.tsx'), 'utf8');
  const management = readFileSync(path.join(__dirname, '../src/screens/seller/ProductManagement.tsx'), 'utf8');
  for (const status of ['draft', 'published', 'archived']) assert.match(editor, new RegExp(`value: '${status}'`));
  assert.match(editor, /accessibilityRole="radio"/);
  assert.match(editor, /status === 'published' \? 'Publish Product' : 'Save Draft'/);
  assert.doesNotMatch(editor, /label="Product URL slug"|label="SKU"/);
  assert.match(editor, /accessibilityLabel="Add product images"/);
  assert.match(management, /\{item\.status\}/);
});

test('seller can add a missing main and child category through the authenticated path endpoint', async () => {
  const { api, service, requests } = harness();
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  const result = await service.createCategoryPath({ parentId: category.id, childName: 'Farm Tools' });
  assert.equal(result.parent.id, category.id);
  assert.equal(result.child.id, childCategory.id);
  const request = requests.find(item => item.path.endsWith('/categories/path/'));
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers.get('Authorization'), 'Bearer seller-access');
  assert.deepEqual(JSON.parse(request.init.body), { parent: category.id, child_name: 'Farm Tools' });
});

test('messaging is absent from active buyer and seller navigation', () => {
  const appTabs = readFileSync(path.join(__dirname, '../src/navigation/AppTabs.tsx'), 'utf8');
  const shell = readFileSync(path.join(__dirname, '../src/components/layout/MarketplaceShell.tsx'), 'utf8');
  const profile = readFileSync(path.join(__dirname, '../src/screens/profile/Profile.tsx'), 'utf8');
  const sellerStore = readFileSync(path.join(__dirname, '../src/screens/home/SellerStore.tsx'), 'utf8');
  for (const source of [appTabs, shell, profile, sellerStore]) assert.doesNotMatch(source, /MessagesStack|Message seller|My Messages|tab: 'Messages'/);
});

test('product image upload uses multipart without a forced Content-Type', async () => {
  const { api, service, requests } = harness();
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  await service.uploadProductImages(product.id, [{ uri: 'file:///rug.jpg', fileName: 'rug.jpg', mimeType: 'image/jpeg', fileSize: 1500 }]);
  const upload = requests.find(item => item.path.endsWith('/images/'));
  assert.equal(upload.init.method, 'POST');
  assert.equal(upload.init.headers.get('Content-Type'), null);
  assert.equal(upload.init.headers.get('Authorization'), 'Bearer seller-access');
  assert.ok(upload.init.body instanceof FormData);
  await assert.rejects(service.uploadProductImages(product.id, [{ uri: 'file:///huge.jpg', fileSize: 6 * 1024 * 1024 }]), /5 MB/);
});

test('seller can identify and manage saved product and service photos by image ID', async () => {
  const imageId = '11111111-1111-4111-8111-111111111111';
  const serviceId = '22222222-2222-4222-8222-222222222222';
  const { api, service, load, requests } = harness((route, init) => {
    if (route.pathname.endsWith('/products/manage/product-id/') && (!init.method || init.method === 'GET')) {
      return json({ ...product, images: [{ id: imageId, image: '/media/rug.png', is_primary: true, display_order: 0 }] });
    }
    if (route.pathname.endsWith(`/images/${imageId}/`)) {
      return init.method === 'DELETE' ? new Response(null, { status: 204 }) : json({ is_primary: true });
    }
    return undefined;
  });
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  const owned = await service.fetchOwnedProductById(product.id);
  assert.equal(owned.imageRecords[0].id, imageId);
  assert.equal(owned.imageRecords[0].isPrimary, true);
  await service.setProductCover(product.id, imageId);
  await service.deleteProductImage(product.id, imageId);
  const services = load('services/serviceService.ts').serviceService;
  await services.setCover(serviceId, imageId);
  await services.deleteImage(serviceId, imageId);
  const photoRequests = requests.filter(item => item.path.endsWith(`/images/${imageId}/`));
  assert.deepEqual(photoRequests.map(item => item.init.method), ['PATCH', 'DELETE', 'PATCH', 'DELETE']);
  assert.ok(photoRequests.every(item => item.init.headers.get('Authorization') === 'Bearer seller-access'));
  const editor = readFileSync(path.join(__dirname, '../src/screens/seller/AddEditProduct.tsx'), 'utf8');
  const serviceEditor = readFileSync(path.join(__dirname, '../src/screens/seller/ServiceManagement.tsx'), 'utf8');
  assert.match(editor, /Remove product photo/);
  assert.match(serviceEditor, /Remove service photo/);
});

test('validation errors and unauthorized seller mutations are reported', async () => {
  const invalid = harness((route, init) => route.pathname.endsWith('/manage/') && init.method === 'POST' ? json({ slug: ['Already exists'] }, 400) : undefined);
  await assert.rejects(invalid.service.addSellerProduct(store.owner, draft), error => error.status === 400 && /Already exists/.test(error.message));
  const forbidden = harness((route, init) => route.pathname.endsWith('/manage/') && init.method === 'POST' ? json({ detail: 'Seller role required' }, 403) : undefined);
  await assert.rejects(forbidden.service.addSellerProduct(store.owner, draft), error => error.status === 403);
});

test('store update uses PATCH and seller access', async () => {
  const { api, service, requests } = harness((route, init) => route.pathname.endsWith('/stores/artisan-shop/') && init.method === 'PATCH' ? json({ ...store, name: 'New Name' }) : undefined);
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  assert.equal((await service.updateStore(store.slug, { name: 'New Name' })).name, 'New Name');
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer seller-access');
});

test('cache invalidation covers public, owned, listing and detail keys', async () => {
  const { queries } = harness();
  const client = new QueryClient();
  const keys = [queries.catalogKeys.products, queries.catalogKeys.productsFiltered('handmade', 'woven'), queries.catalogKeys.storeProducts(store.id), queries.catalogKeys.ownedProducts(store.owner), queries.catalogKeys.product(product.slug), queries.catalogKeys.ownedProduct(product.id)];
  try {
    keys.forEach(key => client.setQueryData(key, [product]));
    await queries.invalidateCatalog(client, store.owner, store.id, product.slug, product.id);
    keys.forEach(key => assert.equal(client.getQueryState(key).isInvalidated, true));
  } finally { client.clear(); }
});

test('unsupported DELETE is absent from the seller catalog service and screen', () => {
  const { service } = harness();
  assert.equal(service.deleteSellerProduct, undefined);
  assert.doesNotMatch(readFileSync(path.join(__dirname, '../src/screens/seller/ProductManagement.tsx'), 'utf8'), /confirmDelete|Delete product/);
});
