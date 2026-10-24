const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const json = (data, status = 200) => new Response(JSON.stringify(data), { status });

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
