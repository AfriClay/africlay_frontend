const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const baseURL = process.env.WEB_TEST_URL || 'http://localhost:8081';
const product = { id: 'gallery-test', name: 'Gallery test product', price: 25, currency: 'KSh', category: 'Handmade', sellerId: 'seller-zuri',
  images: [`${baseURL}/test-good.png`, `${baseURL}/test-broken.png`] };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(120000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let guest = false;
      await page.route('**/api/auth/**', route => {
        const me = route.request().url().endsWith('/me/');
        return route.fulfill({ status: guest && (me || route.request().url().includes('/refresh/')) ? 401 : 200, contentType: 'application/json',
          body: JSON.stringify(me && !guest ? { id: 'phase2', email: 'phase2@example.invalid', full_name: 'Test', role: 'buyer', is_verified: true } : { csrfToken: 'test' }) });
      });
      await page.route('**/test-good.png', route => route.fulfill({ contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64') }));
      await page.route('**/test-broken.png', route => route.fulfill({ status: 404, body: '' }));
      await page.addInitScript(product => {
        localStorage.setItem('africlay-seller-catalog-v1', JSON.stringify({ initializedSellerIds: [], products: [product,
          { ...product, id: 'single-test', name: 'Single image product', images: [product.images[0]] },
          { ...product, id: 'empty-test', name: 'Empty image product', images: [] }] }));
        const original = Storage.prototype.setItem;
        window.failWishlist = false;
        window.wishlistWrites = 0;
        Storage.prototype.setItem = function (key, value) {
          if (key === 'africlay-wishlist' && window.failWishlist) throw new Error('Test storage failure');
          if (key === 'africlay-wishlist') window.wishlistWrites++;
          return original.call(this, key, value);
        };
      }, product);
      const openProduct = async () => {
        await page.getByRole('button', { name: 'View Gallery test product', exact: true }).click({ timeout: 60000 });
        await page.getByRole('button', { name: 'Product image 2 of 2', exact: true }).waitFor();
      };
      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await openProduct();
      console.log(`${width}px: product opened`);
      await page.getByRole('button', { name: 'Product image 2 of 2', exact: true }).click();
      await page.getByRole('img', { name: 'Image unavailable: Gallery test product', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Product image 1 of 2', exact: true }).click();
      await page.getByRole('img', { name: 'Gallery test product', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Add to wishlist', exact: true }).evaluate(button => { button.click(); button.click(); });
      await page.getByRole('button', { name: 'Remove from wishlist', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.wishlistWrites), 1);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openProduct();
      await page.getByRole('button', { name: 'Remove from wishlist', exact: true }).waitFor();
      await page.evaluate(() => { window.failWishlist = true; });
      await page.getByRole('button', { name: 'Remove from wishlist', exact: true }).click();
      await page.getByText('Unable to update wishlist. Tap the heart to retry.', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Remove from wishlist', exact: true }).count(), 1);
      await page.evaluate(() => { window.failWishlist = false; });
      await page.getByRole('button', { name: 'Remove from wishlist', exact: true }).click();
      await page.getByRole('button', { name: 'Add to wishlist', exact: true }).waitFor();
      const add = page.getByRole('button', { name: 'Add to Cart', exact: true });
      console.log(`${width}px: wishlist checks passed`);
      await add.click();
      await add.click();
      await page.getByText('Item added to cart', { exact: true }).waitFor();
      assert.equal(await page.getByText('Item added to cart', { exact: true }).count(), 1);
      await page.waitForFunction(() => [...document.querySelectorAll('[role="alert"]')].some(node =>
        node.textContent.includes('Item added to cart') && Number(getComputedStyle(node).opacity) === 1));
      await page.screenshot({ path: path.join(process.env.TEMP, `africlay-phase2-${width}.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.getByText('Item added to cart', { exact: true }).waitFor({ state: 'detached', timeout: 5000 });
      await page.getByRole('link', { name: /back$/i }).click();
      assert.equal(await page.getByText('Item added to cart', { exact: true }).count(), 0);
      assert.equal(await page.getByText('View Cart', { exact: true }).count(), 0);
      for (const name of ['Single image product', 'Empty image product']) {
        await page.getByRole('button', { name: `View ${name}`, exact: true }).click();
        await page.getByRole('button', { name: 'Add to Cart', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: /^Product image / }).count(), 0);
        if (name === 'Empty image product') await page.getByRole('img', { name: `Image unavailable: ${name}`, exact: true }).waitFor();
        await page.getByRole('link', { name: /back$/i }).click();
      }
      guest = true;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: 'Continue as Guest', exact: true }).click({ timeout: 60000 });
      await openProduct();
      await page.getByRole('button', { name: 'Add to wishlist', exact: true }).click();
      await page.getByText('Create a free account to continue', { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      console.log(`${width}px: gallery, broken image, wishlist save/error/retry, cart dismissal, guest auth and no runtime errors passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
