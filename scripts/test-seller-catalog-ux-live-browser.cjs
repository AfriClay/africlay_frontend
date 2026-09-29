const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));
const backend = path.resolve(__dirname, '../../new_updated_server');
const origin = process.env.WEB_ORIGIN || 'http://127.0.0.1:8082';

function sellerTokens() {
  const code = [
    'import json',
    'from authapp.models import User',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    "user = User.objects.filter(role__in=['seller', 'both'], is_verified=True, store__isnull=False).first()",
    "assert user is not None, 'No verified local seller with a store exists.'",
    "print(json.dumps({'access': generate_access_token(user), 'refresh': generate_refresh_token(user)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Could not create a local seller test session.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tokens = sellerTokens();
  await context.addInitScript(session => {
    localStorage.setItem('africlay.accessToken', session.access);
    localStorage.setItem('africlay.refreshToken', session.refresh);
  }, tokens);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByText('Explore categories', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await page.getByRole('button', { name: 'Messages', exact: true }).count(), 0);

    const homeBox = await page.getByRole('button', { name: 'Home', exact: true }).boundingBox();
    const profileBox = await page.getByRole('button', { name: 'Profile', exact: true }).boundingBox();
    assert.ok(homeBox && profileBox && homeBox.y < profileBox.y, 'Home must appear before Profile in the desktop menu.');

    await page.getByRole('button', { name: 'Sell', exact: true }).click();
    await page.getByRole('button', { name: 'Add New Product', exact: true }).click();
    await page.getByLabel('Product name', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Product URL slug', { exact: true }).count(), 0);
    assert.equal(await page.getByLabel('SKU', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Add product images', exact: true }).waitFor();
    await page.getByText('Listing status', { exact: true }).waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    const addImages = page.getByRole('button', { name: 'Add product images', exact: true });
    await addImages.scrollIntoViewIfNeeded();
    assert.ok(await addImages.isVisible());
    assert.deepEqual(errors, []);

    const screenshot = path.join(os.tmpdir(), 'africlay-seller-product-form.png');
    await page.screenshot({ path: screenshot, fullPage: true });
    console.log(`PASS seller catalog UX (${screenshot})`);
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(`Seller catalog UX validation failed: ${error.message}`);
  process.exitCode = 1;
});
