const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');
const transpile = (relativePath, requireModule = require) => {
  const exports = {};
  const code = ts.transpileModule(source(relativePath), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule });
  return exports;
};

test('marketplace roles and operations roles remain separate', () => {
  const roles = transpile('src/utils/roles.ts', name => {
    if (name === '../types/user') return {};
    throw new Error(`Unexpected import: ${name}`);
  });
  const salesBuyer = { role: 'buyer', staffRoles: ['sales_reviewer'] };
  const financeSeller = { role: 'seller', staffRoles: ['finance'] };
  assert.equal(roles.canAccessSellerTools(financeSeller.role), true);
  assert.equal(roles.hasStaffRole(salesBuyer, 'sales_reviewer'), true);
  assert.equal(roles.hasStaffRole(salesBuyer, 'finance'), false);
  assert.equal(roles.canAccessOperations({ role: 'super_admin', staffRoles: [] }), true);
});

test('root navigation exposes separate guarded dashboard routes', () => {
  const navigator = source('src/navigation/RootNavigator.tsx');
  const sales = source('src/screens/admin/SalesDashboard.tsx');
  const finance = source('src/screens/admin/FinanceDashboard.tsx');
  const admin = source('src/screens/admin/SuperAdminDashboard.tsx');
  assert.match(navigator, /name="SalesDashboard" component=\{SalesDashboard\}/);
  assert.match(navigator, /name="FinanceDashboard" component=\{FinanceDashboard\}/);
  assert.match(navigator, /name="SuperAdminDashboard" component=\{SuperAdminDashboard\}/);
  assert.match(sales, /hasStaffRole\(auth\.user, 'sales_reviewer'\)/);
  assert.match(finance, /hasStaffRole\(auth\.user, 'finance'\)/);
  assert.match(admin, /isSuperAdmin\(auth\.user\)/);
});

test('dashboard services use role-specific backend contracts', () => {
  const service = source('src/services/adminService.ts');
  assert.match(service, /\/stores\/kyc\/review-queue\//);
  assert.match(service, /\/payments\/finance\/transactions\//);
  assert.match(service, /\/auth\/admin\/users\//);
  assert.match(service, /\/auth\/admin\/dashboard-access-requests\//);
  assert.match(service, /\/auth\/dashboard-access-requests\//);
  assert.doesNotMatch(service, /wallet.*(?:PATCH|PUT)|ledger.*(?:PATCH|PUT)/i);
});

test('super admin reviews access requests with an audited reason', () => {
  const screen = source('src/screens/admin/SuperAdminDashboard.tsx');
  const request = source('src/screens/profile/DashboardAccessRequests.tsx');
  assert.match(screen, /reviewAccessRequest\(pending\.record\.id, pending\.decision, reason\)/);
  assert.match(screen, /if \(!reason\.trim\(\)\)/);
  assert.match(request, /requestDashboardAccess\(role, reason\)/);
  assert.match(request, /super administrator reviews every request/i);
});

test('finance reconciliation stays super-admin-only in the UI', () => {
  const finance = source('src/screens/admin/FinanceDashboard.tsx');
  assert.match(finance, /isSuperAdmin\(auth\.user\)/);
  assert.match(finance, /Manual reconciliation is restricted to a super administrator/);
  assert.match(finance, /downloadTransactions\(filters\)/);
});
