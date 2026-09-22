const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const buyer = '11111111-1111-4111-8111-111111111111';
const product = '22222222-2222-4222-8222-222222222222';
const cartId = '33333333-3333-4333-8333-333333333333';
const itemId = '44444444-4444-4444-8444-444444444444';
const addressId = '55555555-5555-4555-8555-555555555555';
const orderId = '66666666-6666-4666-8666-666666666666';
const orderItemId = '77777777-7777-4777-8777-777777777777';
const cartItem = { id: itemId, product, product_name: 'Clay Tile', product_slug: 'clay-tile', product_price: '1200.00', quantity: 2 };
const cart = { id: cartId, buyer, items: [cartItem] };
const address = { id: addressId, address_type: 'shipping', recipient_name: 'Test Buyer', phone_number: '',
  street_address: 'Main Street 12', apartment_suite: null, city: 'Nairobi', state_province: '',
  postal_code: '00100', country: 'Kenya', country_code: 'KE', is_default: true };
const order = { id: orderId, buyer_id: buyer, total_amount: '2400.00', currency: 'KES', status: 'pending',
  shipping_address: address.street_address, shipping_city: address.city, shipping_postal_code: address.postal_code,
  shipping_country: address.country, created_at: '2026-09-20T08:00:00Z',
  items: [{ id: orderItemId, product_id: product, product_name: 'Clay Tile', product_slug: 'clay-tile', seller_id: buyer,
    quantity: 2, price_at_purchase: '1200.00' }] };
const checkoutPayload = { shipping_address: address.street_address, shipping_city: address.city,
  shipping_postal_code: address.postal_code, shipping_country: address.country };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

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
        if (responder) {
          const response = await responder(route.pathname, init);
          if (response) return response;
        }
        if (route.pathname === '/api/cart/' && init.method !== 'POST') return json(cart);
        if (route.pathname === '/api/cart/items/' && init.method === 'POST') return json(cartItem, 201);
        if (route.pathname === `/api/cart/items/${itemId}/` && init.method === 'PATCH') return json({ ...cartItem, quantity: 3 });
        if (route.pathname === `/api/cart/items/${itemId}/` && init.method === 'DELETE') return new Response(null, { status: 204 });
        if (route.pathname === '/api/auth/addresses/' && init.method === 'POST') return json(address, 201);
        if (route.pathname === '/api/auth/addresses/') return json([address]);
        if (route.pathname === `/api/auth/addresses/${addressId}/` && init.method === 'PATCH') return json({ ...address, city: 'Mombasa' });
        if (route.pathname === `/api/auth/addresses/${addressId}/` && init.method === 'DELETE') return new Response(null, { status: 204 });
        if (route.pathname === '/api/cart/checkout/') return json(order, 201);
        if (route.pathname === '/api/cart/orders/') return json([order]);
        if (route.pathname === `/api/cart/orders/${orderId}/`) return json(order);
        throw new Error(`Unexpected route ${route.pathname}`);
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
  const carts = load('services/cartService.ts').cartService;
  const addresses = load('services/addressService.ts').addressService;
  const orders = load('services/orderService.ts').orderService;
  return { api, carts, addresses, orders, requests, storage };
}

async function signedIn(responder) {
  const h = harness(responder);
  await h.api.tokenManager.setTokens({ access: 'test-access', refresh: 'test-refresh' });
  return h;
}

test('cart load maps backend item IDs, product IDs, quantities, and decimal prices', async () => {
  const h = await signedIn();
  const result = await h.carts.fetchCart();
  assert.equal(result.buyerId, buyer);
  assert.equal(result.items[0].id, itemId);
  assert.equal(result.items[0].productId, product);
  assert.equal(result.items[0].price, 1200);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(h.requests[0].path, '/api/cart/');
});

test('cart add sends only product UUID and quantity with bearer', async () => {
  const h = await signedIn();
  await h.carts.addItem(product, 2);
  const request = h.requests[0];
  assert.deepEqual(JSON.parse(request.init.body), { product, quantity: 2 });
  assert.equal(request.init.headers.get('Authorization'), 'Bearer test-access');
});

test('quantity patch targets cart item UUID and returns server quantity', async () => {
  const h = await signedIn();
  const result = await h.carts.updateQuantity(itemId, 3);
  assert.equal(result.quantity, 3);
  assert.equal(h.requests[0].path, `/api/cart/items/${itemId}/`);
  assert.deepEqual(JSON.parse(h.requests[0].init.body), { quantity: 3 });
});

test('remove deletes the owned cart item', async () => {
  const h = await signedIn();
  await h.carts.removeItem(itemId);
  assert.equal(h.requests[0].init.method, 'DELETE');
  assert.equal(h.requests[0].path, `/api/cart/items/${itemId}/`);
});

test('cart stock error propagates instead of returning a local item', async () => {
  const h = await signedIn(path => path === '/api/cart/items/' ? json({ quantity: 'Only 1 items available.' }, 400) : undefined);
  await assert.rejects(h.carts.addItem(product, 2), error => error.status === 400 && /Only 1/.test(error.message));
});

test('unauthorized cart and malformed response do not fall back to mock data', async () => {
  const unauthorized = harness(path => path === '/api/cart/' ? json({ detail: 'Authentication required.' }, 401) : undefined);
  await assert.rejects(unauthorized.carts.fetchCart(), error => error.status === 401);
  const malformed = await signedIn(path => path === '/api/cart/' ? json({ items: [] }) : undefined);
  await assert.rejects(malformed.carts.fetchCart(), /commerce response/);
});

test('saved addresses load both plain and paginated lists', async () => {
  const plain = await signedIn();
  assert.equal((await plain.addresses.list())[0].id, addressId);
  const paged = await signedIn(path => path === '/api/auth/addresses/' ? json({ results: [address] }) : undefined);
  assert.equal((await paged.addresses.list()).length, 1);
});

test('address create uses backend fields', async () => {
  const h = await signedIn();
  await h.addresses.create({ street_address: 'Main Street 12', city: 'Nairobi', country: 'Kenya', postal_code: '00100' });
  assert.equal(h.requests[0].path, '/api/auth/addresses/');
  assert.equal(JSON.parse(h.requests[0].init.body).street_address, 'Main Street 12');
});

test('address update and deletion use the owned address UUID', async () => {
  const h = await signedIn();
  assert.equal((await h.addresses.update(addressId, { city: 'Mombasa' })).city, 'Mombasa');
  await h.addresses.remove(addressId);
  assert.equal(h.requests[0].path, `/api/auth/addresses/${addressId}/`);
  assert.equal(h.requests[1].init.method, 'DELETE');
});

test('checkout submits four shipping fields and keeps real pending order ID and totals', async () => {
  const h = await signedIn();
  const result = await h.orders.checkout(checkoutPayload);
  assert.equal(h.requests[0].path, '/api/cart/checkout/');
  assert.deepEqual(JSON.parse(h.requests[0].init.body), checkoutPayload);
  assert.equal(result.id, orderId);
  assert.equal(result.status, 'pending');
  assert.equal(result.total, 2400);
  assert.equal(result.items[0].sellerId, buyer);
});

test('checkout validation and network failures propagate without a fake success', async () => {
  const invalid = await signedIn(path => path === '/api/cart/checkout/' ? json({ shipping_postal_code: ['Required.'] }, 400) : undefined);
  await assert.rejects(invalid.orders.checkout(checkoutPayload), error => error.status === 400);
  const network = await signedIn(path => { if (path === '/api/cart/checkout/') throw new TypeError('Network failed'); });
  await assert.rejects(network.orders.checkout(checkoutPayload), /Network failed/);
});

test('concurrent checkout calls send only one POST', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const h = await signedIn(async path => { if (path === '/api/cart/checkout/') { await gate; return json(order, 201); } });
  const first = h.orders.checkout(checkoutPayload);
  await assert.rejects(h.orders.checkout(checkoutPayload), /already in progress/);
  release();
  await first;
  assert.equal(h.requests.filter(request => request.path === '/api/cart/checkout/').length, 1);
});

test('buyer list and detail keep backend statuses, item references, and prices', async () => {
  const h = await signedIn();
  const list = await h.orders.fetchOrders();
  assert.equal(list[0].status, 'pending');
  assert.equal(list[0].items[0].productId, product);
  assert.equal((await h.orders.fetchOrderById(orderId)).id, orderId);
});

test('missing order returns null, but server failures do not return mock orders', async () => {
  const missing = await signedIn(path => path.endsWith(`/orders/${orderId}/`) ? json({ detail: 'Not found' }, 404) : undefined);
  assert.equal(await missing.orders.fetchOrderById(orderId), null);
  const failed = await signedIn(path => path === '/api/cart/orders/' ? json({ detail: 'Unavailable' }, 500) : undefined);
  await assert.rejects(failed.orders.fetchOrders(), error => error.status === 500);
});

test('seller order and cart clear methods are absent when the backend has no route', async () => {
  const h = await signedIn();
  assert.equal(h.orders.fetchSellerOrders, undefined);
  assert.equal(h.orders.updateSellerOrderStatus, undefined);
  assert.equal(h.carts.clearCart, undefined);
});
