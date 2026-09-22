const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const backend = path.resolve(__dirname, '../../updated_backend/Africlay-server');
const origin = 'http://localhost:8081';
const api = 'http://localhost:8000/api';
const fixtureEmail = 'admin-ui-seller@example.invalid';
const storeSlug = 'admin-ui-review-store';
const storeName = 'Admin UI Review Store';
const desktopScreenshot = path.join(process.env.TEMP, 'africlay-admin-desktop.png');
const mobileScreenshot = path.join(process.env.TEMP, 'africlay-admin-mobile.png');
const kycScreenshot = path.join(process.env.TEMP, 'africlay-admin-kyc.png');
const taxonomyScreenshot = path.join(process.env.TEMP, 'africlay-admin-taxonomy.png');

function prepareSession() {
  const code = [
    'import json',
    'from django.utils import timezone',
    'from authapp.models import User, UserProfile, UserRole',
    'from authapp.utils import generate_access_token, generate_refresh_token',
    'from store_management.models import Store, StoreKYC, StoreKYCStatus',
    "admin = User.objects.filter(role=UserRole.SUPER_ADMIN, is_active=True).first() or User.objects.filter(role=UserRole.ADMIN, is_active=True).first()",
    "assert admin is not None, 'No active application admin exists'",
    `seller = User.objects.filter(email='${fixtureEmail}').first()`,
    `seller = seller or User.objects.create_user(email='${fixtureEmail}', role=UserRole.SELLER, is_verified=True, is_active=True)`,
    'UserProfile.objects.get_or_create(user=seller)',
    `store, _ = Store.objects.get_or_create(owner=seller, defaults={'name': '${storeName}', 'slug': '${storeSlug}'})`,
    `assert store.slug == '${storeSlug}'`,
    "kyc, _ = StoreKYC.objects.update_or_create(store=store, defaults={'business_name': 'Admin UI Review Business', 'business_registration_number': 'ADMIN-REG-1', 'tax_identification_number': 'ADMIN-TAX-1', 'document_type': 'business_registration', 'status': StoreKYCStatus.PENDING, 'submitted_at': timezone.now(), 'reviewed_at': None, 'reviewed_by': None, 'rejection_reason': ''})",
    "print(json.dumps({'access': generate_access_token(admin), 'refresh': generate_refresh_token(admin)}))",
  ].join('; ');
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) throw new Error(result.stderr || 'Could not prepare the admin browser fixture.');
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
}

function cleanupFixture() {
  const code = `from authapp.models import User; User.objects.filter(email='${fixtureEmail}').delete()`;
  const result = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'python', 'manage.py', 'shell', '-c', code], {
    cwd: backend, encoding: 'utf8', timeout: 30000,
  });
  if (result.status !== 0) console.warn('Could not remove the disposable admin browser fixture.');
}

async function main() {
  const tokens = prepareSession();
  const browser = await chromium.launch({ headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', args: ['--no-proxy-server'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ access, refresh }) => {
    localStorage.setItem('africlay.accessToken', access);
    localStorage.setItem('africlay.refreshToken', refresh);
  }, tokens);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.getByText('Admin console').waitFor({ timeout: 60000 });
    await page.getByText(storeName).first().waitFor({ timeout: 30000 });
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: mobileScreenshot, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(await page.getByRole('tab', { name: 'Home' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: /Cart/ }).count(), 0);
    console.log('PASS admin role opens isolated console without marketplace navigation');

    await page.getByRole('tab', { name: 'KYC review' }).click();
    await page.getByText(storeName).first().click();
    await page.screenshot({ path: kycScreenshot, fullPage: true });
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('button', { name: 'Confirm approval' }).click();
    for (let attempt = 0; attempt < 30; attempt++) {
      const response = await page.request.get(`${api}/stores/${storeSlug}/kyc/`, { headers: { Authorization: `Bearer ${tokens.access}` } });
      if (response.status() === 200 && (await response.json()).status === 'approved') break;
      await page.waitForTimeout(200);
      if (attempt === 29) throw new Error('KYC approval was not persisted.');
    }
    console.log('PASS KYC approval persisted through the real admin endpoint');

    await page.getByRole('tab', { name: 'Taxonomy' }).click();
    await page.getByText('Product categories').first().waitFor();
    await page.getByRole('button', { name: 'Add record' }).waitFor();
    await page.screenshot({ path: taxonomyScreenshot, fullPage: true });
    console.log('PASS taxonomy management loaded');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Log out' }).click();
    await page.getByRole('button', { name: 'Continue as Guest' }).waitFor({ timeout: 30000 });
    assert.equal(await page.evaluate(() => localStorage.getItem('africlay.accessToken')), null);
    assert.deepEqual(errors, []);
    console.log('PASS admin logout cleared session and no browser errors occurred');
    console.log(`Screenshots: ${desktopScreenshot}, ${mobileScreenshot}, ${kycScreenshot}, ${taxonomyScreenshot}`);
  } finally {
    await context.close();
    await browser.close();
    cleanupFixture();
  }
}

main().catch(error => {
  console.error('Admin browser validation stopped:', error);
  process.exitCode = 1;
});
