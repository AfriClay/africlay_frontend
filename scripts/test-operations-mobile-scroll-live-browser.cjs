const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = process.env.AFRICLAY_BROWSER_ORIGIN || 'http://127.0.0.1:4173';

const pageResult = results => ({ count: results.length, next: null, previous: null, results });
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    localStorage.setItem('africlay.accessToken', 'operations-scroll-access');
    localStorage.setItem('africlay.refreshToken', 'operations-scroll-refresh');
  });
  const page = await context.newPage();
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me/')) return route.fulfill(json({
      id: '00000000-0000-4000-8000-000000000001', email: 'sales@example.invalid', full_name: 'Sales Reviewer',
      role: 'buyer', staff_roles: ['sales_reviewer'], is_verified: true,
    }));
    if (pathname.endsWith('/stores/kyc/review-summary/')) return route.fulfill(json({
      counts: { total: 12, pending: 12, approved: 0, rejected: 0 },
      pending_aging: { under_3_days: 4, days_3_to_7: 4, over_7_days: 4 },
      reviewer_workload: [], recent_activity: [],
    }));
    if (pathname.endsWith('/stores/kyc/review-queue/')) return route.fulfill(json(pageResult(Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      store: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      store_name: `Store ${index + 1}`,
      store_slug: `store-${index + 1}`,
      owner: `00000000-0000-4000-8001-${String(index + 1).padStart(12, '0')}`,
      owner_email: `seller${index + 1}@example.invalid`,
      business_name: `Business ${index + 1}`,
      business_registration_number: `REG-${index + 1}`,
      tax_identification_number: `TAX-${index + 1}`,
      document_type: 'business_registration', status: 'pending',
      submitted_at: '2026-10-01T08:00:00Z', rejection_reason: '',
    })))));
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByText('Seller verification', { exact: true }).waitFor({ timeout: 30000 });
    const scroller = page.getByTestId('operations-scroll');
    await scroller.waitFor();
    const initial = await scroller.evaluate(node => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
      scrollTop: node.scrollTop,
      overflowY: getComputedStyle(node).overflowY,
    }));
    assert.ok(initial.clientHeight > 0 && initial.clientHeight < 844, `Unexpected scroll viewport: ${JSON.stringify(initial)}`);
    assert.ok(initial.scrollHeight > initial.clientHeight + 300, `Dashboard content is not scrollable: ${JSON.stringify(initial)}`);
    assert.match(initial.overflowY, /auto|scroll/);

    await scroller.hover();
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(150);
    assert.ok(await scroller.evaluate(node => node.scrollTop > 0), 'Wheel scrolling did not move the operations viewport.');

    await scroller.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await page.waitForTimeout(100);
    assert.ok(await page.getByText('Recent review activity', { exact: true }).isVisible(), 'The final dashboard section is not reachable.');
    assert.ok(await page.getByText('Sales review', { exact: true }).isVisible(), 'The compact operations navigation is not visible.');
    console.log('PASS mobile operations viewport scrolls to the final section and keeps compact navigation visible');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
