const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const userId = '11111111-1111-4111-8111-111111111111';
const productId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const serviceId = '44444444-4444-4444-8444-444444444444';
const bookingId = '55555555-5555-4555-8555-555555555555';
const notificationId = '66666666-6666-4666-8666-666666666666';
const reviewId = '77777777-7777-4777-8777-777777777777';
const now = '2026-09-27T09:00:00Z';
const wishlistItem = { id: itemId, product: productId, product_name: 'Clay Pot', product_slug: 'clay-pot', product_price: '1250.00', created_at: now };
const notification = { id: notificationId, notification_type: 'booking', title: 'Booking confirmed', message: 'Your booking was confirmed.', is_read: false,
  action: 'buyer_bookings', target_id: bookingId, target_slug: '', created_at: now };
const review = { id: reviewId, reviewer_email: 'buyer@example.com', rating: 5, comment: 'Excellent', product: productId, service: null, store: null, created_at: now, updated_at: now };
const booking = { id: bookingId, service: serviceId, customer_id: userId, service_name: 'Pottery lesson', scheduled_at: '2026-10-01T10:00:00Z', notes: 'First visit', status: 'pending', created_at: now, updated_at: now };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

function harness() {
  const requests = [];
  const storage = new Map();
  const modules = new Map();
  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, {
      exports, Headers, FormData, URLSearchParams,
      process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/api' } },
      localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
      fetch: async (url, init) => {
        const route = new URL(url);
        requests.push({ path: route.pathname, search: route.search, init });
        if (route.pathname === '/api/cart/wishlist/' ) return json({ id: userId, items: [wishlistItem], created_at: now, updated_at: now });
        if (route.pathname === '/api/cart/wishlist/items/' && init.method === 'POST') return json(wishlistItem, 201);
        if (route.pathname === '/api/cart/wishlist/items/') return json([wishlistItem]);
        if (route.pathname === `/api/cart/wishlist/items/${itemId}/`) return new Response(null, { status: 204 });
        if (route.pathname === '/api/notifications/mark-all-read/') return json({ marked_read: 1 });
        if (route.pathname === `/api/notifications/${notificationId}/`) return json({ ...notification, is_read: true });
        if (route.pathname === '/api/notifications/') return json([notification]);
        if (route.pathname === '/api/reviews/' && init.method === 'POST') return json(review, 201);
        if (route.pathname === '/api/reviews/') return json([review]);
        if (route.pathname === `/api/reviews/${reviewId}/` && init.method === 'PATCH') return json({ ...review, rating: 4 });
        if (route.pathname === `/api/reviews/${reviewId}/`) return new Response(null, { status: 204 });
        if (route.pathname === '/api/services/bookings/' && init.method === 'POST') return json(booking, 201);
        if (route.pathname === '/api/services/bookings/') return json([booking]);
        if (route.pathname === `/api/services/bookings/${bookingId}/`) return new Response(null, { status: 204 });
        if (route.pathname === '/api/services/seller/bookings/') return json([booking]);
        if (route.pathname === `/api/services/seller/bookings/${bookingId}/`) return json({ ...booking, status: 'confirmed' });
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
  return { api, requests, wishlist: load('services/wishlistService.ts').wishlistService, notifications: load('services/notificationService.ts').notificationService, reviews: load('services/reviewService.ts').reviewService, bookings: load('services/bookingService.ts').bookingService };
}

async function signedIn() {
  const h = harness();
  await h.api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  return h;
}

test('wishlist maps items and uses product and item UUIDs correctly', async () => {
  const h = await signedIn();
  assert.equal((await h.wishlist.listItems())[0].productPrice, 1250);
  await h.wishlist.add(productId);
  await h.wishlist.remove(itemId);
  assert.deepEqual(JSON.parse(h.requests[1].init.body), { product: productId });
  assert.equal(h.requests[2].path, `/api/cart/wishlist/items/${itemId}/`);
});

test('notifications support unread filtering and both read operations', async () => {
  const h = await signedIn();
  const listed = (await h.notifications.list(false))[0];
  assert.equal(listed.type, 'booking');
  assert.equal(listed.action, 'buyer_bookings');
  assert.equal(listed.targetId, bookingId);
  await h.notifications.markRead(notificationId);
  assert.equal(await h.notifications.markAllRead(), 1);
  assert.equal(h.requests[0].search, '?is_read=false');
  assert.deepEqual(JSON.parse(h.requests[1].init.body), { is_read: true });
});

test('reviews use the target query and create/update payloads', async () => {
  const h = await signedIn();
  assert.equal((await h.reviews.list({ type: 'product', id: productId }))[0].reviewerEmail, 'buyer@example.com');
  await h.reviews.create({ type: 'product', id: productId }, 5, 'Excellent');
  await h.reviews.update(reviewId, 4, 'Very good');
  assert.equal(h.requests[0].search, `?product=${productId}`);
  assert.deepEqual(JSON.parse(h.requests[1].init.body), { product: productId, rating: 5, comment: 'Excellent' });
  assert.deepEqual(JSON.parse(h.requests[2].init.body), { rating: 4, comment: 'Very good' });
});

test('customer and seller booking operations preserve IDs and status transitions', async () => {
  const h = await signedIn();
  assert.equal((await h.bookings.list())[0].serviceName, 'Pottery lesson');
  await h.bookings.create(serviceId, booking.scheduled_at, 'First visit');
  await h.bookings.cancel(bookingId);
  assert.equal((await h.bookings.listForSeller())[0].customerId, userId);
  assert.equal((await h.bookings.updateStatus(bookingId, 'confirmed')).status, 'confirmed');
  assert.deepEqual(JSON.parse(h.requests[1].init.body), { service: serviceId, scheduled_at: booking.scheduled_at, notes: 'First visit' });
  assert.deepEqual(JSON.parse(h.requests[4].init.body), { status: 'confirmed' });
});
