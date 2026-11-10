const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { getPathFromState, getStateFromPath } = require('@react-navigation/core');

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
  assert.equal(roles.hasStaffRole({ role: 'buyer', staffRoles: ['logistics'] }, 'logistics'), true);
  assert.equal(roles.hasStaffRole({ role: 'buyer', staffRoles: ['logistics'] }, 'finance'), false);
});

test('logistics staff use their own guarded dashboard and assigned shipment API', () => {
  const navigator = source('src/navigation/RootNavigator.tsx');
  const login = source('src/screens/admin/OperationsLogin.tsx');
  const dashboard = source('src/screens/admin/LogisticsDashboard.tsx');
  const service = source('src/services/logisticsService.ts');
  assert.match(navigator, /name="LogisticsDashboard" component=\{LogisticsDashboard\}/);
  assert.match(login, /hasStaffRole\(user, 'finance'\) \? 'FinanceDashboard' : 'LogisticsDashboard'/);
  assert.match(dashboard, /hasStaffRole\(auth\.user, 'logistics'\)/);
  assert.match(service, /\/cart\/logistics\/fulfillments\/\?limit=30&offset=/);
  assert.match(service, /\/events\//);
  assert.match(service, /\/assign\//);
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
  assert.match(navigator, /name="OperationsLogin" component=\{OperationsLogin\}/);
  assert.match(source('src/navigation/linking.ts'), /OperationsLogin: 'operations'/);
});

test('operations login routes assigned accounts and rejects unassigned marketplace accounts', () => {
  const login = source('src/screens/admin/OperationsLogin.tsx');
  assert.match(login, /canAccessOperations\(user\)/);
  assert.match(login, /dashboardFor\(auth\.user\)/);
  assert.match(login, /has not been assigned access to an operations dashboard/);
  assert.doesNotMatch(login, /Create account/);
});

test('staff login and rider application have separate refreshable routes', () => {
  const login = source('src/screens/admin/OperationsLogin.tsx');
  const application = source('src/screens/admin/RiderApplication.tsx');
  const navigator = source('src/navigation/RootNavigator.tsx');
  const { linking } = transpile('src/navigation/linking.ts');
  assert.doesNotMatch(login, /<RiderApplicationForm/);
  assert.match(login, /navigation\.navigate\('RiderApplication'\)/);
  assert.match(application, /<RiderApplicationForm userId=\{user\.id\}/);
  assert.match(application, /!user \? <>/);
  assert.match(application, /!user\.verified \? <>/);
  assert.match(navigator, /name="RiderApplication" component=\{RiderApplication\}/);
  assert.equal(getStateFromPath('/operations', linking.config).routes[0].name, 'OperationsLogin');
  const directApplication = getStateFromPath('/riders/apply', linking.config);
  assert.equal(directApplication.routes[0].name, 'RiderApplication');
  assert.equal(getPathFromState(directApplication, linking.config), '/riders/apply');
});

test('operations password reset keeps its sign-in destination through a web refresh', () => {
  const { linking } = transpile('src/navigation/linking.ts');
  const state = getStateFromPath('/auth/forgot-password?returnToOperations=true', linking.config);
  assert.equal(state.routes[0].name, 'AuthStack');
  assert.equal(state.routes[0].state.routes[0].name, 'ForgotPassword');
  assert.equal(state.routes[0].state.routes[0].params.returnToOperations, true);
  assert.equal(getPathFromState(state, linking.config), '/auth/forgot-password?returnToOperations=true');
});

test('dashboard services use role-specific backend contracts', () => {
  const service = source('src/services/adminService.ts');
  assert.match(service, /\/stores\/kyc\/review-queue\//);
  assert.match(service, /\/stores\/kyc\/review-summary\//);
  assert.match(service, /\/payments\/finance\/transactions\//);
  assert.match(service, /\/payments\/admin\/payments\//);
  assert.match(service, /\/auth\/admin\/users\//);
  assert.match(service, /\/auth\/admin\/overview\//);
  assert.match(service, /\/auth\/admin\/catalog\/\$\{kind\}\//);
  assert.match(service, /\/auth\/admin\/orders\//);
  assert.match(service, /\/auth\/admin\/dashboard-access-requests\//);
  assert.match(service, /\/auth\/admin\/staff-assignments\//);
  assert.match(service, /\/auth\/dashboard-access-requests\//);
  assert.doesNotMatch(service, /wallet.*(?:PATCH|PUT)|ledger.*(?:PATCH|PUT)/i);
});

test('operations dashboards keep a bounded mobile scroll region', () => {
  const scaffold = source('src/screens/admin/OperationsScaffold.tsx');
  assert.match(scaffold, /nestedScrollEnabled/);
  assert.match(scaffold, /testID="operations-scroll"/);
  assert.match(scaffold, /contentContainerStyle=\{\[styles\.content/);
  assert.match(scaffold, /root: \{ flex: 1, minHeight: 0/);
  assert.match(scaffold, /scroll: \{ flex: 1, minHeight: 0/);
  assert.match(scaffold, /const \{ width, height \} = useWindowDimensions\(\)/);
  assert.match(scaffold, /Platform\.OS === 'web' \? \{ height, maxHeight: height \}/);
  assert.match(scaffold, /style=\{compact \? styles\.navViewportCompact : styles\.navViewport\}/);
  assert.match(scaffold, /navViewportCompact: \{ flexGrow: 0, flexShrink: 0, width: '100%', height: 44 \}/);
});

test('super admin has catalog moderation and read-only order oversight', () => {
  const screen = source('src/screens/admin/SuperAdminDashboard.tsx');
  assert.match(screen, /changeCatalogStatus\(pending\.item, pending\.action, reason\)/);
  assert.match(screen, /adminService\.listOrders/);
  assert.match(screen, /Order oversight/);
  assert.doesNotMatch(screen, /changeOrderStatus|deleteOrder/);
});

test('super admin reviews access requests with an audited reason', () => {
  const screen = source('src/screens/admin/SuperAdminDashboard.tsx');
  const request = source('src/screens/profile/DashboardAccessRequests.tsx');
  assert.match(screen, /reviewAccessRequest\(pending\.record\.id, pending\.decision, reason\)/);
  assert.match(screen, /if \(!reason\.trim\(\)\)/);
  assert.match(request, /requestDashboardAccess\(role, reason\)/);
  assert.match(request, /super administrator reviews every request/i);
  assert.match(screen, /assignStaffRoleByEmail\(pending\.email, pending\.role, pending\.action, reason\)/);
  assert.match(screen, /invalidates existing sessions/i);
});

test('finance reconciliation stays super-admin-only in the UI', () => {
  const finance = source('src/screens/admin/FinanceDashboard.tsx');
  assert.match(finance, /isSuperAdmin\(auth\.user\)/);
  assert.match(finance, /Manual reconciliation is restricted to a super administrator/);
  assert.match(finance, /downloadTransactions\(exportFilters\)/);
  assert.match(finance, /status: paymentQueueStatus === 'all' \? undefined : paymentQueueStatus/);
  assert.match(finance, /setPaymentQueueStatus\('awaiting_confirmation'\)/);
  assert.match(finance, /Needs reconciliation/);
  assert.match(finance, /Failed payments/);
  assert.match(finance, /Transaction detail/);
  assert.match(finance, /Order payment records/);
});

test('role dashboards expose real summaries, aging, date filters and freshness states', () => {
  const admin = source('src/screens/admin/SuperAdminDashboard.tsx');
  const finance = source('src/screens/admin/FinanceDashboard.tsx');
  const sales = source('src/screens/admin/SalesDashboard.tsx');
  assert.match(admin, /data\.trends\.map/);
  assert.match(admin, /Recent administrative activity/);
  assert.match(admin, /DataFreshness/);
  assert.match(finance, /financeSummary\(\{ date_from: dateFrom, date_to: dateTo \}\)/);
  assert.match(finance, /summary\.data\.refundsRecorded/);
  assert.match(source('src/services/adminService.ts'), /refundsRecorded: raw\.refunds_recorded == null \? undefined : parseAmount\(raw\.refunds_recorded\)/);
  assert.match(finance, /formatQueueAge\(item\.createdAt\)/);
  assert.match(sales, /adminService\.kycSummary/);
  assert.match(sales, /Reviewer workload/);
  assert.match(sales, /Over 7 days/);
  assert.match(sales, /formatQueueAge\(item\.submittedAt\)/);
});

test('operations workspaces fit compact screens and retain stale data labels', () => {
  const shell = source('src/screens/admin/OperationsScaffold.tsx');
  const admin = source('src/screens/admin/SuperAdminDashboard.tsx');
  const finance = source('src/screens/admin/FinanceDashboard.tsx');
  const sales = source('src/screens/admin/SalesDashboard.tsx');
  assert.match(shell, /Refresh failed; showing last loaded data/);
  assert.match(shell, /navigationLinks/);
  assert.match(admin, /horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.tabsViewport\}/);
  assert.match(admin, /compact && styles\.listCompact/);
  assert.match(admin, /compact && styles\.detailCompact/);
  assert.match(finance, /compact && styles\.payoutListCompact/);
  assert.match(finance, /compact && styles\.payoutDetailCompact/);
  assert.match(sales, /compact && styles\.layoutCompact/);
  assert.match(sales, /compact && styles\.detailCompact/);
});
