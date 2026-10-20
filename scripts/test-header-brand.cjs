const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');

test('the shared marketplace brand presents the logo and full platform name', () => {
  const brand = source('src/components/ui/MarketplaceBrand.tsx');
  assert.match(brand, /africlay-brand-v1\.svg/);
  assert.match(brand, />AfriClay<\/Text>/);
  assert.match(brand, />Market<\/Text>/);
  assert.match(brand, /accessibilityLabel=\{accessible \? 'AfriClay Market'/);
});

test('desktop and compact headers use the shared brand lockup', () => {
  const shell = source('src/components/layout/MarketplaceShell.tsx');
  const home = source('src/screens/home/Home.tsx');
  assert.match(shell, /<MarketplaceBrand accessible=\{false\} \/>/);
  assert.match(home, /<MarketplaceBrand[\s\S]+compact[\s\S]+showName=\{canRevealBrandName\}/);
  assert.match(home, /const canRevealBrandName = width >= 360/);
});

test('compact wordmark yields space to scrolling and search with reduced-motion support', () => {
  const home = source('src/screens/home/Home.tsx');
  assert.match(home, /setBrandCondensed\(true\)/);
  assert.match(home, /onScroll=\{handleContentScroll\}/);
  assert.match(home, /Animated\.subtract\(1, searchProgress\)/);
  assert.match(home, /duration: reduceMotion \? 0 : 160/);
});
