const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
const { TabRouter, CommonActions } = require('@react-navigation/routers');

function loadCatalog() {
  const storage = new Map();
  const modules = new Map();
  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, require(name) {
      if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: {
        getItem: async key => storage.get(key) ?? null,
        setItem: async (key, value) => { storage.set(key, value); },
      } };
      if (name === './api') return { simulateNetwork: async value => value };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
      return require(name);
    } });
    return exports;
  }
  return { service: load('services/productService.ts').productService, contract: load('services/catalogContract.ts'),
    queries: load('services/catalogQueries.ts'), storage };
}

const key = 'africlay-seller-catalog-v1';
const valid = { id: 'p1', name: 'Test product', category: 'Handmade', currency: 'KSh', price: 10, sellerId: 's1' };

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

test('missing records resolve to null and are valid React Query results', async () => {
  const { service } = loadCatalog();
  const client = new QueryClient();
  try {
    for (const [kind, queryFn] of [['seller', service.fetchSeller], ['product', service.fetchProductById], ['service', service.fetchServiceById]]) {
      assert.equal(await client.fetchQuery({ queryKey: [kind, 'missing'], queryFn: () => queryFn('missing'), retry: false }), null);
    }
  } finally { client.clear(); }
});

test('incomplete display fields and bad image entries normalize without fake prices', () => {
  const { contract } = loadCatalog();
  const item = contract.readProducts([{ ...valid, images: [null, '', '  https://example.invalid/image.jpg  ', 1] }])[0];
  assert.equal(item.images.length, 1);
  assert.equal(item.description, '');
  assert.equal(item.price, 10);
  assert.throws(() => contract.readProducts([{ ...valid, price: undefined }]), /Catalog data/);
  assert.throws(() => contract.readProducts([null]), /Catalog data/);
  assert.throws(() => contract.readProducts([{ ...valid, price: NaN }]), /Catalog data/);
});

test('corrupt stored catalog is not overwritten by a mutation', async () => {
  const { service, storage } = loadCatalog();
  for (const corrupt of ['{broken', 'null', JSON.stringify({ initializedSellerIds: [], products: [null] })]) {
    storage.set(key, corrupt);
    await assert.rejects(service.initializeSellerCatalog('s1'), /Catalog data/);
    assert.equal(storage.get(key), corrupt);
  }
});

test('fresh catalog reads do not reuse mutable state after storage is removed', async () => {
  const { service, storage } = loadCatalog();
  await service.initializeSellerCatalog('s1');
  storage.clear();
  const items = await service.fetchProducts();
  assert.equal(items.some(item => item.sellerId === 's1'), false);
});

test('catalog mutation invalidation covers public, owned, listing and detail caches', async () => {
  const { queries } = loadCatalog();
  const client = new QueryClient();
  const keys = [queries.catalogKeys.products, queries.catalogKeys.storeProducts('s1'), queries.catalogKeys.ownedProducts('s1'), queries.catalogKeys.product('p1')];
  try {
    keys.forEach(key => client.setQueryData(key, [valid]));
    client.setQueryData(queries.catalogKeys.storeProducts('other'), []);
    await queries.invalidateCatalog(client, 's1', 'p1');
    keys.forEach(key => assert.equal(client.getQueryState(key).isInvalidated, true));
    assert.equal(client.getQueryState(queries.catalogKeys.storeProducts('other')).isInvalidated, false);
  } finally { client.clear(); }
});

test('updated and deleted products return the current catalog state', async () => {
  const { service, storage } = loadCatalog();
  storage.set(key, JSON.stringify({ initializedSellerIds: ['s1'], products: [valid] }));
  await service.updateSellerProduct('s1', 'p1', { ...valid, name: 'Updated', images: [], availableQuantity: 1, description: '' });
  assert.equal((await service.fetchProductById('p1')).name, 'Updated');
  await service.deleteSellerProduct('s1', 'p1');
  assert.equal(await service.fetchProductById('p1'), null);
  assert.equal((await service.fetchProductsBySeller('s1')).length, 0);
});
