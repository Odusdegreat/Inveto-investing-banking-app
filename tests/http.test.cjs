const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetch) {
  const exports = {};
  let stored = null;
  const source = ts.transpileModule(fs.readFileSync('src/api/http.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports, require: (name) => name === 'react-native' ? { Platform: { OS: 'ios' } } : { getItemAsync: async () => stored, setItemAsync: async (_, value) => { stored = value; }, deleteItemAsync: async () => { stored = null; } }, fetch, AbortController, setTimeout, clearTimeout, process: { env: { EXPO_PUBLIC_API_URL: 'http://backend.test/' } } };
  vm.runInNewContext(source, context);
  return exports;
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
test('authenticated writes send direct bodies and preserve idempotency on refresh', async () => {
  const calls = [];
  const api = load(async (url, options) => {
    calls.push({ url, ...options });
    if (url.endsWith('/auth/refresh')) return json({ accessToken: 'new', refreshToken: 'rotated' });
    if (options.headers.Authorization === 'Bearer old') return json({ code: 'expired' }, 401);
    return json({ id: 'transfer-1' });
  });
  await api.saveTokens({ accessToken: 'old', refreshToken: 'refresh' });
  const body = { amount: 10, stepUpToken: 'proof' };
  const result = await api.request('/transfers', { method: 'POST', body, idempotencyKey: 'transfer-retry-1' });
  assert.equal(result.id, 'transfer-1');
  assert.equal(calls.length, 3);
  assert.equal(calls[0].body, JSON.stringify(body));
  assert.equal(calls[2].body, calls[0].body);
  assert.equal(calls[2].headers['Idempotency-Key'], 'transfer-retry-1');
  assert.equal(calls[2].headers.Authorization, 'Bearer new');
  assert.equal(calls[1].headers.Authorization, undefined);
});
test('concurrent 401 responses share one token refresh', async () => {
  let refreshes = 0;
  const api = load(async (url, options) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; await new Promise(r => setTimeout(r, 10)); return json({ accessToken: 'new', refreshToken: 'next' }); }
    return options.headers.Authorization === 'Bearer old' ? json({}, 401) : json([]);
  });
  await api.saveTokens({ accessToken: 'old', refreshToken: 'refresh' });
  await Promise.all([api.request('/accounts'), api.request('/cards')]);
  assert.equal(refreshes, 1);
});
test('invalid refresh clears session and notifies the app', async () => {
  const api = load(async () => json({ code: 'invalid_token', message: 'Session expired' }, 401));
  await api.saveTokens({ accessToken: 'old', refreshToken: 'bad' });
  let expired = false;
  api.onSessionExpired(() => { expired = true; });
  await assert.rejects(api.request('/accounts'), { code: 'invalid_token' });
  assert.equal(expired, true);
  assert.equal(await api.hydrate(), null);
});
test('transient failures preserve the session and do not retry a mutation', async () => {
  let calls = 0;
  const api = load(async () => { calls++; throw new Error('offline'); });
  await api.saveTokens({ accessToken: 'old', refreshToken: 'refresh' });
  await assert.rejects(api.request('/transfers', { method: 'POST', body: {}, idempotencyKey: 'same-key' }), { code: 'network_error' });
  assert.equal(calls, 1);
  assert.equal((await api.hydrate()).accessToken, 'old');
});
test('204 responses and structured errors are supported', async () => {
  const api = load(async (url) => url.endsWith('/empty') ? new Response(null, { status: 204 }) : json({ code: 'rate_limited', message: 'Slow down', requestId: 'req-1' }, 429));
  assert.equal(await api.request('/empty'), undefined);
  await assert.rejects(api.request('/limited'), { code: 'rate_limited', status: 429, requestId: 'req-1' });
});
test('cursor pagination continues through full pages', async () => {
  const api = load(async (url) => url.includes('before=99') ? json([{ id: '100' }]) : json(Array.from({ length: 100 }, (_, id) => ({ id: String(id) }))));
  assert.equal((await api.pages('/transactions?accountId=abc')).length, 101);
});
test('logout during refresh cannot restore or replay the old session', async () => {
  let release;
  let started;
  const refreshing = new Promise(resolve => { started = resolve; });
  const api = load(async (url) => {
    if (url.endsWith('/auth/refresh')) {
      started();
      await new Promise(resolve => { release = resolve; });
      return json({ accessToken: 'new', refreshToken: 'new-refresh' });
    }
    return json({}, 401);
  });
  await api.saveTokens({ accessToken: 'old', refreshToken: 'refresh' });
  const pending = api.request('/accounts');
  const rejected = assert.rejects(pending, { code: 'session_expired' });
  await refreshing;
  await api.saveTokens(null);
  release();
  await rejected;
  assert.equal(await api.hydrate(), null);
});
