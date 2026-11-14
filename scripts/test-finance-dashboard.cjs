const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = file => readFileSync(path.join(root, file), 'utf8');

const financeTrend = () => {
  const exports = {};
  const code = ts.transpileModule(source('src/screens/admin/financeTrend.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports });
  return exports;
};

test('confirmed provider chart paths use the actual daily amounts and consistent scale', () => {
  const { buildFinanceTrendPaths } = financeTrend();
  const points = [
    { date: '2026-11-01', orderReceipts: 0, walletTopups: 0, b2cPayouts: 0 },
    { date: '2026-11-02', orderReceipts: 100, walletTopups: 50, b2cPayouts: 25 },
  ];
  const { maximum, paths } = buildFinanceTrendPaths(points, 100, 50);
  assert.equal(maximum, 100);
  assert.equal(paths.orderReceipts, 'M0.00,50.00 L100.00,0.00');
  assert.equal(paths.walletTopups, 'M0.00,50.00 L100.00,25.00');
  assert.equal(paths.b2cPayouts, 'M0.00,50.00 L100.00,37.50');
  assert.equal(buildFinanceTrendPaths([], 100, 50).maximum, 0);
  assert.equal(buildFinanceTrendPaths([{ date: '2026-11-03', orderReceipts: 0, walletTopups: 0, b2cPayouts: 0 }], 100, 50).paths.orderReceipts, 'M50.00,50.00');
});

test('finance cards drill into matching records and only settled provider movement is plotted', () => {
  const screen = source('src/screens/admin/FinanceDashboard.tsx');
  const insight = source('src/screens/admin/FinanceInsights.tsx');
  const service = source('src/services/adminService.ts');
  assert.match(screen, /openLedger\('customer_payment'\)/);
  assert.match(screen, /openLedger\('refund_completed'\)/);
  assert.match(screen, /openPayouts\('active'\)/);
  assert.match(screen, /openPayouts\('unknown'\)/);
  assert.match(screen, /openPayments\('failed'\)/);
  assert.match(screen, /openTopups\('succeeded'\)/);
  assert.match(screen, /openTopups\('unknown'\)/);
  assert.match(screen, /date_basis: paymentQueueStatus === 'succeeded' \? 'completed' : 'created'/);
  assert.match(screen, /setPayoutDateBasis\(status === 'succeeded' \? 'processed' : 'created'\)/);
  assert.match(service, /orderMpesaReceipts: parseAmount\(raw\.order_mpesa_receipts\)/);
  assert.match(service, /walletTopupsReceived: parseAmount\(raw\.wallet_topups_received\)/);
  assert.match(service, /\/payments\/admin\/topups\//);
  assert.match(insight, /not a cash balance/);
  assert.match(insight, /compact && styles\.insightGridCompact/);
  assert.match(insight, /reducedMotion \? 0 : 260/);
});
