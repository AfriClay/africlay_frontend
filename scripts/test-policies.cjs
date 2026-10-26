const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = relativePath => readFileSync(path.join(root, relativePath), 'utf8');

test('the generated policy library contains every supplied public document', () => {
  const policies = JSON.parse(source('src/content/policies.generated.json'));
  assert.deepEqual(policies.map(policy => policy.id), ['partner-terms', 'shipping-and-delivery', 'seller-commission']);
  assert.ok(policies.every(policy => policy.sections.length > 0));
  assert.ok(policies.every(policy => policy.highlights.length >= 4));
  assert.equal(policies.find(policy => policy.id === 'partner-terms').hasPlaceholders, true);
  assert.match(policies.find(policy => policy.id === 'shipping-and-delivery').sections.map(section => section.title).join(' '), /Shipping Fees/);
  assert.match(JSON.stringify(policies.find(policy => policy.id === 'seller-commission')), /10%/);
});

test('policies are public, deep-linkable, and available from marketplace navigation', () => {
  const rootNavigator = source('src/navigation/RootNavigator.tsx');
  const linking = source('src/navigation/linking.ts');
  const profile = source('src/screens/profile/Profile.tsx');
  const shell = source('src/components/layout/MarketplaceShell.tsx');
  assert.match(rootNavigator, /<Stack\.Screen name="Policies" component=\{Policies\}/);
  assert.match(linking, /Policies: 'policies\/:policyId\?'/);
  assert.match(profile, /label: 'Terms & Policies', route: 'Policies'/);
  assert.match(shell, /label="Terms & policies"/);
});

test('registration, checkout, and seller onboarding link to relevant policies', () => {
  const register = source('src/screens/auth/Register.tsx');
  const checkout = source('src/screens/cart/Checkout.tsx');
  const startSelling = source('src/screens/seller/StartSelling.tsx');
  assert.match(register, /accessibilityRole="link"[\s\S]*Terms & Policies/);
  assert.match(register, /navigate\('Policies'\)/);
  assert.match(checkout, /policyId: 'shipping-and-delivery'/);
  assert.match(checkout, /Shipping & Delivery Policy/);
  assert.match(startSelling, /policyId: 'seller-commission'/);
  assert.match(startSelling, /Seller terms and commission/);
});

test('the policy notice is versioned, dismissible, and does not claim server-side consent', () => {
  const notice = source('src/components/legal/PolicyNotice.tsx');
  assert.match(notice, /POLICY_NOTICE_VERSION/);
  assert.match(notice, /AsyncStorage\.getItem\(noticeKey\)/);
  assert.match(notice, /AsyncStorage\.setItem\(noticeKey, 'dismissed'\)/);
  assert.match(notice, /secondaryActionLabel="Not now"/);
  assert.doesNotMatch(notice, /accept|consent|agreed/i);
});

test('the policy reader owns its scroll viewport and supports search and expansion', () => {
  const screen = source('src/screens/legal/Policies.tsx');
  assert.match(screen, /testID="policies-scroll"/);
  assert.match(screen, /Search this policy/);
  assert.match(screen, /Expand all/);
  assert.match(screen, /accessibilityState=\{\{ expanded \}\}/);
  assert.match(screen, /This partner agreement template contains bracketed commercial fields/);
});
