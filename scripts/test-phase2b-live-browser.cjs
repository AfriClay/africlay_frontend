const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));
const backend = path.resolve(__dirname, '../../updated_backend/Africlay-server');
const origin = 'http://127.0.0.1:8081';
const checks = [];

async function check(name, action) {
  try {
    await action();
    checks.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, passed: false });
    console.log(`FAIL ${name}: ${error.message.split('\n')[0]}`);
  }
}

function sellerTokens() {
  const code = [
    'import json',
    'from authapp.models import User',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    "user = User.objects.get(email='phase2b-local-seller@example.invalid')",
    "print(json.dumps({'access': generate_access_token(user), 'refresh': generate_refresh_token(user)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error('Could not mint a short-lived local seller test session.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: 'Continue as Guest' }).click({ timeout: 60000 });
    await check('public products load in Home', async () => {
      await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().waitFor({ timeout: 45000 });
      await page.getByRole('button', { name: 'View Phase 2B Woven Mat' }).first().waitFor();
    });
    await check('catalog images render', async () => {
      await page.waitForFunction(() => [...document.images].some(image => image.src.includes('/media/') && image.naturalWidth > 0), { timeout: 15000 });
    });
    await check('product detail opens by public slug', async () => {
      await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().click();
      await page.getByText('Synthetic local test product for catalog verification.').waitFor();
      const response = await page.request.get('http://localhost:8000/api/products/phase2b-clay-tile/');
      assert.equal(response.status(), 200);
    });
    await check('product gallery shows second image', async () => {
      const second = page.getByRole('button', { name: 'Product image 2 of 2' });
      await second.waitFor({ timeout: 7000 });
      const mainImage = page.getByRole('img', { name: 'Phase 2B Clay Tile', exact: true }).last().locator('img').first();
      const firstSource = await mainImage.getAttribute('src');
      await second.click();
      let nextSource = firstSource;
      for (let attempt = 0; attempt < 20 && nextSource === firstSource; attempt++) {
        await page.waitForTimeout(100);
        nextSource = await mainImage.getAttribute('src');
      }
      assert.notEqual(nextSource, firstSource);
    });
    await check('store page opens', async () => {
      await page.getByText('View Store').click();
      await page.getByRole('button', { name: 'About' }).waitFor();
    });
    await check('store page lists its products', async () => {
      await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).waitFor();
    });
    await check('store Shop, Services, About, and Reviews tabs work', async () => {
      await page.getByRole('button', { name: 'About' }).click();
      await page.getByText('Development-only catalog verification store.').waitFor();
      await page.getByRole('button', { name: 'Services' }).click();
      await page.getByText('No services listed').waitFor();
      await page.getByRole('button', { name: 'Reviews' }).click();
      await page.getByText('No reviews yet').waitFor();
      await page.getByRole('button', { name: 'Shop' }).click();
    });
    await check('category and tag filters work in UI', async () => {
      await page.getByRole('button', { name: 'Test Ceramics' }).first().click();
      await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'View Phase 2B Woven Mat' }).count(), 0);
      await page.getByRole('button', { name: 'All', exact: true }).click();
      await page.getByRole('button', { name: 'Test Woven' }).click();
      await page.getByRole('button', { name: 'View Phase 2B Woven Mat' }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).count(), 0);
    });
    await check('no uncaught browser errors in public catalog', async () => {
      assert.deepEqual(pageErrors, []);
    });

    const authContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const tokens = sellerTokens();
    await authContext.addInitScript(({ access, refresh }) => {
      localStorage.setItem('africlay.accessToken', access);
      localStorage.setItem('africlay.refreshToken', refresh);
    }, tokens);
    const sellerPage = await authContext.newPage();
    const sellerErrors = [];
    sellerPage.on('pageerror', error => sellerErrors.push(error.message));
    await sellerPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });

    await check('verified seller session restores from backend', async () => {
      await sellerPage.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().waitFor({ timeout: 45000 });
      await sellerPage.getByRole('button', { name: 'View profile' }).click();
      await sellerPage.getByText('Verified User').waitFor();
    });
    await check('authenticated wishlist opens product', async () => {
      await sellerPage.getByRole('button', { name: 'Home', exact: true }).click();
      await sellerPage.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().click();
      await sellerPage.getByRole('button', { name: 'Add to wishlist' }).click();
      await sellerPage.getByRole('button', { name: 'Remove from wishlist' }).waitFor();
      await sellerPage.getByRole('button', { name: 'View profile' }).click();
      await sellerPage.getByText('Wishlist', { exact: true }).last().click();
      await sellerPage.getByRole('button', { name: 'View Phase 2B Clay Tile' }).click();
      await sellerPage.getByText('Synthetic local test product for catalog verification.').last().waitFor();
    });
    await check('verified seller can reach product management UI', async () => {
      await sellerPage.getByRole('button', { name: 'Sell', exact: true }).click();
      await sellerPage.getByRole('button', { name: 'Manage Products' }).waitFor({ timeout: 10000 });
    });
    const ownedProducts = async () => sellerPage.evaluate(async () => {
      const response = await fetch('http://localhost:8000/api/products/manage/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('africlay.accessToken')}` },
      });
      if (!response.ok) throw new Error(`Owned products returned ${response.status}`);
      return response.json();
    });
    await check('seller creates a draft and uploads an image through UI', async () => {
      const existingUiProduct = (await ownedProducts()).find(item => item.slug === 'phase2b-ui-product');
      if (existingUiProduct) {
        assert.equal(existingUiProduct.status, 'draft');
        assert.ok(existingUiProduct.images.length > 0, 'Existing UI image is missing');
        console.log('  Reused local UI product.');
        return;
      }
      await sellerPage.getByRole('button', { name: 'Add New Product' }).click();
      await sellerPage.getByRole('textbox', { name: 'Product name' }).fill('Phase 2B UI Product');
      await sellerPage.getByRole('textbox', { name: 'Product URL slug' }).fill('phase2b-ui-product');
      await sellerPage.getByRole('textbox', { name: 'SKU' }).fill('P2B-UI-001');
      await sellerPage.getByRole('textbox', { name: 'Product price' }).fill('950');
      await sellerPage.getByRole('textbox', { name: 'Stock count' }).fill('3');
      await sellerPage.getByRole('button', { name: 'Test Ceramics' }).last().click();
      const fixture = await sellerPage.request.get('http://localhost:8000/api/products/phase2b-clay-tile/');
      const source = await fixture.json();
      const imageResponse = await sellerPage.request.get(source.images[0].image);
      const chooser = sellerPage.waitForEvent('filechooser', { timeout: 10000 });
      await sellerPage.getByRole('button', { name: 'Add product image' }).click();
      await (await chooser).setFiles({ name: 'phase2b-ui-product.png', mimeType: 'image/png', buffer: await imageResponse.body() });
      await sellerPage.getByRole('button', { name: 'Save Product' }).click();
      await sellerPage.waitForFunction(async () => {
        const response = await fetch('http://localhost:8000/api/products/manage/', {
          headers: { Authorization: `Bearer ${localStorage.getItem('africlay.accessToken')}` },
        });
        if (!response.ok) return false;
        const product = (await response.json()).find(item => item.slug === 'phase2b-ui-product');
        return product?.images.length > 0;
      }, undefined, { timeout: 30000 });
      const created = (await ownedProducts()).find(item => item.slug === 'phase2b-ui-product');
      assert.ok(created, 'UI product was not saved');
      assert.equal(created.status, 'draft');
      assert.ok(created.images.length > 0, 'UI image was not uploaded');
    });
    await check('seller edits the product through UI', async () => {
      await sellerPage.getByRole('button', { name: 'Sell', exact: true }).click();
      await sellerPage.getByRole('button', { name: 'Manage Products' }).click();
      assert.equal(await sellerPage.getByText('Delete', { exact: true }).count(), 0);
      await sellerPage.getByRole('button', { name: 'View Phase 2B UI Product' }).click();
      await sellerPage.getByPlaceholder('Describe the product, materials, and condition').fill('Edited through the seller form.');
      await sellerPage.getByRole('button', { name: 'Save Product' }).click();
      await sellerPage.waitForTimeout(1500);
      const edited = (await ownedProducts()).find(item => item.slug === 'phase2b-ui-product');
      assert.equal(edited?.description, 'Edited through the seller form.');
    });
    await check('seller create/edit/upload API works from browser origin', async () => {
      const result = await sellerPage.evaluate(async () => {
        const root = 'http://localhost:8000';
        const headers = { Authorization: `Bearer ${localStorage.getItem('africlay.accessToken')}` };
        const existing = await fetch(`${root}/api/products/manage/`, { headers }).then(response => response.json());
        let product = existing.find(item => item.slug === 'phase2b-live-browser-draft');
        let created = false;
        if (!product) {
          const response = await fetch(`${root}/api/products/manage/`, {
            method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Phase 2B Browser Draft', slug: 'phase2b-live-browser-draft',
              sku: 'P2B-BROWSER-001', price: '850.00', currency: 'KES', stock_quantity: 2, status: 'draft' }),
          });
          if (response.status !== 201) throw new Error(`Create returned ${response.status}`);
          product = await response.json();
          created = true;
        }
        const edit = await fetch(`${root}/api/products/manage/${product.id}/`, {
          method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Edited through browser-origin Phase 2B check.' }),
        });
        if (edit.status !== 200) throw new Error(`Edit returned ${edit.status}`);
        const images = await fetch(`${root}/api/products/manage/${product.id}/images/`, { headers }).then(response => response.json());
        if (!images.some(image => image.alt_text === 'Phase 2B browser upload check')) {
          const publicProduct = await fetch(`${root}/api/products/phase2b-clay-tile/`).then(response => response.json());
          const fixtureImage = await fetch(publicProduct.images[0].image).then(response => response.blob());
          const form = new FormData();
          form.append('image', fixtureImage, 'phase2b-browser.png');
          form.append('alt_text', 'Phase 2B browser upload check');
          const upload = await fetch(`${root}/api/products/manage/${product.id}/images/`, {
            method: 'POST', headers, body: form,
          });
          if (upload.status !== 201) throw new Error(`Upload returned ${upload.status}`);
        }
        return { created, edited: true, uploaded: true };
      });
      assert.equal(result.edited, true);
      assert.equal(result.uploaded, true);
      console.log(result.created ? '  Created local browser draft.' : '  Reused local browser draft.');
    });
    await check('no uncaught browser errors in seller session', async () => {
      assert.deepEqual(sellerErrors, []);
    });
    await authContext.close();
  } finally {
    await context.close();
    await browser.close();
  }
  console.log(`${checks.filter(item => item.passed).length}/${checks.length} browser checks passed`);
  if (checks.some(item => !item.passed)) process.exitCode = 1;
}

main().catch(error => {
  console.error(`Browser verification stopped: ${error.message.split('\n')[0]}`);
  process.exitCode = 1;
});
