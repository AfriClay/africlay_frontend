const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(path.join(process.env.TEMP, 'africlay-phase2b-browser', 'node_modules', 'playwright'));

const origin = 'http://localhost:8081';
const desktopScreenshot = path.join(process.env.TEMP, 'africlay-ui-catalog-home.png');
const detailScreenshot = path.join(process.env.TEMP, 'africlay-ui-catalog-detail.png');
const mobileScreenshot = path.join(process.env.TEMP, 'africlay-ui-catalog-mobile.png');

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    args: ['--no-proxy-server'],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const guest = page.getByText('Continue as Guest');
    await guest.waitFor({ timeout: 30000 });
    await guest.click();

    const product = page.getByText('Ruby Hibiscus Tea').last();
    await product.waitFor({ timeout: 60000 });
    await page.getByText('Highland Pantry').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    console.log('PASS seeded products and sellers render on the marketplace home');

    await product.click();
    await page.getByRole('button', { name: 'Product image 2 of 3' }).waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Product image 2 of 3' }).click();
    await page.getByText(/Whole dried hibiscus petals/).waitFor();
    await page.getByText('View Store').waitFor({ timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: detailScreenshot, fullPage: true });
    console.log('PASS product detail loads by slug with three matching gallery images');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: mobileScreenshot, fullPage: true });

    assert.deepEqual(errors, []);
    console.log('PASS desktop and mobile catalog views completed without browser errors');
    console.log(`Screenshots: ${desktopScreenshot}, ${detailScreenshot}, ${mobileScreenshot}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(error => {
  console.error('UI catalog browser validation stopped:', error);
  process.exitCode = 1;
});
