const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const baseURL = process.env.WEB_TEST_URL || 'http://localhost:8081';
const catalogKey = 'africlay-seller-catalog-v1';
const fixtures = [
  { id: 'phase1-incomplete', name: 'Incomplete test product', price: 25, currency: 'KSh', category: 'Handmade', sellerId: 'unknown-seller', images: null },
  { id: 'phase1-missing', name: 'Removed test product', price: 10, currency: 'KSh', category: 'Handmade', sellerId: 'seller-zuri', images: [] },
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/**', route => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify(route.request().url().endsWith('/me/')
      ? { id: 'phase1-user', email: 'phase1@example.invalid', full_name: 'Phase One', role: 'buyer', is_verified: true }
      : { csrfToken: 'test-only' }) }));
  await page.addInitScript(({ catalogKey, fixtures }) => {
    if (!sessionStorage.getItem('phase1-seeded')) {
      localStorage.setItem(catalogKey, JSON.stringify({ initializedSellerIds: [], products: fixtures }));
      sessionStorage.setItem('phase1-seeded', 'yes');
    }
  }, { catalogKey, fixtures });
  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'View Incomplete test product', exact: true }).click({ timeout: 60000 });
    await page.getByText('Seller unavailable', { exact: true }).waitFor();
    await page.getByRole('img', { name: 'Image unavailable: Incomplete test product', exact: true }).waitFor();
    await page.getByRole('link', { name: /back$/i }).click();
    await page.getByText('Explore categories', { exact: true }).waitFor();
    console.log('Incomplete product, missing seller, image fallback and detail Back passed');

    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ initializedSellerIds: [], products: [] })), catalogKey);
    await page.getByRole('button', { name: 'View Removed test product', exact: true }).click();
    await page.getByText('Product not found', { exact: true }).waitFor();
    await page.getByRole('link', { name: /back$/i }).click();
    console.log('Removed product stale-list navigation passed');

    await page.getByRole('button', { name: 'View Organic Avocados', exact: true }).click();
    await page.getByRole('button', { name: /Zuri Crafts.*View Store/ }).click();
    await page.getByRole('button', { name: 'About', exact: true }).waitFor();
    for (const tab of ['Services', 'About', 'Reviews', 'Shop']) {
      await page.getByRole('button', { name: tab, exact: true }).last().click();
      console.log(`Store tab ${tab} selected`);
    }
    await page.getByRole('link', { name: /back$/i }).click();
    await page.getByRole('button', { name: 'Add to Cart', exact: true }).waitFor();
    console.log('Store tabs and immediate previous product Back passed');

    await page.evaluate(key => localStorage.setItem(key, '{invalid'), catalogKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Unable to load the catalog.', { exact: true }).waitFor({ timeout: 30000 });
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ initializedSellerIds: [], products: [] })), catalogKey);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByText('Explore categories', { exact: true }).waitFor();
    console.log('Corrupt catalog error and successful retry passed');
    assert.deepEqual(errors, []);
  } catch (error) {
    console.error((await page.locator('body').innerText()).slice(-1800));
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
