const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = 'http://localhost:8081';
const api = 'http://localhost:8000/api';
const backend = path.resolve(__dirname, '../../updated_backend/Africlay-server');

function localTokens(email) {
  const code = [
    'import json',
    'from authapp.models import User',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    `user = User.objects.get(email=${JSON.stringify(email)})`,
    "print(json.dumps({'access': generate_access_token(user), 'refresh': generate_refresh_token(user)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error(`Local fixture ${email} is unavailable.`);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

async function addCartFixtureIfNeeded(request, access) {
  const headers = { Authorization: `Bearer ${access}` };
  const cartResponse = await request.get(`${api}/cart/`, { headers });
  assert.equal(cartResponse.status(), 200);
  const cart = await cartResponse.json();
  if (cart.items.length) return;
  const productsResponse = await request.get(`${api}/products/`);
  assert.equal(productsResponse.status(), 200);
  const payload = await productsResponse.json();
  const product = Array.isArray(payload) ? payload[0] : payload.results[0];
  const addResponse = await request.post(`${api}/cart/items/`, { headers, data: { product: product.id, quantity: 1 } });
  assert.equal(addResponse.status(), 201);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const errors = [];
  const guestContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guestPage = await guestContext.newPage();
  guestPage.on('pageerror', error => errors.push(error.message));

  try {
    await guestPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await guestPage.getByRole('button', { name: 'Continue as Guest', exact: true }).click();
    await guestPage.getByText('Explore categories', { exact: true }).waitFor({ timeout: 60000 });

    const carousel = guestPage.getByTestId('promotional-carousel');
    const initialScroll = await carousel.evaluate(element => element.scrollLeft);
    await guestPage.waitForTimeout(5400);
    const automaticScroll = await carousel.evaluate(element => element.scrollLeft);
    assert.ok(automaticScroll > initialScroll, 'Promotional carousel did not advance automatically.');
    console.log('PASS landing carousel advances automatically');

    await guestPage.getByText('See all', { exact: true }).first().click();
    await guestPage.getByLabel('Search products', { exact: true }).waitFor({ timeout: 30000 });
    const productLinks = guestPage.locator('[aria-label^="View "]:not([aria-label="View profile"]):not([aria-label$=" store"]):visible');
    await productLinks.first().waitFor({ timeout: 30000 });
    const renderedProductCount = await productLinks.count();
    console.log(`Rendered product cards: ${renderedProductCount}`);
    assert.ok(renderedProductCount >= 3);
    const boxes = await Promise.all([0, 1, 2].map(index => productLinks.nth(index).boundingBox()));
    assert.ok(boxes.every(Boolean));
    const heights = boxes.map(box => box.height);
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 2, 'Product card heights are inconsistent.');
    const gap = boxes[1].x - (boxes[0].x + boxes[0].width);
    assert.ok(gap >= 0 && gap <= 24, `Product gap is too large: ${gap}px.`);
    await guestPage.screenshot({ path: path.join(process.env.TEMP, 'africlay-ui-corrections-products.png'), fullPage: true });
    console.log('PASS product cards have stable height and compact desktop spacing');

    await guestPage.getByRole('button', { name: 'Home', exact: true }).click();
    const storeLink = guestPage.locator('[aria-label^="View "][aria-label$=" store"]:visible').first();
    await guestPage.setViewportSize({ width: 1440, height: 500 });
    await storeLink.click();
    await guestPage.getByRole('tab', { name: 'Shop', exact: true }).waitFor({ timeout: 30000 });
    await guestPage.mouse.move(1000, 420);
    await guestPage.mouse.wheel(0, 560);
    await guestPage.waitForTimeout(300);
    const contentScrollTop = await guestPage.evaluate(() => Math.max(0, ...Array.from(document.querySelectorAll('*'))
      .filter(element => element.scrollHeight > element.clientHeight + 1 && getComputedStyle(element).overflowY === 'auto')
      .map(element => element.scrollTop)));
    assert.ok(contentScrollTop > 0, 'Store profile did not scroll with its products.');
    console.log('PASS seller profile and products share one scrolling surface');
  } finally {
    await guestContext.close();
  }

  const buyerTokens = localTokens('phase3-local-buyer@example.invalid');
  const buyerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await buyerContext.addInitScript(tokens => {
    localStorage.setItem('africlay.accessToken', tokens.access);
    localStorage.setItem('africlay.refreshToken', tokens.refresh);
  }, buyerTokens);
  const buyerPage = await buyerContext.newPage();
  buyerPage.on('pageerror', error => errors.push(error.message));
  try {
    await addCartFixtureIfNeeded(buyerContext.request, buyerTokens.access);
    await buyerPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await buyerPage.getByText('Explore categories', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await buyerPage.getByRole('button', { name: 'Sell', exact: true }).count(), 0);
    console.log('PASS buyer navigation does not expose seller tools');

    await buyerPage.getByRole('button', { name: /^Cart, / }).click();
    const productLink = buyerPage.getByRole('link', { name: /^View / }).first();
    await productLink.waitFor({ timeout: 30000 });
    await productLink.click();
    await buyerPage.getByRole('button', { name: 'Add to Cart', exact: true }).waitFor({ timeout: 30000 });
    console.log('PASS cart item opens its product detail');

    assert.equal(await buyerPage.getByRole('button', { name: 'Messages', exact: true }).count(), 0);
    console.log('PASS messaging is absent from buyer navigation');
  } finally {
    await buyerContext.close();
  }

  const sellerTokens = localTokens('ui-seed.amina.otieno@example.invalid');
  const sellerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await sellerContext.addInitScript(tokens => {
    localStorage.setItem('africlay.accessToken', tokens.access);
    localStorage.setItem('africlay.refreshToken', tokens.refresh);
  }, sellerTokens);
  const sellerPage = await sellerContext.newPage();
  sellerPage.on('pageerror', error => errors.push(error.message));
  try {
    await sellerPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sellerPage.getByText('Explore categories', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await sellerPage.getByRole('button', { name: 'Sell', exact: true }).count(), 1);
    console.log('PASS seller navigation retains seller tools');
  } finally {
    await sellerContext.close();
    await browser.close();
  }

  assert.deepEqual(errors, []);
  console.log('PASS UI corrections completed without browser runtime errors');
}

main().catch(error => {
  console.error(`UI correction validation stopped: ${error.message}`);
  process.exit(1);
});
