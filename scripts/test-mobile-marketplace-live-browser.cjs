const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = process.env.AFRICLAY_WEB_ORIGIN || 'http://localhost:8082';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const guest = page.getByRole('button', { name: 'Continue as Guest', exact: true });
    const home = page.getByText('Explore categories', { exact: true });
    await Promise.race([guest.waitFor({ timeout: 60_000 }), home.waitFor({ timeout: 60_000 })]);
    if (await guest.isVisible()) await guest.click();
    await home.waitFor({ timeout: 60_000 });

    await page.getByRole('button', { name: /^Cart, / }).waitFor();
    await page.getByRole('button', { name: 'Search products and services' }).waitFor();
    await page.screenshot({ path: path.join(process.env.TEMP, 'africlay-mobile-home.png') });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByText('Shop by Category', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Browse Tableware').count(), 0, 'The drawer still renders nested category branches.');

    const homeCategory = page.getByLabel('Browse Home and Living').last();
    await homeCategory.click();
    await page.getByLabel('Search products', { exact: true }).waitFor({ timeout: 30_000 });
    await page.getByRole('radio', { name: 'Browse Home and Living' }).waitFor();
    assert.equal(await page.getByText('Tableware', { exact: true }).count(), 0, 'The product screen still renders the taxonomy tree.');

    const cards = page.locator('[aria-label^="View "]:visible');
    await cards.first().waitFor({ timeout: 30_000 });
    assert.ok(await cards.count() > 0, 'Selecting a parent category did not render descendant products.');
    await page.waitForTimeout(500);
    const tagChip = await page.getByRole('button', { name: 'All tags', exact: true }).boundingBox();
    const firstCard = await cards.first().boundingBox();
    assert.ok(tagChip && firstCard && firstCard.y >= tagChip.y + tagChip.height, 'Product cards overlap the mobile filters.');
    await page.screenshot({ path: path.join(process.env.TEMP, 'africlay-mobile-marketplace.png') });
    assert.deepEqual(errors, []);
    console.log('PASS compact Home actions, root-only drawer categories, category results, and browser runtime');
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error(`Mobile marketplace validation stopped: ${error.stack || error.message}`);
  process.exit(1);
});
