const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(platform, fetch) {
  const storage = new Map();
  let nativeLoads = 0;
  const exports = {};
  const code = ts.transpileModule(readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.test/api' } },
    Headers, FormData, fetch, navigator: {},
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
  return { ...exports, storage, nativeLoads: () => nativeLoads };
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('web never loads native storage and sends cookies plus CSRF, not bearer tokens', async () => {
  const requests = [];
  const api = load('web', async (url, init) => {
    requests.push({ url, init });
    return json(url.endsWith('/csrf/') ? { csrfToken: 'csrf-only' } : { user: {} });
  });
  await api.tokenManager.setTokens({ access: 'must-not-store', refresh: 'must-not-store' });
  assert.equal(await api.tokenManager.getAccessToken(), undefined);
  await api.tokenManager.clearTokens();
  await api.apiClient('/auth/login/', { method: 'POST', auth: false, body: {}, headers: { Authorization: 'Bearer forbidden' } });
  const { init } = requests[1];
  assert.equal(init.credentials, 'include');
  assert.equal(init.headers.get('X-CSRFToken'), 'csrf-only');
  assert.equal(init.headers.get('Authorization'), null);
  assert.equal(api.nativeLoads(), 0);
});

test('native persists rotated tokens, retries with new bearer, and omits cookies', async () => {
  let calls = 0;
  const api = load('android', async (url, init) => {
    assert.equal(init.credentials, 'omit');
    if (url.endsWith('/token/refresh/')) {
      assert.equal(JSON.parse(init.body).refresh, 'old-refresh');
      return json({ access: 'new-access', refresh: 'new-refresh' });
    }
    calls++;
    if (calls === 1) return json({}, 401);
    assert.equal(init.headers.get('Authorization'), 'Bearer new-access');
    return json({ id: 'user' });
  });
  await api.tokenManager.setTokens({ access: 'old-access', refresh: 'old-refresh' });
  await api.apiClient('/auth/me/');
  assert.equal(await api.tokenManager.getRefreshToken(), 'new-refresh');
  assert.equal(calls, 2);
});

test('concurrent web 401s share one refresh', async () => {
  let refreshed = false;
  let refreshes = 0;
  const api = load('web', async url => {
    if (url.endsWith('/csrf/')) return json({ csrfToken: 'csrf' });
    if (url.endsWith('/token/refresh/')) {
      refreshes++;
      await new Promise(resolve => setTimeout(resolve, 10));
      refreshed = true;
      return json({ message: 'refreshed' });
    }
    return json({}, refreshed ? 200 : 401);
  });
  await Promise.all([api.apiClient('/auth/me/'), api.apiClient('/auth/me/')]);
  assert.equal(refreshes, 1);
});

test('failed refresh clears native storage and notifies auth context', async () => {
  const api = load('android', async () => json({}, 401));
  await api.tokenManager.setTokens({ access: 'old', refresh: 'revoked' });
  let expired = false;
  api.onSessionExpired(() => { expired = true; });
  await assert.rejects(api.apiClient('/auth/me/'));
  assert.equal(api.storage.size, 0);
  assert.equal(expired, true);
});

test('a failed retried API request does not discard a successfully refreshed session', async () => {
  let attempts = 0;
  const api = load('android', async url => {
    if (url.endsWith('/token/refresh/')) return json({ access: 'new', refresh: 'new-refresh' });
    return json({}, ++attempts === 1 ? 401 : 500);
  });
  await api.tokenManager.setTokens({ access: 'old', refresh: 'old-refresh' });
  await assert.rejects(api.apiClient('/auth/me/'), error => error.status === 500);
  assert.equal(await api.tokenManager.getAccessToken(), 'new');
});
