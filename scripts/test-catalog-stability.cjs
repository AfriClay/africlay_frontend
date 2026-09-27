const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
const { TabRouter, CommonActions } = require('@react-navigation/routers');

const category = { id: 'category-id', slug: 'handmade', name: 'Handmade', parent: null };
const tag = { id: 'tag-id', slug: 'woven', name: 'Woven' };
const store = { id: 'store-id', owner: 'seller-id', slug: 'artisan-shop', name: 'Artisan Shop', description: 'Handmade goods', city: 'Nairobi', country: 'Kenya', logo: '/media/logo.png', banner: null, average_rating: '4.25', total_reviews: 4, total_products: 1, status: 'active' };
const product = { id: 'product-id', store: store.id, category: category.id, tags: [tag.id], images: [{ image: '/media/rug.png', is_primary: true, display_order: 1 }, { image: null, is_primary: false, display_order: 2 }], name: 'Sisal Rug', slug: 'sisal-rug', description: 'Handwoven', sku: 'RUG-001', price: '3200.50', currency: 'KES', stock_quantity: 5, status: 'published', average_rating: 4.5, review_count: 12 };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

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
        if (route.pathname.endsWith('/tags/')) return json([tag]);
        if (route.pathname.endsWith('/products/')) return json([product]);
        if (route.pathname.endsWith('/stores/')) return json([store]);
        if (route.pathname.endsWith('/stores/artisan-shop/')) return json(store);
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
    api, service, requests, storage,
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
  assert.equal(items[0].currency, 'KES');
  assert.equal(items[0].availableQuantity, 5);
  assert.equal(items[0].rating, 4.5);
  assert.equal(items[0].reviewCount, 12);
  assert.deepEqual(Array.from(items[0].images), ['https://api.example.test/media/rug.png']);
  assert.equal(requests.find(item => item.path === '/api/products/').init.credentials, 'omit');
});

test('public product detail navigates by slug and missing detail is null', async () => {
  const { service, requests } = harness(route => route.pathname.endsWith('/products/removed/') ? json({ detail: 'Not found' }, 404) : undefined);
  assert.equal((await service.fetchProductById('sisal-rug')).id, product.id);
  assert.equal(requests[0].path, '/api/products/sisal-rug/');
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
});

test('desktop category menu keeps hierarchy while mobile opens products from compact categories', () => {
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
  assert.match(listing, /\{!isExpanded && <ScrollView horizontal/);
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
  assert.equal(products[1].search.toString(), '');
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
  assert.equal(sellers[0].ownerId, store.owner);
  assert.equal(sellers[0].verified, false);
  assert.equal(sellers[0].logoUrl, 'https://api.example.test/media/logo.png');
  assert.equal((await service.fetchSeller(store.id)).name, store.name);
  assert.ok(requests.some(item => item.path === '/api/stores/artisan-shop/'));
  assert.equal((await service.fetchOwnStore(store.owner)).id, store.id);
});

test('store products use public products and the real store UUID', async () => {
  const { service } = harness();
  assert.equal((await service.fetchProductsBySeller(store.id)).length, 1);
  assert.equal((await service.fetchProductsBySeller('another-store')).length, 0);
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

const draft = { name: 'Sisal Rug', slug: 'sisal-rug', sku: 'RUG-001', description: 'Handwoven', categoryId: category.id, tagIds: [tag.id], price: 3200.5, availableQuantity: 5, status: 'draft' };

test('create and update use backend fields, POST and PATCH, not local storage', async () => {
  const { api, service, requests, storage } = harness((route, init) => route.pathname.includes('/manage/') && ['POST', 'PATCH'].includes(init.method) ? json({ ...product, status: 'draft' }, init.method === 'POST' ? 201 : 200) : undefined);
  await api.tokenManager.setTokens({ access: 'seller-access', refresh: 'seller-refresh' });
  await service.addSellerProduct(store.owner, draft);
  await service.updateSellerProduct(store.owner, product.id, { ...draft, status: 'published' });
  const mutations = requests.filter(item => item.init.method === 'POST' || item.init.method === 'PATCH');
  assert.deepEqual(mutations.map(item => [item.path, item.init.method]), [['/api/products/manage/', 'POST'], ['/api/products/manage/product-id/', 'PATCH']]);
  assert.deepEqual(JSON.parse(mutations[0].init.body), { name: 'Sisal Rug', slug: 'sisal-rug', sku: 'RUG-001', description: 'Handwoven', category: category.id, tags: [tag.id], price: '3200.50', currency: 'KES', stock_quantity: 5, status: 'draft' });
  assert.equal(JSON.parse(mutations[1].init.body).status, 'published');
  assert.equal(mutations[0].init.headers.get('Authorization'), 'Bearer seller-access');
  assert.equal(storage.has('africlay-seller-catalog-v1'), false);
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
