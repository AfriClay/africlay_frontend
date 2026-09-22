const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sellerId = '11111111-1111-4111-8111-111111111111';
const storeId = '22222222-2222-4222-8222-222222222222';
const serviceId = '33333333-3333-4333-8333-333333333333';
const categoryId = '44444444-4444-4444-8444-444444444444';
const conversationId = '55555555-5555-4555-8555-555555555555';
const buyerId = '66666666-6666-4666-8666-666666666666';
const messageId = '77777777-7777-4777-8777-777777777777';
const kycId = '88888888-8888-4888-8888-888888888888';
const service = { id: serviceId, store: storeId, category: categoryId, tags: [], images: [],
  name: 'Clay repair', slug: 'clay-repair', description: 'Repair service', price: '1500.00',
  currency: 'KES', duration_minutes: 60, status: 'published' };
const category = { id: categoryId, name: 'Repairs', slug: 'repairs', parent: null };
const store = { id: storeId, owner: sellerId, name: 'Clay Studio', slug: 'clay-studio', status: 'active' };
const kyc = { id: kycId, store: storeId, status: 'pending', document_type: 'national_id',
  document: '/media/kyc/id.png', rejection_reason: '', submitted_at: '2026-09-20T08:00:00Z' };
const buyer = { id: buyerId, full_name: 'Buyer', email: 'buyer@example.test' };
const seller = { id: sellerId, full_name: 'Seller', email: 'seller@example.test' };
const message = { id: messageId, conversation_id: conversationId, sender: seller, body: 'Hello',
  created_at: '2026-09-20T08:00:00Z', read_at: null, is_from_me: false };
const conversation = { id: conversationId, buyer, seller, last_message_at: message.created_at,
  unread_count: 1, last_message: { body: message.body }, messages: [message] };
const user = { id: buyerId, email: buyer.email, role: 'buyer', is_verified: true,
  profile: { first_name: 'Buyer', last_name: '', bio: 'Maker' } };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

function harness(respond) {
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
        const response = await respond(route.pathname, init);
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
  const api = load('services/api.ts');
  return {
    api, requests, storage,
    services: load('services/serviceService.ts').serviceService,
    stores: load('services/storeService.ts').storeService,
    messages: load('services/messageService.ts').messageService,
    auth: load('services/authService.ts').authService,
  };
}

const serviceReply = (route, init) => {
  if (route === '/api/services/categories/') return json([category]);
  if (route === '/api/services/' || route === '/api/services/manage/') return json([service]);
  if (route === '/api/services/clay-repair/' || route === `/api/services/manage/${serviceId}/`) return json(service);
  if (route === '/api/services/manage/' && init.method === 'POST') return json(service, 201);
  if (route === `/api/services/manage/${serviceId}/` && init.method === 'PATCH') return json(service);
  if (route === `/api/services/manage/${serviceId}/` && init.method === 'DELETE') return new Response(null, { status: 204 });
  if (route === `/api/services/manage/${serviceId}/images/`) return json({ id: messageId, image: '/media/service.png' }, 201);
};

test('public service list/detail parse Django values and reject malformed data', async () => {
  const h = harness(serviceReply);
  const listed = await h.services.list();
  assert.equal(listed[0].priceFrom, 1500);
  assert.equal(listed[0].category, 'Repairs');
  assert.equal((await h.services.detail('clay-repair')).id, serviceId);
  const malformed = harness(route => route === '/api/services/categories/' ? json([category]) : json([{ ...service, id: 'invalid' }]));
  await assert.rejects(malformed.services.list(), /Catalog data could not be read/i);
});

test('seller service create/edit/delete and image upload use real manage routes', async () => {
  const h = harness((route, init) => {
    if (route === '/api/services/manage/' && init.method === 'POST') return json(service, 201);
    if (route === `/api/services/manage/${serviceId}/` && init.method === 'PATCH') return json(service);
    if (route === `/api/services/manage/${serviceId}/` && init.method === 'DELETE') return new Response(null, { status: 204 });
    return serviceReply(route, init);
  });
  await h.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  const draft = { name: service.name, slug: service.slug, description: service.description,
    price: 1500, currency: 'KES', duration_minutes: 60, category: categoryId, tags: [], status: 'published' };
  assert.equal((await h.services.create(draft)).id, serviceId);
  assert.equal(JSON.parse(h.requests[0].init.body).price, '1500.00');
  assert.equal(h.requests[0].init.headers.get('Authorization'), 'Bearer access');
  await h.services.update(serviceId, draft);
  await h.services.uploadImages(serviceId, [{ uri: 'file:///image.png', fileName: 'image.png', mimeType: 'image/png' }]);
  await h.services.remove(serviceId);
  assert.ok(h.requests.some(request => request.path.endsWith('/images/') && request.init.body instanceof FormData));
  assert.ok(h.requests.some(request => request.path.endsWith(`/${serviceId}/`) && request.init.method === 'DELETE'));
});

test('store creation and KYC submit use multipart; rejected submission is not reported as success', async () => {
  const h = harness((route, init) => {
    if (route === '/api/stores/' && init.method === 'POST') return json(store, 201);
    if (route === '/api/stores/clay-studio/kyc/' && !init.method) return json(kyc);
    if (route === '/api/stores/clay-studio/kyc/submit/' && init.method === 'POST') return json(kyc, 201);
  });
  await h.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  assert.equal((await h.stores.create('Clay Studio')).slug, 'clay-studio');
  const created = h.requests[0];
  assert.ok(created.init.body instanceof FormData);
  assert.equal(created.init.body.get('slug'), 'clay-studio');
  assert.equal(created.init.headers.get('Content-Type'), null);
  assert.equal((await h.stores.kyc('clay-studio')).status, 'pending');
  const document = { uri: 'file:///id.png', fileName: 'id.png', mimeType: 'image/png' };
  assert.equal((await h.stores.submitKyc('clay-studio', { businessName: 'Clay Studio',
    registrationNumber: 'REG-1', taxNumber: 'TAX-1', documentType: 'national_id', document })).status, 'pending');
  const submitted = h.requests.at(-1);
  assert.equal(submitted.init.body.get('document_type'), 'national_id');
  assert.ok(submitted.init.body.has('document'));
  const rejected = harness(route => route.endsWith('/kyc/submit/') ? json({ document: ['Invalid file.'] }, 400) : json(store));
  await rejected.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  await assert.rejects(rejected.stores.submitKyc('clay-studio', { businessName: 'Clay Studio',
    registrationNumber: 'REG-1', taxNumber: 'TAX-1', documentType: 'national_id', document }), error => error.status === 400);
});

test('messaging uses conversation detail for messages and returns backend-confirmed send', async () => {
  const h = harness((route, init) => {
    if (route === '/api/messages/conversations/' && !init.method) return json({ results: [conversation] });
    if (route === '/api/messages/conversations/' && init.method === 'POST') return json(conversation, 201);
    if (route === `/api/messages/conversations/${conversationId}/`) return json(conversation);
    if (route === `/api/messages/conversations/${conversationId}/messages/` && init.method === 'POST') return json(message, 201);
  });
  await h.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  assert.equal((await h.messages.fetchConversations(buyerId))[0].name, 'Seller');
  await h.messages.createConversation({ seller_id: sellerId, store_id: storeId }, buyerId);
  assert.equal(JSON.parse(h.requests[1].init.body).store_id, storeId);
  assert.equal((await h.messages.fetchMessages(conversationId))[0].text, 'Hello');
  assert.equal((await h.messages.sendMessage(conversationId, 'Hello')).id, messageId);
  assert.deepEqual(JSON.parse(h.requests.at(-1).init.body), { body: 'Hello' });
  assert.equal(h.requests.filter(request => request.path.endsWith('/messages/')).length, 1);
});

test('profile PATCH sends only supported fields and maps returned server user', async () => {
  const h = harness(route => route === '/api/auth/me/' ? json({ message: 'Profile updated successfully.', user: { ...user,
    phone_number: '+254700000000', profile: { ...user.profile, first_name: 'New', last_name: 'Buyer' } } }) : undefined);
  await h.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  const updated = await h.auth.updateProfile({ name: 'New Buyer', phoneNumber: '+254700000000', bio: 'Maker', role: 'seller' });
  assert.equal(updated.name, 'New Buyer');
  assert.equal(updated.role, 'buyer');
  assert.deepEqual(JSON.parse(h.requests[0].init.body), {
    first_name: 'New', last_name: 'Buyer', phone_number: '+254700000000', bio: 'Maker',
  });
});

test('production source has no demo network adapter or mock import; unsupported routes stay hidden', () => {
  const sourceRoot = path.resolve(__dirname, '../src');
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'mock') continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (/\.tsx?$/.test(entry.name)) {
        const source = readFileSync(filename, 'utf8');
        assert.doesNotMatch(source, /simulateNetwork|from\s+['"][^'"]*mock\//, filename);
      }
    }
  }
  walk(sourceRoot);
  for (const file of ['navigation/ProfileStack.tsx', 'navigation/SellerDashboardStack.tsx', 'navigation/RootNavigator.tsx']) {
    assert.doesNotMatch(readFileSync(path.join(sourceRoot, file), 'utf8'), /Wallet|PaymentMethods|Notifications/, file);
  }
});
