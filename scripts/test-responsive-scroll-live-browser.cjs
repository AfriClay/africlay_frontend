const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = process.env.AFRICLAY_BROWSER_ORIGIN || 'http://127.0.0.1:4173';
const id = suffix => `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const json = body => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('responsive-auth-seeded')) return;
    sessionStorage.setItem('responsive-auth-seeded', 'true');
    localStorage.setItem('africlay.accessToken', 'responsive-access');
    localStorage.setItem('africlay.refreshToken', 'responsive-refresh');
  });
  const page = await context.newPage();
  const errors = [];
  let productRequests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me/')) return route.fulfill(json({
      id: id(1), email: 'buyer@example.invalid', full_name: 'Responsive Buyer', phone_number: '254712345678',
      role: 'both', staff_roles: [], is_verified: true,
    }));
    if (pathname.endsWith('/cart/')) return route.fulfill(json({
      id: id(2), buyer: id(1), items: [
        { id: id(3), product: id(4), product_name: 'Puma XL running shoes', product_slug: 'puma-xl', product_price: '4000.00', quantity: 1 },
        { id: id(5), product: id(6), product_name: 'Samsung Galaxy A17', product_slug: 'samsung-a17', product_price: '22000.00', quantity: 1 },
      ],
    }));
    if (pathname.endsWith('/auth/addresses/')) return route.fulfill(json([{
      id: id(7), address_type: 'shipping', recipient_name: 'John', phone_number: '254712345678',
      street_address: 'Kawango', apartment_suite: null, city: 'Nakuru', state_province: null,
      postal_code: '254', country: 'Kenya', country_code: 'KE', is_default: true,
    }]));
    if (pathname.endsWith('/cart/shipping-quote/')) return route.fulfill(json({
      item_subtotal: '26000.00', shipping_cost: '440.00', total_amount: '26440.00', currency: 'KES',
      shipments: [{ seller_id: id(8), origin_city: 'Nairobi', destination_city: 'Nakuru', chargeable_weight_kg: '2.00', shipping_cost: '440.00', is_remote: false }],
    }));
    if (pathname.endsWith('/notifications/')) return route.fulfill(json([]));
    if (pathname.endsWith('/products/categories/')) return route.fulfill(json([]));
    if (pathname.endsWith('/products/tags/')) return route.fulfill(json([]));
    if (pathname.endsWith('/services/categories/')) return route.fulfill(json([]));
    if (pathname.endsWith('/stores/')) return route.fulfill(json([]));
    if (pathname.endsWith('/products/')) {
      productRequests += 1;
      return route.fulfill(json({ count: 0, next: null, previous: null, results: [] }));
    }
    if (pathname.endsWith('/services/')) return route.fulfill(json({ count: 0, next: null, previous: null, results: [] }));
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
  });

  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 640 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${origin}/checkout`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByText('Order Summary', { exact: true }).waitFor({ timeout: 30_000 });
      const action = page.getByRole('button', { name: 'Place Order & Pay', exact: true });
      await action.waitFor({ timeout: 30_000 });
      const scroller = page.getByTestId('checkout-scroll');
      const initial = await scroller.evaluate(node => ({
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
        overflowY: getComputedStyle(node).overflowY,
      }));
      assert.ok(initial.clientHeight > 0 && initial.clientHeight <= viewport.height, `Invalid checkout viewport at ${viewport.width}: ${JSON.stringify(initial)}`);
      assert.match(initial.overflowY, /auto|scroll/);
      if (initial.scrollHeight > initial.clientHeight) {
        await scroller.evaluate(node => { node.scrollTop = node.scrollHeight; });
        await page.waitForTimeout(100);
        assert.ok(await scroller.evaluate(node => node.scrollTop > 0), `Checkout did not move at ${viewport.width}`);
      }
      assert.ok(await action.isVisible(), `Checkout action is unreachable at ${viewport.width}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow at ${viewport.width}`);
    }

    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(`${origin}/sell/start`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByText('Start Selling on AfriClay', { exact: true }).waitFor({ timeout: 30_000 });
    const sellerScroll = page.getByTestId('start-selling-scroll');
    await sellerScroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.ok(await page.getByRole('button', { name: 'Create Storefront', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await page.evaluate(() => localStorage.clear());
    await page.goto(`${origin}/auth/register`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByText('Create Account', { exact: true }).first().waitFor({ timeout: 30_000 });
    const formScroll = page.getByTestId('form-scroll');
    await formScroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    await page.getByLabel('Confirm password', { exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await page.goto(`${origin}/operations`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByText('Operations sign in', { exact: true }).waitFor({ timeout: 30_000 });
    const operationsScroll = page.getByTestId('operations-login-scroll');
    await operationsScroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.ok(await page.getByRole('button', { name: 'Back to marketplace', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${origin}/home`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByText('Explore categories', { exact: true }).waitFor({ timeout: 30_000 });
    const homeScroll = page.getByTestId('home-scroll');
    assert.equal(await page.evaluate(() => document.documentElement.style.overscrollBehaviorY), 'none', 'Compact touch web should install pull to refresh');
    await homeScroll.evaluate(node => { node.scrollTop = 0; });
    const requestsBeforePull = productRequests;
    await homeScroll.evaluate(node => {
      const makeTouch = (clientY) => new Touch({
        identifier: 1,
        target: node,
        clientX: 150,
        clientY,
        pageX: 150,
        pageY: clientY,
        screenX: 150,
        screenY: clientY,
      });
      const dispatch = (type, clientY, ended = false) => {
        const touch = makeTouch(clientY);
        node.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: ended ? [] : [touch],
          targetTouches: ended ? [] : [touch],
          changedTouches: [touch],
        }));
      };
      dispatch('touchstart', 100);
      dispatch('touchmove', 150);
      dispatch('touchmove', 240);
      dispatch('touchend', 240, true);
    });
    await page.getByLabel('Refreshing page data').waitFor({ state: 'visible', timeout: 2_000 });
    for (let attempt = 0; attempt < 20 && productRequests <= requestsBeforePull; attempt += 1) await page.waitForTimeout(100);
    assert.ok(productRequests > requestsBeforePull, 'Pull gesture did not refetch the active product query');
    await page.getByLabel('Refreshing page data').waitFor({ state: 'hidden', timeout: 5_000 });
    await homeScroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    assert.ok(await page.getByText('Services for you', { exact: true }).isVisible());
    assert.ok(await page.getByRole('tab', { name: 'Home', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await page.goto(`${origin}/products`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByLabel('Search products', { exact: true }).waitFor({ timeout: 30_000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await page.goto(`${origin}/services`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByLabel('Search services', { exact: true }).waitFor({ timeout: 30_000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.documentElement.style.overscrollBehaviorY !== 'none');
    assert.equal(await page.getByTestId('mobile-web-refresh').count(), 0, 'Desktop web should not install pull to refresh');
    assert.deepEqual(errors, []);
    console.log('PASS responsive pages and compact-web-only pull to refresh');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
