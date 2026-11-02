const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = process.env.AFRICLAY_BROWSER_ORIGIN || 'http://127.0.0.1:4173';
const indexHtml = readFileSync(path.join(__dirname, '..', 'dist', 'index.html'), 'utf8');
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const page = results => ({ count: results.length, next: null, previous: null, results });
const overview = {
  accounts: { total: 8, active: 8, suspended: 0 },
  stores: { total: 3, active: 3, kyc_pending: 1 },
  products: { total: 10, published: 8, draft: 2, archived: 0 },
  services: { total: 2, published: 2, draft: 0, archived: 0 },
  orders: { total: 4, pending: 1, processing: 1, shipped: 1, delivered: 1, cancelled: 0, payment_pending: 1, payment_failed: 0 },
  dashboard_access_pending: 1,
  trend_days: 30,
  trends: [{ date: '2026-10-24', accounts: 2, stores: 1, orders: 1, gross_order_value: '400.00' }],
};
const financeSummary = {
  wallet_liability: '1000.00', wallet_reserved: '100.00', customer_payments: '1500.00', refunds_recorded: '50.00',
  commission_earned: '150.00', seller_proceeds_released: '500.00', payouts_completed: '200.00',
  payouts_pending: '100.00', needs_reconciliation: 0, reconciliation_over_24h: 0,
  oldest_reconciliation_at: null, failed_payments: 1, pending_payments: 2,
  period: { date_from: null, date_to: null },
};
const salesSummary = {
  counts: { total: 3, pending: 1, approved: 2, rejected: 0 },
  pending_aging: { under_3_days: 1, days_3_to_7: 0, over_7_days: 0 },
  reviewer_workload: [], recent_activity: [],
};

async function checkRole(browser, role, expectedHeading, finalSection) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    localStorage.setItem('africlay.accessToken', 'operations-layout-access');
    localStorage.setItem('africlay.refreshToken', 'operations-layout-refresh');
  });
  const browserPage = await context.newPage();
  const errors = [];
  browserPage.on('pageerror', error => errors.push(error.message));
  await browserPage.route('**/operations/**', route => route.request().resourceType() === 'document'
    ? route.fulfill({ status: 200, contentType: 'text/html', body: indexHtml }) : route.continue());
  await browserPage.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me/')) return route.fulfill(json({
      id: '00000000-0000-4000-8000-000000000001', email: `${role}@example.invalid`, full_name: 'Operations Tester',
      role: role === 'admin' ? 'super_admin' : 'buyer',
      staff_roles: role === 'admin' ? [] : [role === 'sales' ? 'sales_reviewer' : 'finance'],
      is_verified: true,
    }));
    if (pathname.endsWith('/auth/admin/overview/')) return route.fulfill(json(overview));
    if (pathname.endsWith('/auth/admin/users/')) return route.fulfill(json(page([{
      id: '00000000-0000-4000-8000-000000000003', email: 'staff@example.invalid', full_name: 'Operations Fixture',
      role: 'buyer', staff_roles: ['sales_reviewer'], is_verified: true, is_active: true, is_staff: false,
      date_joined: '2026-10-24T08:00:00Z',
    }])));
    if (pathname.endsWith('/stores/admin/')) return route.fulfill(json(page([{
      id: '00000000-0000-4000-8000-000000000004', owner: '00000000-0000-4000-8000-000000000005',
      owner_email: 'seller@example.invalid', name: 'Fixture Store', slug: 'fixture-store', status: 'active',
      created_at: '2026-10-24T08:00:00Z', updated_at: '2026-10-24T08:00:00Z',
      activity: { products: 2, services: 1, orders: 3, reviews: 1, last_activity_at: '2026-10-24T08:00:00Z' },
    }])));
    if (pathname.endsWith('/auth/admin/dashboard-access-requests/')) return route.fulfill(json(page([])));
    if (pathname.endsWith('/auth/admin/audit-logs/')) return route.fulfill(json(page([])));
    if (pathname.endsWith('/payments/admin/finance-summary/')) return route.fulfill(json(financeSummary));
    if (pathname.endsWith('/stores/kyc/review-summary/')) return route.fulfill(json(salesSummary));
    if (/\/(?:stores\/kyc\/review-queue|payments\/admin\/(?:payouts|payments)|payments\/finance\/transactions)\/$/.test(pathname)) return route.fulfill(json(page([])));
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });
  try {
    await browserPage.goto(`${origin}/operations/${role === 'admin' ? 'admin' : role}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await browserPage.getByText(expectedHeading, { exact: true }).first().waitFor({ timeout: 30000 });
    const scroller = browserPage.getByTestId('operations-scroll');
    await scroller.waitFor();
    await browserPage.screenshot({ path: path.join(process.env.TEMP, `africlay-${role}-operations-mobile-top.png`) });
    const layout = await scroller.evaluate(node => ({ height: node.clientHeight, scrollHeight: node.scrollHeight }));
    assert.ok(layout.height > 0 && layout.scrollHeight > layout.height, `${role}: dashboard cannot scroll ${JSON.stringify(layout)}`);
    await scroller.evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.ok(await browserPage.getByText(finalSection, { exact: true }).first().isVisible(), `${role}: final section is unreachable`);
    if (role === 'finance') {
      const payoutDetail = await browserPage.getByText('Select a payout.', { exact: true }).boundingBox();
      assert.ok(payoutDetail && payoutDetail.width > 180, `Finance payout detail is squeezed: ${JSON.stringify(payoutDetail)}`);
    }
    const overflow = await browserPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 2, `${role}: ${overflow}px horizontal page overflow`);
    assert.deepEqual(errors, [], `${role}: browser runtime errors`);
    const screenshot = path.join(process.env.TEMP, `africlay-${role}-operations-mobile.png`);
    await browserPage.screenshot({ path: screenshot });
    await browserPage.setViewportSize({ width: 320, height: 640 });
    const narrowOverflow = await browserPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(narrowOverflow <= 2, `${role}: ${narrowOverflow}px horizontal overflow at 320px`);
    assert.ok(await scroller.evaluate(node => node.scrollHeight > node.clientHeight), `${role}: 320px viewport cannot scroll`);
    await browserPage.setViewportSize({ width: 1280, height: 800 });
    await scroller.evaluate(node => { node.scrollTop = 0; });
    const desktopOverflow = await browserPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(desktopOverflow <= 2, `${role}: ${desktopOverflow}px horizontal overflow at desktop width`);
    await browserPage.screenshot({ path: path.join(process.env.TEMP, `africlay-${role}-operations-desktop.png`) });
    if (role === 'admin') {
      await browserPage.setViewportSize({ width: 390, height: 844 });
      await browserPage.getByRole('tab', { name: 'Accounts' }).click();
      await browserPage.getByText('Operations Fixture', { exact: true }).first().waitFor();
      assert.ok(await browserPage.getByText('Dashboard roles', { exact: true }).isVisible());
      assert.ok(await browserPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
      await browserPage.getByRole('tab', { name: 'Stores' }).click();
      await browserPage.getByText('Fixture Store', { exact: true }).first().waitFor();
      assert.ok(await browserPage.getByText('Persisted activity', { exact: true }).isVisible());
      assert.ok(await browserPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));
    }
    console.log(`PASS ${role} mobile and desktop layouts, scroll, and no horizontal overflow (${screenshot})`);
  } finally {
    await context.close();
  }
}

async function checkUnauthorized(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  await context.addInitScript(() => {
    localStorage.setItem('africlay.accessToken', 'operations-buyer-access');
    localStorage.setItem('africlay.refreshToken', 'operations-buyer-refresh');
  });
  const browserPage = await context.newPage();
  await browserPage.route('**/operations/**', route => route.request().resourceType() === 'document'
    ? route.fulfill({ status: 200, contentType: 'text/html', body: indexHtml }) : route.continue());
  await browserPage.route('**/api/**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/auth/me/')) return route.fulfill(json({
      id: '00000000-0000-4000-8000-000000000009', email: 'buyer@example.invalid', full_name: 'Buyer',
      role: 'buyer', staff_roles: [], is_verified: true,
    }));
    return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
  });
  try {
    for (const [route, denied] of [
      ['sales', 'Sales reviewer access is required for this dashboard.'],
      ['finance', 'Finance access is required for this dashboard.'],
      ['admin', 'Super administrator access is required for this dashboard.'],
    ]) {
      await browserPage.goto(`${origin}/operations/${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await browserPage.getByText(denied, { exact: true }).waitFor({ timeout: 30000 });
    }
    assert.equal(await browserPage.getByText('Wallet liability', { exact: true }).count(), 0);
    console.log('PASS direct sales, finance, and admin routes deny an unassigned buyer');
  } finally { await context.close(); }
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args: ['--no-proxy-server'] });
  try {
    await checkRole(browser, 'sales', 'Seller verification', 'Recent review activity');
    await checkRole(browser, 'finance', 'Finance operations', 'Payout and reconciliation queue');
    await checkRole(browser, 'admin', 'Administration', 'Recent administrative activity');
    await checkUnauthorized(browser);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
