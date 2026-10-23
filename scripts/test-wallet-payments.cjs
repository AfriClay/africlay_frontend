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

  return { service: load('services/paymentService.ts').paymentService, requests };
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
  assert.match(source, /Withdraw all shopping funds/);
  assert.match(source, /Withdraw all seller earnings/);
});
