const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const backend = path.resolve(__dirname, '../../updated_backend/Africlay-server');
const origin = 'http://127.0.0.1:8081';
const api = 'http://localhost:8000/api';
const buyerEmail = process.env.PHASE3_TEST_BUYER || 'phase3-local-buyer@example.invalid';
if (!/^phase3-[a-z0-9-]+@example\.invalid$/.test(buyerEmail)) {
  throw new Error('PHASE3_TEST_BUYER must be a disposable phase3-* address at example.invalid.');
}

function buyerTokens() {
  const code = [
    'import json',
    'from authapp.models import User, UserRole',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    `email = '${buyerEmail}'`,
    "user, created = User.objects.get_or_create(email=email, defaults={'role': UserRole.BUYER, 'is_verified': True, 'is_active': True})",
    "assert user.role == UserRole.BUYER and user.is_verified and user.is_active",
    "print(json.dumps({'access': generate_access_token(user), 'refresh': generate_refresh_token(user)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error('Could not create the local buyer test session.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

async function main() {
  const tokens = buyerTokens();
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  await context.addInitScript(({ access, refresh }) => {
    localStorage.setItem('africlay.accessToken', access);
    localStorage.setItem('africlay.refreshToken', refresh);
  }, tokens);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const get = async route => {
    const response = await page.request.get(`${api}${route}`, { headers: { Authorization: `Bearer ${tokens.access}` } });
    assert.equal(response.status(), 200, `${route} returned ${response.status()}`);
    return response.json();
  };
  const waitForCartCount = async quantity => {
    for (let attempt = 0; attempt < 35; attempt++) {
      const state = await get('/cart/');
      if (state.items.reduce((sum, item) => sum + item.quantity, 0) === quantity) return state;
      await page.waitForTimeout(200);
    }
    throw new Error(`Cart did not reach ${quantity} items.`);
  };

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().waitFor({ timeout: 60000 });
    console.log('PASS buyer session restored and real product loaded');

    const priorOrders = await get('/cart/orders/');
    const priorCart = await get('/cart/');
    for (const item of priorCart.items) {
      const response = await page.request.delete(`${api}/cart/items/${item.id}/`, { headers: { Authorization: `Bearer ${tokens.access}` } });
      assert.equal(response.status(), 204);
    }
    const stockBefore = (await page.request.get(`${api}/products/phase2b-clay-tile/`).then(response => response.json())).stock_quantity;

    await page.getByRole('button', { name: 'View Phase 2B Clay Tile' }).first().click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    let cart = await waitForCartCount(1);
    assert.equal(cart.items[0].product_slug, 'phase2b-clay-tile');
    console.log('PASS add-to-cart uses backend cart');

    await page.getByRole('button', { name: /Cart, 1 items/ }).click();
    await page.getByRole('button', { name: 'Increase Phase 2B Clay Tile quantity' }).click();
    cart = await waitForCartCount(2);
    assert.equal(cart.items[0].quantity, 2);
    await page.getByRole('button', { name: 'Decrease Phase 2B Clay Tile quantity' }).click();
    await waitForCartCount(1);
    console.log('PASS quantity update uses backend item UUID');

    await page.getByRole('button', { name: 'Remove Phase 2B Clay Tile' }).click();
    await waitForCartCount(0);
    await page.getByText('Your cart is empty. Add items to continue.').waitFor();
    console.log('PASS item removal and empty state');

    await page.getByRole('button', { name: 'Close cart' }).click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await waitForCartCount(1);
    await page.getByRole('button', { name: /Cart, 1 items/ }).click();
    await page.getByRole('button', { name: 'Proceed to checkout' }).click();
    await page.getByText('Delivery Address').waitFor();

    let addresses = await get('/auth/addresses/');
    if (!addresses.length) {
      await page.getByRole('button', { name: 'Add Address' }).click();
      await page.getByRole('textbox', { name: 'Recipient' }).fill('Phase 3 Buyer');
      await page.getByRole('textbox', { name: 'Street address' }).fill('Local Test Street 12');
      await page.getByRole('textbox', { name: 'City' }).fill('Nairobi');
      await page.getByRole('textbox', { name: 'Postal code' }).fill('00100');
      await page.getByRole('textbox', { name: 'Country' }).fill('Kenya');
      await page.getByRole('button', { name: 'Save Address' }).click();
      for (let attempt = 0; attempt < 25; attempt++) {
        addresses = await get('/auth/addresses/');
        if (addresses.length) break;
        await page.waitForTimeout(200);
      }
      assert.equal(addresses.length, 1);
    }
    await page.getByRole('radio', { name: /Local Test Street 12|Phase 3 Buyer/ }).click();
    console.log('PASS saved shipping address selected');

    if (priorOrders.length === 0) {
      await page.getByRole('button', { name: 'Place Order' }).click();
      await page.getByText('Order placed').waitFor({ timeout: 30000 });
      const orders = await get('/cart/orders/');
      assert.equal(orders.length, 1);
      assert.equal(orders[0].status, 'pending');
      assert.equal(orders[0].items[0].quantity, 1);
      assert.ok((await page.getByText(`Order #${orders[0].id} was created. Payment has not been collected.`).count()) > 0);
      await waitForCartCount(0);
      const stockAfter = (await page.request.get(`${api}/products/phase2b-clay-tile/`).then(response => response.json())).stock_quantity;
      assert.equal(stockAfter, stockBefore - 1);
      console.log('PASS real checkout created pending order, cleared cart, and decremented stock');
    } else {
      console.log('SKIP second checkout: this local buyer already has a real order');
      await page.getByRole('button', { name: 'Close checkout' }).click();
      const remaining = await get('/cart/');
      for (const item of remaining.items) {
        await page.request.delete(`${api}/cart/items/${item.id}/`, { headers: { Authorization: `Bearer ${tokens.access}` } });
      }
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: 'View profile' }).click();
    await page.getByText('My Orders', { exact: true }).last().click();
    const persisted = await get('/cart/orders/');
    assert.ok(persisted.length > 0);
    await page.getByRole('button', { name: `View order ${persisted[0].id}` }).click();
    await page.getByText(`Order #${persisted[0].id}`).waitFor();
    console.log('PASS order history and detail survive app reload');

    const signedOut = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    const signedOutPage = await signedOut.newPage();
    await signedOutPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await signedOutPage.getByRole('button', { name: 'Continue as Guest' }).waitFor({ timeout: 60000 });
    assert.equal(await signedOutPage.evaluate(() => localStorage.getItem('africlay.accessToken')), null);
    await signedOut.close();
    console.log('PASS signed-out browser context has no user cart session');
    assert.deepEqual(pageErrors, []);
    console.log('PASS no uncaught browser errors');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(`Phase 3 browser validation stopped: ${error.message.split('\n')[0]}`);
  process.exitCode = 1;
});
