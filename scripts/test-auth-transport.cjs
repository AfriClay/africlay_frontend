const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = file => ts.transpileModule(
  readFileSync(path.join(__dirname, '..', file), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function harness(platform, fetch) {
  const storage = new Map();
  let nativeLoads = 0;
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const api = {};
  vm.runInNewContext(source('src/services/api.ts'), {
    exports: api, Headers, FormData, fetch, localStorage,
    process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/api' } },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-secure-store') {
        nativeLoads++;
        if (platform === 'web') throw new Error('Native storage used by browser');
        return {
          getItemAsync: async key => storage.get(key),
          setItemAsync: async (key, value) => storage.set(key, value),
          deleteItemAsync: async key => storage.delete(key),
        };
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  const auth = {};
  vm.runInNewContext(source('src/services/authService.ts'), {
    exports: auth,
    require(name) {
      if (name === './api') return api;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { api, auth, storage, nativeLoads: () => nativeLoads };
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('public web request needs no token and makes no CSRF or cookie request', async () => {
  const requests = [];
  const { api, nativeLoads } = harness('web', async (url, init) => {
    requests.push({ url, init });
    return json({ message: 'ok' });
  });
  await api.apiClient('/auth/register/', { method: 'POST', auth: false, body: {}, headers: { Authorization: 'Bearer stale' } });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/auth\/register\/$/);
  assert.equal(requests[0].init.credentials, 'omit');
  assert.equal(requests[0].init.headers.get('Authorization'), null);
  assert.equal(requests[0].init.headers.get('X-Auth-Transport'), null);
  assert.equal(requests[0].init.headers.get('X-CSRFToken'), null);
  assert.equal(nativeLoads(), 0);
});

for (const platform of ['web', 'android']) {
  test(`${platform} persists tokens and sends bearer on authenticated requests`, async () => {
    const requests = [];
    const { api, storage, nativeLoads } = harness(platform, async (url, init) => {
      requests.push({ url, init });
      return json({ id: 'user' });
    });
    await api.tokenManager.setTokens({ access: 'access-one', refresh: 'refresh-one' });
    assert.equal(await api.tokenManager.getAccessToken(), 'access-one');
    assert.equal(await api.tokenManager.getRefreshToken(), 'refresh-one');
    await api.apiClient('/auth/me/');
    assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer access-one');
    assert.equal(requests[0].init.credentials, 'omit');
    await api.tokenManager.clearTokens();
    assert.equal(storage.size, 0);
    if (platform === 'web') assert.equal(nativeLoads(), 0);
    else assert.ok(nativeLoads() > 0);
  });
}

test('401 rotates the top-level token pair and retries once with the new bearer', async () => {
  const requests = [];
  const { api } = harness('web', async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/token/refresh/')) {
      assert.equal(JSON.parse(init.body).refresh, 'old-refresh');
      assert.equal(init.headers.get('Authorization'), null);
      return json({ access: 'new-access', refresh: 'new-refresh' });
    }
    return json({ id: 'user' }, requests.length === 1 ? 401 : 200);
  });
  await api.tokenManager.setTokens({ access: 'old-access', refresh: 'old-refresh' });
  await api.apiClient('/auth/me/');
  assert.equal(requests.length, 3);
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer old-access');
  assert.equal(requests[2].init.headers.get('Authorization'), 'Bearer new-access');
  assert.equal(await api.tokenManager.getRefreshToken(), 'new-refresh');
});

test('concurrent 401s share one refresh request', async () => {
  let refreshes = 0;
  let requests = 0;
  const { api } = harness('web', async (url, init) => {
    if (url.endsWith('/token/refresh/')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return json({ access: 'new', refresh: 'rotated' });
    }
    requests++;
    return json({}, init.headers.get('Authorization') === 'Bearer old' ? 401 : 200);
  });
  await api.tokenManager.setTokens({ access: 'old', refresh: 'old-refresh' });
  await Promise.all([api.apiClient('/auth/me/'), api.apiClient('/auth/me/')]);
  assert.equal(refreshes, 1);
  assert.equal(requests, 4);
});

test('failed refresh clears both tokens and notifies session listeners', async () => {
  const { api, storage } = harness('web', async () => json({}, 401));
  await api.tokenManager.setTokens({ access: 'old', refresh: 'revoked' });
  let expired = 0;
  api.onSessionExpired(() => { expired++; });
  await assert.rejects(api.apiClient('/auth/me/'), error => error.status === 401);
  assert.equal(storage.size, 0);
  assert.equal(expired, 1);
});

test('repeated 401 does not refresh or retry indefinitely', async () => {
  let refreshes = 0;
  let protectedRequests = 0;
  const { api, storage } = harness('android', async url => {
    if (url.endsWith('/token/refresh/')) {
      refreshes++;
      return json({ access: 'new', refresh: 'new-refresh' });
    }
    protectedRequests++;
    return json({}, 401);
  });
  await api.tokenManager.setTokens({ access: 'old', refresh: 'old-refresh' });
  await assert.rejects(api.apiClient('/auth/me/'), error => error.status === 401);
  assert.equal(refreshes, 1);
  assert.equal(protectedRequests, 2);
  assert.equal(storage.size, 0);
});

test('a non-401 retry failure preserves the refreshed session', async () => {
  let requests = 0;
  const { api } = harness('android', async url => {
    if (url.endsWith('/token/refresh/')) return json({ access: 'new', refresh: 'new-refresh' });
    return json({}, ++requests === 1 ? 401 : 500);
  });
  await api.tokenManager.setTokens({ access: 'old', refresh: 'old-refresh' });
  await assert.rejects(api.apiClient('/auth/me/'), error => error.status === 500);
  assert.equal(await api.tokenManager.getAccessToken(), 'new');
});

test('multipart keeps its boundary header managed by fetch', async () => {
  const requests = [];
  const { api } = harness('web', async (url, init) => {
    requests.push({ url, init });
    return json({});
  });
  await api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  const form = new FormData();
  form.append('avatar', 'image');
  await api.apiClient('/auth/me/', { method: 'PATCH', body: form });
  assert.equal(requests[0].init.headers.get('Content-Type'), null);
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer access');
  assert.equal(requests[0].init.body, form);
});

test('login and verification store the backend nested token pair', async () => {
  const { auth, api } = harness('web', async url => json({
    user: { id: '1', email: 'member@example.test', role: 'buyer', is_verified: true },
    tokens: url.endsWith('/login/')
      ? { access: 'login-access', refresh: 'login-refresh' }
      : { access: 'verified-access', refresh: 'verified-refresh' },
  }));
  await auth.authService.login('member@example.test', 'password');
  assert.equal(await api.tokenManager.getRefreshToken(), 'login-refresh');
  await auth.authService.verifyEmail('member@example.test', '123456');
  assert.equal(await api.tokenManager.getAccessToken(), 'verified-access');
});

test('registration and profile update keep their existing Django fields', async () => {
  const requests = [];
  const { auth, api } = harness('web', async (url, init) => {
    requests.push({ url, init });
    return json({ user: { id: '1', email: 'member@example.test', role: 'buyer', profile: { first_name: 'John', last_name: 'Kimari' } } });
  });
  const registered = await auth.authService.register('John Kimari', 'member@example.test', 'password123');
  assert.equal(registered.name, 'John Kimari');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    email: 'member@example.test', password: 'password123', password_confirm: 'password123',
    role: 'buyer', first_name: 'John', last_name: 'Kimari',
  });
  assert.equal(requests[0].init.headers.get('Authorization'), null);
  await api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  const updated = await auth.authService.updateProfile({ name: 'John Kimari', phoneNumber: '0700000000', bio: 'Maker' });
  assert.equal(updated.name, 'John Kimari');
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    first_name: 'John', last_name: 'Kimari', phone_number: '0700000000', bio: 'Maker',
  });
  assert.equal(requests[1].init.headers.get('Authorization'), 'Bearer access');
});

test('startup current-user lookup uses bearer and /auth/me/', async () => {
  const requests = [];
  const { auth, api } = harness('web', async (url, init) => {
    requests.push({ url, init });
    return json({ id: '1', email: 'member@example.test', role: 'buyer' });
  });
  await api.tokenManager.setTokens({ access: 'saved-access', refresh: 'saved-refresh' });
  const user = await auth.authService.currentUser();
  assert.equal(user.id, '1');
  assert.match(requests[0].url, /\/auth\/me\/$/);
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer saved-access');
});

test('logout sends current bearer and refresh after any rotation, then clears storage', async () => {
  const requests = [];
  const { auth, api, storage } = harness('web', async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/token/refresh/')) return json({ access: 'new-access', refresh: 'new-refresh' });
    if (url.endsWith('/auth/me/')) return json({}, init.headers.get('Authorization') === 'Bearer old-access' ? 401 : 200);
    return json({ message: 'ok' });
  });
  await api.tokenManager.setTokens({ access: 'old-access', refresh: 'old-refresh' });
  await auth.authService.logout();
  const logout = requests.find(({ url }) => url.endsWith('/auth/logout/'));
  assert.equal(logout.init.headers.get('Authorization'), 'Bearer new-access');
  assert.deepEqual(JSON.parse(logout.init.body), { refresh: 'new-refresh' });
  assert.equal(storage.size, 0);
});

test('logout clears local credentials when the server rejects the session', async () => {
  const { auth, api, storage } = harness('web', async () => json({}, 401));
  await api.tokenManager.setTokens({ access: 'old', refresh: 'invalid' });
  await assert.rejects(auth.authService.logout());
  assert.equal(storage.size, 0);
});

test('password and OTP methods preserve backend request fields', async () => {
  const requests = [];
  const { auth, api } = harness('web', async (url, init) => {
    requests.push({ url, init });
    return json({ message: 'ok' });
  });
  await api.tokenManager.setTokens({ access: 'access', refresh: 'refresh' });
  await auth.authService.resendVerification('member@example.test');
  await auth.authService.sendPasswordReset('member@example.test');
  await auth.authService.resetPassword('member@example.test', '123456', 'new-password');
  await auth.authService.changePassword('old-password', 'new-password');
  assert.deepEqual(JSON.parse(requests[0].init.body), { email: 'member@example.test', otp_type: 'email_verification' });
  assert.deepEqual(JSON.parse(requests[2].init.body), {
    email: 'member@example.test', otp_code: '123456',
    new_password: 'new-password', new_password_confirm: 'new-password',
  });
  assert.equal(requests[3].init.headers.get('Authorization'), 'Bearer access');
  assert.deepEqual(JSON.parse(requests[3].init.body), {
    old_password: 'old-password', new_password: 'new-password', new_password_confirm: 'new-password',
  });
});
