const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const adminId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const storeId = '33333333-3333-4333-8333-333333333333';
const kycId = 1;
const categoryId = '55555555-5555-4555-8555-555555555555';
const store = { id: storeId, owner: ownerId, name: 'Admin Review Studio', slug: 'admin-review-studio',
  description: '', city: 'Nairobi', country: 'Kenya', status: 'active', average_rating: '0.00',
  total_reviews: 0, total_orders: 0, total_products: 2 };
const kyc = { id: kycId, store: storeId, business_name: 'Admin Review Studio',
  business_registration_number: 'REG-1', tax_identification_number: 'TAX-1',
  document_type: 'business_registration', document: '/media/kyc/review.pdf', status: 'pending',
  submitted_at: '2026-09-21T08:00:00Z', reviewed_at: null, reviewed_by: null, rejection_reason: '' };
const category = { id: categoryId, name: 'Ceramics', slug: 'ceramics', description: 'Clay products',
  parent: null, display_order: 1 };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

function harness(responder) {
  const requests = [];
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
        requests.push({ path: route.pathname, init });
        const response = await responder(route.pathname, init);
        if (!response) throw new Error(`Unexpected route ${route.pathname}`);
        return response;
      },
      require(name) {
        if (name === 'react-native') return { Platform: { OS: 'web' } };
        if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), `${name}.ts`)));
        return require(name);
      },
    });
    return exports;
  }
  return {
    api: load('services/api.ts'), admin: load('services/adminService.ts').adminService,
    auth: load('services/authService.ts'), requests, storage,
  };
}

test('backend admin and super-admin roles remain intact in frontend auth mapping', () => {
  const h = harness(() => undefined);
  assert.equal(h.auth.mapBackendUser({ id: adminId, email: 'admin@example.test', role: 'admin', is_verified: true }).role, 'admin');
  assert.equal(h.auth.mapBackendUser({ id: adminId, email: 'admin@example.test', role: 'super_admin', is_verified: true }).role, 'super_admin');
});

test('KYC queue aggregates active stores, uses admin bearer, and skips stores without submissions', async () => {
  const secondStore = { ...store, id: '66666666-6666-4666-8666-666666666666', owner: '77777777-7777-4777-8777-777777777777', slug: 'no-kyc', name: 'No KYC' };
  const h = harness((route) => {
    if (route === '/api/stores/') return json([store, secondStore]);
    if (route === '/api/stores/admin-review-studio/kyc/') return json(kyc);
    if (route === '/api/stores/no-kyc/kyc/') return json({ detail: 'Not found.' }, 404);
  });
  await h.api.tokenManager.setTokens({ access: 'admin-access', refresh: 'admin-refresh' });
  const queue = await h.admin.listKyc();
  assert.equal(queue.length, 1);
  assert.equal(queue[0].storeName, store.name);
  assert.equal(queue[0].documentUrl, 'https://api.example.test/media/kyc/review.pdf');
  const request = h.requests.find(item => item.path.endsWith('/kyc/'));
  assert.equal(request.init.headers.get('Authorization'), 'Bearer admin-access');
});

test('KYC approval and reason-required rejection use the review endpoint', async () => {
  const h = harness((route, init) => {
    if (route === '/api/stores/admin-review-studio/kyc/review/') {
      const body = JSON.parse(init.body);
      return json({ ...kyc, status: body.decision, rejection_reason: body.rejection_reason ?? '', reviewed_by: adminId });
    }
    if (route === '/api/stores/') return json([store]);
  });
  await h.api.tokenManager.setTokens({ access: 'admin-access', refresh: 'admin-refresh' });
  assert.equal((await h.admin.reviewKyc(store.slug, 'approved')).status, 'approved');
  assert.deepEqual(JSON.parse(h.requests[0].init.body), { decision: 'approved' });
  assert.equal((await h.admin.reviewKyc(store.slug, 'rejected', 'Document is unreadable.')).status, 'rejected');
  assert.deepEqual(JSON.parse(h.requests[2].init.body), { decision: 'rejected', rejection_reason: 'Document is unreadable.' });
});

test('taxonomy create and edit use only backend-supported admin mutations', async () => {
  const h = harness((route, init) => {
    if (route === '/api/products/categories/' && !init.method) return json([category]);
    if (route === '/api/products/categories/' && init.method === 'POST') return json(category, 201);
    if (route === `/api/products/categories/${categoryId}/` && init.method === 'PATCH') return json({ ...category, name: 'Clay & Ceramics' });
  });
  await h.api.tokenManager.setTokens({ access: 'admin-access', refresh: 'admin-refresh' });
  assert.equal((await h.admin.listTaxonomy('product-categories'))[0].displayOrder, 1);
  await h.admin.createTaxonomy('product-categories', { name: category.name, slug: category.slug, description: category.description, displayOrder: 1 });
  const created = JSON.parse(h.requests[1].init.body);
  assert.deepEqual(created, { name: 'Ceramics', slug: 'ceramics', description: 'Clay products', parent: null, display_order: 1 });
  assert.equal(h.requests[1].init.headers.get('Authorization'), 'Bearer admin-access');
  const updated = await h.admin.updateTaxonomy('product-categories', categoryId, { name: 'Clay & Ceramics', slug: 'ceramics', displayOrder: 1 });
  assert.equal(updated.name, 'Clay & Ceramics');
  assert.equal(h.requests[2].path, `/api/products/categories/${categoryId}/`);
  assert.equal(h.requests[2].init.method, 'PATCH');
});

test('root routing isolates admin sessions from marketplace tabs', () => {
  const root = readFileSync(path.resolve(__dirname, '../src/navigation/RootNavigator.tsx'), 'utf8');
  const app = readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
  assert.match(root, /role === 'admin'.*role === 'super_admin'/s);
  assert.match(root, /isAdmin \? \(\s*<Stack\.Screen name="AdminPortal"/s);
  assert.match(root, /isAdmin \? navigator : <MarketplaceShell/);
  assert.match(app, /role === 'admin'.*role === 'super_admin'.*navigator : <CartProvider>/s);
});
