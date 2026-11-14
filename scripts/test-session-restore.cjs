const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../src/contexts/AuthContext.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
} }).outputText;

function restoreHarness({ access = 'access', refresh = 'refresh', result } = {}) {
  const tokens = { access, refresh };
  let clears = 0;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'react') return { createContext: () => ({}) };
    if (name === '../services/api') return { tokenManager: {
      getAccessToken: async () => tokens.access,
      getRefreshToken: async () => tokens.refresh,
      clearTokens: async () => { tokens.access = undefined; tokens.refresh = undefined; clears++; },
    }, onSessionExpired: () => () => {} };
    if (name === '../services/authService') return { authService: { currentUser: async () => {
      if (typeof result === 'function') return result(tokens);
      if (result instanceof Error) throw result;
      return result ?? { id: 'buyer-id', role: 'buyer' };
    } } };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return { readSavedSession: exports.readSavedSession, tokens, clears: () => clears };
}

test('saved session is restored when the backend responds', async () => {
  const { readSavedSession } = restoreHarness();
  const state = await readSavedSession();
  assert.equal(state.user.id, 'buyer-id');
  assert.equal(state.restoreError, undefined);
});

test('startup network failure retains tokens and offers session retry', async () => {
  const { readSavedSession, tokens, clears } = restoreHarness({ result: new Error('network unavailable') });
  const state = await readSavedSession();
  assert.equal(state.user, undefined);
  assert.equal(state.restoreError, true);
  assert.equal(state.initialized, true);
  assert.equal(tokens.refresh, 'refresh');
  assert.equal(clears(), 0);
});

test('startup with no saved credentials proceeds as guest', async () => {
  const { readSavedSession } = restoreHarness({ access: null, refresh: null });
  const state = await readSavedSession();
  assert.equal(state.isGuest, true);
  assert.equal(state.restoreError, undefined);
});

test('invalid restored session becomes a signed-out guest after token revocation', async () => {
  const { readSavedSession, tokens } = restoreHarness({ result: saved => {
    saved.access = undefined;
    saved.refresh = undefined;
    throw new Error('refresh revoked');
  } });
  const state = await readSavedSession();
  assert.equal(state.isGuest, true);
  assert.equal(state.restoreError, undefined);
  assert.equal(tokens.refresh, undefined);
});
