const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

test('doorstep checkout requires server availability, a selected location, and a reviewed quote', () => {
  const checkout = readFileSync(path.resolve(__dirname, '../src/screens/cart/Checkout.tsx'), 'utf8');
  assert.match(checkout, /selectedPickup\?\.doorstep_available/);
  assert.match(checkout, /selectedHome!\.token/);
  assert.match(checkout, /expected_doorstep_quote_token/);
  assert.match(checkout, /doorstepDeliveryCost/);
  assert.doesNotMatch(checkout, /delivery_method: 'standard'/);
  assert.doesNotMatch(checkout, /addressService\.list/);
});

function harness(responder) {
  const requests = [];
  const modules = new Map();
  const storage = new Map([['africlay.accessToken', 'test-access']]);

  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, Headers, FormData, URLSearchParams, AbortController, setTimeout, clearTimeout,
      process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/api' } },
      localStorage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key),
      },
      fetch: async (url, init) => {
        const route = new URL(url);
        requests.push({ path: route.pathname, init });
        return responder(route, init);
      },
      require(name) {
        if (name === 'react-native') return { Platform: { OS: 'web' } };
        if (name.startsWith('.')) {
          return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), `${name}.ts`)));
        }
        return require(name);
      },
    });
    return exports;
  }

  return { service: load('services/paymentService.ts').paymentService, requests, load };
}

test('missing payout account is represented by null query data', async () => {
  const { service } = harness(route => {
    assert.equal(route.pathname, '/api/payments/payout-account/');
    return json(null);
  });

  assert.equal(await service.getPayoutAccount(), null);
});

test('wallet top-up sends the idempotency header and normalized phone', async () => {
  const attempt = {
    id: '11111111-1111-4111-8111-111111111111',
    amount: '270.00',
    currency: 'KES',
    phone_number: '254740155901',
    status: 'pending',
    provider_receipt: null,
    result_description: 'Request accepted for processing',
    created_at: '2026-10-23T16:49:00Z',
  };
  const { service, requests } = harness(() => json(attempt, 202));

  const result = await service.topUpWallet(270, '+254 740-155-901', 'top-up-key');

  assert.equal(result.status, 'pending');
  assert.equal(requests[0].init.headers.get('Idempotency-Key'), 'top-up-key');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    amount: 270,
    phone_number: '254740155901',
  });
});

test('withdrawal requests the full selected balance source without an amount', async () => {
  const payout = {
    id: '22222222-2222-4222-8222-222222222222',
    provider: 'mpesa',
    amount: '275.00',
    currency: 'KES',
    status: 'processing',
    balance_source: 'shopping',
    destination_phone: '25471***678',
    destination_name: 'Buyer',
    transaction_receipt: '',
    failure_message: '',
    created_at: '2026-10-23T17:00:00Z',
    updated_at: '2026-10-23T17:00:00Z',
    processed_at: null,
  };
  const { service, requests } = harness(() => json(payout, 202));

  const result = await service.requestPayout('shopping', 'withdraw-all-key');

  assert.equal(result.amount, 275);
  assert.equal(result.balanceSource, 'shopping');
  assert.equal(requests[0].init.headers.get('Idempotency-Key'), 'withdraw-all-key');
  assert.deepEqual(JSON.parse(requests[0].init.body), { balance_source: 'shopping' });
});

test('shipping quote and created order preserve their separate delivery amounts', async () => {
  const id = '33333333-3333-4333-8333-333333333333';
  const sellerId = '44444444-4444-4444-8444-444444444444';
  const order = {
    id, buyer_id: id, item_subtotal: '1000.00', shipping_cost: '220.00',
    total_amount: '1220.00', currency: 'KES', status: 'pending', payment_method: 'mpesa',
    payment_status: 'pending', payment_option: 'pay_now', amount_paid: '0.00', amount_due: '1220.00',
    delivery_fee_paid: false, shipping_address: '123 Main Street', shipping_city: 'Nairobi',
    shipping_postal_code: '00100', shipping_country: 'Kenya', courier_name: '', tracking_number: '',
    shipped_at: null, items: [], fulfillments: [], created_at: '2026-10-29T12:00:00Z',
  };
  const { load } = harness(route => route.pathname.endsWith('/shipping-quote/')
    ? json({ item_subtotal: '1000.00', shipping_cost: '220.00', total_amount: '1220.00', currency: 'KES',
      shipments: [{ seller_id: sellerId, origin_city: 'Nairobi', destination_city: 'Nairobi',
        chargeable_weight_kg: '1.000', shipping_cost: '220.00', is_remote: false }] })
    : json(order, 201));
  const service = load('services/orderService.ts').orderService;
  const payload = { shipping_address: '123 Main Street', shipping_city: 'Nairobi', shipping_postal_code: '00100', shipping_country: 'Kenya' };
  const quote = await service.shippingQuote(payload);
  const created = await service.checkout(payload);
  assert.equal(quote.shippingCost, 220);
  assert.equal(created.shippingCost, 220);
  assert.equal(created.total, created.itemSubtotal + created.shippingCost);
});

test('pickup-point checkout sends the reviewed route and preserves its destination', async () => {
  const id = '33333333-3333-4333-8333-333333333333';
  const sellerId = '44444444-4444-4444-8444-444444444444';
  const pointId = '55555555-5555-4555-8555-555555555555';
  const point = { id: pointId, name: 'AfriClay Nairobi', city: 'Nairobi', address: 'Simara Mall, 3rd floor, Shop No. 41', postal_code: '' };
  const { load, requests } = harness(route => route.pathname.endsWith('/pickup-points/')
    ? json([point])
    : route.pathname.endsWith('/shipping-quote/')
      ? json({ item_subtotal: '1000.00', shipping_cost: '220.00', total_amount: '1220.00', currency: 'KES', pickup_point_address: point.address,
        shipments: [{ seller_id: sellerId, origin_city: 'Nairobi', destination_city: 'Nairobi',
          chargeable_weight_kg: '1.000', shipping_cost: '220.00', is_remote: false }] })
      : json({ id, buyer_id: id, item_subtotal: '1000.00', shipping_cost: '220.00', total_amount: '1220.00',
        currency: 'KES', status: 'pending', payment_method: 'mpesa', payment_status: 'pending',
        payment_option: 'pay_now', amount_paid: '0.00', amount_due: '1220.00', delivery_fee_paid: false,
        delivery_method: 'pickup_point', pickup_point: point, shipping_address: point.address,
        shipping_city: point.city, shipping_postal_code: 'N/A', shipping_country: 'Kenya',
        courier_name: '', tracking_number: '', shipped_at: null, items: [], fulfillments: [],
        created_at: '2026-11-06T12:00:00Z' }, 201));
  const points = await load('services/shippingService.ts').shippingService.pickupPoints();
  assert.equal(points[0].id, pointId);
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer test-access');
  const service = load('services/orderService.ts').orderService;
  const route = { delivery_method: 'pickup_point', pickup_point_id: pointId };
  const quote = await service.shippingQuote(route);
  const order = await service.checkout({ ...route, expected_item_subtotal: quote.itemSubtotal.toFixed(2),
    expected_shipping_cost: quote.shippingCost.toFixed(2), expected_total_amount: quote.total.toFixed(2),
    expected_pickup_point_address: quote.pickupPointAddress });
  assert.equal(order.deliveryMethod, 'pickup_point');
  assert.equal(order.pickupPoint.id, pointId);
  assert.deepEqual(JSON.parse(requests[1].init.body), route);
  assert.equal(JSON.parse(requests[2].init.body).expected_shipping_cost, '220.00');
  assert.equal(JSON.parse(requests[2].init.body).expected_pickup_point_address, point.address);
});

test('doorstep checkout carries a selected location and server-signed quote through payment review', async () => {
  const orderId = '33333333-3333-4333-8333-333333333333';
  const pointId = '55555555-5555-4555-8555-555555555555';
  const point = { id: pointId, name: 'AfriClay Nairobi', city: 'Nairobi', address: 'Simara Mall, Shop 41', postal_code: '', doorstep_available: true };
  const { load, requests } = harness(route => route.pathname.endsWith('/doorstep/locations/')
    ? json({ locations: [{ label: 'Test Building, Nairobi, Kenya', token: 'signed-location' }] })
    : route.pathname.endsWith('/shipping-quote/')
      ? json({ item_subtotal: '1000.00', pickup_delivery_cost: '220.00', doorstep_delivery_cost: '394.00',
        doorstep_distance_meters: '8400.00', shipping_cost: '614.00', total_amount: '1614.00', currency: 'KES',
        pickup_point_address: point.address, expected_doorstep_quote_token: 'signed-quote', shipments: [] })
      : json({ id: orderId, buyer_id: orderId, item_subtotal: '1000.00', shipping_cost: '614.00', total_amount: '1614.00',
        currency: 'KES', status: 'pending', payment_method: 'mpesa', payment_status: 'pending',
        payment_option: 'pay_now', amount_paid: '0.00', amount_due: '1614.00', delivery_fee_paid: false,
        delivery_method: 'doorstep', pickup_point: point, shipping_address: 'Test Building, Nairobi, Kenya',
        shipping_city: 'Nairobi', shipping_postal_code: 'N/A', shipping_country: 'Kenya',
        home_delivery: { status: 'waiting_for_parcels', pickup_address_snapshot: point.address,
          destination_address: 'Test Building, Nairobi, Kenya', destination_city: 'Nairobi',
          delivery_instructions: 'Third floor', distance_meters: '8400.00', fee: '394.00', events: [] },
        courier_name: '', tracking_number: '', shipped_at: null, items: [], fulfillments: [],
        created_at: '2026-11-09T12:00:00Z' }, 201));
  const shipping = load('services/shippingService.ts').shippingService;
  const locations = await shipping.homeLocations(pointId, 'Test Building');
  assert.equal(locations[0].token, 'signed-location');
  const service = load('services/orderService.ts').orderService;
  const selection = { delivery_method: 'doorstep', pickup_point_id: pointId,
    home_location_token: locations[0].token, home_delivery_instructions: 'Third floor' };
  const quote = await service.shippingQuote(selection);
  assert.equal(quote.pickupDeliveryCost, 220);
  assert.equal(quote.doorstepDeliveryCost, 394);
  assert.equal(quote.shippingCost, 614);
  const order = await service.checkout({ ...selection, expected_item_subtotal: '1000.00',
    expected_shipping_cost: '614.00', expected_total_amount: '1614.00',
    expected_pickup_point_address: quote.pickupPointAddress,
    expected_doorstep_quote_token: quote.doorstepQuoteToken });
  assert.equal(order.homeDelivery.fee, 394);
  assert.equal(order.homeDelivery.deliveryInstructions, 'Third floor');
  assert.equal(JSON.parse(requests[0].init.body).query, 'Test Building');
  assert.equal(JSON.parse(requests[2].init.body).expected_doorstep_quote_token, 'signed-quote');
  assert.equal(JSON.parse(requests[2].init.body).home_location_token, 'signed-location');
});

test('wallet UI has no manual payout amount field', () => {
  const source = readFileSync(path.resolve(__dirname, '../src/screens/profile/Wallet.tsx'), 'utf8');
  assert.doesNotMatch(source, /Payout amount/);
  assert.match(source, /submitPayout\(balanceSource\)/);
  assert.match(source, /Withdraw all \{isEarnings \? 'seller earnings' : 'shopping funds'\}/);
  assert.match(source, /Confirm withdrawal/);
  assert.match(source, /globalThis\.confirm/);
});

test('shopping and seller wallet views are scoped to their authoritative balance source', () => {
  const wallet = readFileSync(path.resolve(__dirname, '../src/screens/profile/Wallet.tsx'), 'utf8');
  const profile = readFileSync(path.resolve(__dirname, '../src/screens/profile/Profile.tsx'), 'utf8');
  const sellerStack = readFileSync(path.resolve(__dirname, '../src/navigation/SellerDashboardStack.tsx'), 'utf8');
  const sellerDashboard = readFileSync(path.resolve(__dirname, '../src/screens/seller/DashboardHome.tsx'), 'utf8');
  const linking = readFileSync(path.resolve(__dirname, '../src/navigation/linking.ts'), 'utf8');

  assert.match(wallet, /export const Wallet: React\.FC = \(\) => <WalletView balanceSource="shopping" \/>/);
  assert.match(wallet, /export const SellerEarningsWallet: React\.FC = \(\) => <WalletView balanceSource="earnings" \/>/);
  assert.match(wallet, /filter\(item => item\.balanceSource === balanceSource\)/);
  assert.match(profile, /label: 'Shopping wallet'/);
  assert.match(sellerStack, /name="SellerEarningsWallet"/);
  assert.match(sellerDashboard, /label: 'Seller Earnings', route: 'SellerEarningsWallet'/);
  assert.match(linking, /SellerEarningsWallet: 'earnings'/);
});

test('seller earnings are visible from compact and desktop marketplace navigation', () => {
  const tabs = readFileSync(path.resolve(__dirname, '../src/navigation/AppTabs.tsx'), 'utf8');
  const shell = readFileSync(path.resolve(__dirname, '../src/components/layout/MarketplaceShell.tsx'), 'utf8');

  assert.match(tabs, /earningsAvailableBalance/);
  assert.match(tabs, /available earnings \$\{earningsLabel\}/);
  assert.match(shell, /Seller earnings \$\{earningsLabel\}/);
  assert.match(shell, /screen: 'SellerEarningsWallet'/);
});

test('payout destination editing never falls back to profile contact data', () => {
  const source = readFileSync(path.resolve(__dirname, '../src/screens/profile/Wallet.tsx'), 'utf8');
  assert.match(source, /normalizeKenyanPaymentPhone\(payoutPhone\)/);
  assert.doesNotMatch(source, /normalizeKenyanPaymentPhone\(payoutPhone\s*\|\|\s*user\?\.phoneNumber/);
  assert.doesNotMatch(source, /setPayoutPhone\(user\?\.phoneNumber/);
  assert.match(source, /setPayoutPhone\(''\); setIsEditingPayoutAccount\(true\)/);
});

test('withdrawal availability explains every blocking wallet state', () => {
  const { load } = harness(() => json({}));
  const { getWithdrawalAvailability } = load('utils/walletWithdrawal.ts');
  const wallet = {
    id: '33333333-3333-4333-8333-333333333333',
    currency: 'KES',
    balance: 270,
    heldBalance: 0,
    availableBalance: 270,
    shoppingBalance: 0,
    shoppingHeldBalance: 0,
    shoppingAvailableBalance: 0,
    earningsBalance: 270,
    earningsHeldBalance: 0,
    earningsAvailableBalance: 270,
    pendingPayoutBalance: 0,
    shoppingPendingPayoutBalance: 0,
    earningsPendingPayoutBalance: 0,
    orderHeldBalance: 0,
    withdrawalMinimum: 10,
    withdrawalMaximum: 250000,
    isFrozen: false,
    createdAt: '2026-10-23T17:00:00Z',
  };
  const base = { wallet, source: 'earnings', hasPayoutAccount: true };

  assert.equal(getWithdrawalAvailability({ ...base, walletLoading: true }).reason, 'wallet_loading');
  assert.equal(getWithdrawalAvailability({ source: 'earnings', walletError: true }).reason, 'wallet_unavailable');
  assert.equal(getWithdrawalAvailability({ ...base, hasPayoutAccount: false }).reason, 'destination_missing');
  assert.equal(getWithdrawalAvailability({ ...base, wallet: { ...wallet, isFrozen: true } }).reason, 'wallet_frozen');
  assert.equal(getWithdrawalAvailability({
    ...base,
    wallet: { ...wallet, earningsAvailableBalance: 0, earningsHeldBalance: 270, earningsPendingPayoutBalance: 270 },
    payouts: [{ balanceSource: 'earnings', status: 'unknown' }],
  }).reason, 'payout_unknown');
  assert.equal(getWithdrawalAvailability({
    ...base,
    wallet: { ...wallet, earningsAvailableBalance: 0, earningsHeldBalance: 270 },
  }).reason, 'funds_reserved');
  assert.equal(getWithdrawalAvailability({
    ...base,
    wallet: { ...wallet, earningsBalance: 0, earningsAvailableBalance: 0 },
  }).reason, 'zero_balance');
  assert.equal(getWithdrawalAvailability({
    ...base,
    wallet: { ...wallet, earningsBalance: 5, earningsAvailableBalance: 5 },
  }).reason, 'below_minimum');
  assert.equal(getWithdrawalAvailability({
    ...base,
    wallet: { ...wallet, earningsBalance: 300000, earningsAvailableBalance: 300000 },
  }).reason, 'above_maximum');
  assert.equal(getWithdrawalAvailability(base).allowed, true);
  assert.equal(getWithdrawalAvailability(base).amount, 270);
});
