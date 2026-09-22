const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const backend = path.resolve(__dirname, '../../updated_backend/Africlay-server');
const origin = 'http://127.0.0.1:8081';
const api = 'http://localhost:8000/api';
const serviceSlug = 'phase-parity-local-clay-repair';
const serviceName = 'Phase Parity Local Clay Repair';

function localSellerTokens() {
  const code = [
    'import json',
    'from store_management.models import Store',
    'from authapp.utils import generate_access_token',
    "store = Store.objects.select_related('owner', 'kyc').get(slug='phase2b-local-studio')",
    "assert store.kyc.status == 'approved' and store.owner.is_verified",
    "print(json.dumps({'access': generate_access_token(store.owner)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error('The approved local seller fixture is unavailable.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

function localBuyerTokens() {
  const code = [
    'import json',
    'from authapp.models import User, UserProfile',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    "buyer = User.objects.get(email='phase3-local-buyer@example.invalid')",
    "assert buyer.role == 'buyer' and buyer.is_verified",
    'UserProfile.objects.get_or_create(user=buyer)',
    "print(json.dumps({'access': generate_access_token(buyer), 'refresh': generate_refresh_token(buyer)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error('The disposable local buyer fixture is unavailable.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

async function main() {
  const { access } = localSellerTokens();
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const existing = await page.request.get(`${api}/services/${serviceSlug}/`);
    if (existing.status() === 404) {
      const created = await page.request.post(`${api}/services/manage/`, {
        headers: { Authorization: `Bearer ${access}` },
        data: { name: serviceName, slug: serviceSlug, description: 'Local integration test service',
          price: '1500.00', currency: 'KES', duration_minutes: 60, status: 'published', tags: [] },
      });
      assert.equal(created.status(), 201, `Service fixture returned ${created.status()}`);
    } else assert.equal(existing.status(), 200);

    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByRole('button', { name: 'Continue as Guest' }).click();
    try {
      await page.getByRole('button', { name: `View ${serviceName}` }).first().waitFor({ timeout: 30000 });
    } catch (error) {
      console.error((await page.locator('body').innerText()).slice(0, 1500));
      console.error('Browser errors:', pageErrors.join(' | '));
      throw error;
    }
    await page.getByRole('button', { name: `View ${serviceName}` }).first().click();
    await page.getByText('Local integration test service').waitFor({ timeout: 30000 });
    await page.getByText('Online booking is not available yet.').waitFor();
    assert.deepEqual(pageErrors, []);
    console.log('PASS public service list, slug detail, honest booking state, and no browser errors');

    const buyerTokens = localBuyerTokens();
    const buyerContext = await browser.newContext({ viewport: { width: 1365, height: 900 } });
    await buyerContext.addInitScript(({ access, refresh }) => {
      localStorage.setItem('africlay.accessToken', access);
      localStorage.setItem('africlay.refreshToken', refresh);
    }, buyerTokens);
    const buyerPage = await buyerContext.newPage();
    const buyerErrors = [];
    buyerPage.on('pageerror', error => buyerErrors.push(error.message));
    try {
      await buyerPage.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await buyerPage.getByRole('button', { name: 'View Phase 2B Local Studio store' }).click();
      await buyerPage.getByRole('button', { name: 'Message seller' }).click();
      const testMessage = buyerPage.getByText('Local parity check', { exact: true });
      if (await testMessage.count() === 0) {
        await buyerPage.getByRole('textbox', { name: 'Message input' }).fill('Local parity check');
        await buyerPage.getByRole('button', { name: 'Send', exact: true }).click();
      }
      await testMessage.first().waitFor({ timeout: 30000 });
      console.log('PASS buyer-to-seller conversation and backend message');

      await buyerPage.getByRole('button', { name: 'View profile' }).click();
      await buyerPage.getByRole('button', { name: 'Settings', exact: true }).last().click();
      await buyerPage.getByRole('button', { name: 'Edit Profile' }).click();
      await buyerPage.getByRole('textbox', { name: 'Full name' }).fill('Phase Parity Buyer');
      await buyerPage.getByRole('button', { name: 'Save Profile' }).click();
      try {
        await buyerPage.getByText('Profile updated.').waitFor({ timeout: 30000 });
      } catch (error) {
        console.error((await buyerPage.locator('body').innerText()).slice(0, 1800));
        console.error('Browser errors:', buyerErrors.join(' | '));
        throw error;
      }
      const me = await buyerPage.request.get(`${api}/auth/me/`, { headers: { Authorization: `Bearer ${buyerTokens.access}` } });
      assert.equal(me.status(), 200);
      assert.equal((await me.json()).full_name, 'Phase Parity Buyer');
      console.log('PASS profile edit persisted through Django');

      await buyerPage.getByRole('button', { name: 'View profile' }).click();
      buyerPage.once('dialog', dialog => dialog.accept());
      await buyerPage.getByRole('button', { name: 'Logout' }).click();
      await buyerPage.getByRole('button', { name: 'Continue as Guest' }).waitFor({ timeout: 30000 });
      assert.equal(await buyerPage.evaluate(() => localStorage.getItem('africlay.accessToken')), null);
      assert.equal(await buyerPage.evaluate(() => localStorage.getItem('africlay.refreshToken')), null);
      assert.deepEqual(buyerErrors, []);
      console.log('PASS web logout cleared both tokens and returned to signed-out entry');
    } finally {
      await buyerContext.close();
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(`Feature parity browser validation stopped: ${error.message.split('\n')[0]}`);
  process.exitCode = 1;
});
