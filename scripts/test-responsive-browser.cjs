const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const baseURL = process.env.WEB_TEST_URL || 'http://localhost:8081';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = path.join(process.env.TEMP, 'africlay-responsive-screenshots');
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  let signedIn = false;
  await page.route('**/api/auth/**', route => {
    const url = route.request().url();
    const me = url.endsWith('/me/');
    return route.fulfill({ status: me && !signedIn ? 401 : url.includes('/refresh/') ? 401 : 200,
      contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': baseURL, 'Access-Control-Allow-Credentials': 'true' },
      body: JSON.stringify(me && signedIn ? { id: 'layout-fixture', email: 'layout@example.invalid', role: 'buyer', is_verified: true, full_name: 'Layout Test' } : { csrfToken: 'layout-only' }) });
  });
  try {
    await page.goto(baseURL, { timeout: 120000, waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Create Account', exact: true }).waitFor({ timeout: 120000 });
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await page.getByLabel('Email', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'auth-1440.png') });
    signedIn = true;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByText('Explore categories', { exact: true }).waitFor({ timeout: 60000 });
    for (const width of [375, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction(expanded => Boolean(document.querySelector('[aria-label="AfriClay home"]')) === expanded, width >= 768);
      await page.getByText('Explore categories', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'AfriClay home', exact: true }).count(), width >= 768 ? 1 : 0);
      assert.equal(await page.getByRole('tab', { name: 'Home', exact: true }).count(), width < 768 ? 1 : 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
      assert.equal(await page.getByText('Sell on AfriClay', { exact: true }).count(), 0);
      assert.equal(await page.locator('button button').count(), 0);
      await page.screenshot({ path: path.join(output, `home-${width}.png`) });
      console.log(`Home ${width}: navigation visibility and page width passed`);
    }
    const searchBox = page.getByLabel('Search products, services and sellers', { exact: true });
    const beforeCollapse = await searchBox.boundingBox();
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).waitFor();
    assert.deepEqual(await searchBox.boundingBox(), beforeCollapse);
    const servicesLink = page.getByRole('button', { name: 'Services', exact: true });
    assert.equal(await servicesLink.locator('..').getAttribute('title'), 'Services');
    await servicesLink.focus();
    await page.keyboard.press('Enter');
    await page.getByLabel('Search services', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'services-collapsed.png') });
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
    await page.setViewportSize({ width: 768, height: 900 });
    await page.screenshot({ path: path.join(output, 'services-768.png') });
    await page.getByLabel('Search services', { exact: true }).fill('zzzz-no-results');
    await page.getByText('No services found', { exact: true }).waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Discover', exact: true }).click();
    await page.getByLabel('Search AfriClay', { exact: true }).fill('zzzz-no-results');
    await page.getByText('No results', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'search-empty.png') });
    await page.getByLabel('Search AfriClay', { exact: true }).fill('a');
    await page.screenshot({ path: path.join(output, 'search-results.png') });
    await page.getByRole('button', { name: 'Fashion', exact: true }).click();
    await page.getByLabel('Search products', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'listing.png') });
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('button', { name: /^View / }).filter({ hasNotText: 'View profile' }).first().click();
    await page.getByRole('button', { name: 'Add to Cart', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'product-details.png') });
    await page.setViewportSize({ width: 768, height: 900 });
    await page.screenshot({ path: path.join(output, 'product-details-768.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Add to Cart', exact: true }).click();
    await page.getByRole('button', { name: /^Cart, / }).click();
    await page.screenshot({ path: path.join(output, 'cart.png') });
    await page.getByRole('button', { name: 'Proceed to checkout', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'checkout.png') });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.screenshot({ path: path.join(output, 'settings.png') });
    await page.setViewportSize({ width: 1024, height: 480 });
    await page.screenshot({ path: path.join(output, 'short-window.png') });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Sell', exact: true }).click();
    await page.getByText('Start Selling on AfriClay', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'seller-onboarding.png') });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('Screenshots:', output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
