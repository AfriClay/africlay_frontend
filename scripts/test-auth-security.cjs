const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function createAuth(responses) {
  const calls = [];
  const savedTokens = [];
  const exports = {};
  const filename = path.resolve(__dirname, '../src/services/authService.ts');
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === './api') return {
      apiClient: async (url, options) => { calls.push({ url, options }); return responses[url]; },
      tokenManager: { setTokens: async tokens => savedTokens.push(tokens) },
      getApiErrorMessage: () => '',
    };
    if (name === '../content/policies') return { registrationPolicyRequirements: { buyer: ['buyer_terms'] } };
    throw new Error(`Unexpected runtime import: ${name}`);
  } });
  return { service: exports.authService, calls, savedTokens };
}

const user = { id: 'user-id', email: 'buyer@example.com', role: 'buyer', is_verified: false };

test('unverified login never stores credentials as a signed-in session', async () => {
  const { service, savedTokens } = createAuth({ '/auth/login/': { user, verification_required: true } });
  const result = await service.login('buyer@example.com', 'password');
  assert.equal(result.verificationRequired, true);
  assert.equal(savedTokens.length, 0);
});

test('registration reports an email delivery failure and verification stores issued tokens', async () => {
  const tokens = { access: 'test-access', refresh: 'test-refresh' };
  const { service, calls, savedTokens } = createAuth({
    '/auth/register/': { user, verification_delivery: 'failed' },
    '/auth/verify-email/': { user: { ...user, is_verified: true }, tokens },
  });
  const registration = await service.register('Buyer Name', 'buyer@example.com', 'password', 'buyer');
  assert.equal(registration.deliveryFailed, true);
  assert.equal(savedTokens.length, 0);
  assert.equal(calls[0].options.body.accepted_policies[0], 'buyer_terms');
  const verified = await service.verifyEmail('buyer@example.com', '123456');
  assert.equal(verified.user.verified, true);
  assert.equal(savedTokens[0], tokens);
});

test('profile email preferences round-trip through the authenticated profile contract', async () => {
  const backendUser = { ...user, profile: { notification_preferences: {
    email_order_updates: true, email_seller_sales: false,
  } } };
  const { service, calls } = createAuth({
    '/auth/me/': { user: backendUser },
  });
  const result = await service.updateProfile({ notificationPreferences: {
    email_order_updates: true, email_seller_sales: false,
    email_booking_updates: true, email_seller_bookings: false,
  } });
  assert.deepEqual(calls[0].options.body.notification_preferences, {
    email_order_updates: true, email_seller_sales: false,
    email_booking_updates: true, email_seller_bookings: false,
  });
  assert.equal(result.notificationPreferences.email_order_updates, true);
  assert.equal(result.notificationPreferences.email_seller_sales, false);
  assert.equal(result.notificationPreferences.email_booking_updates, true);
  assert.equal(result.notificationPreferences.email_seller_bookings, false);
});

test('buyer order emails default on and seller emails default off', async () => {
  const { service } = createAuth({ '/auth/me/': { ...user, profile: { notification_preferences: {} } } });
  const result = await service.currentUser();
  assert.equal(result.notificationPreferences.email_order_updates, true);
  assert.equal(result.notificationPreferences.email_seller_sales, false);
  assert.equal(result.notificationPreferences.email_booking_updates, true);
  assert.equal(result.notificationPreferences.email_seller_bookings, false);
});
