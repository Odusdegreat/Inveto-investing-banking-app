const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function client(handler) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/api/client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ request: handler, pages: handler }) });
  return exports.api;
}
test('profile and security patches omit fields rejected by strict server validation', async () => {
  const calls = [];
  const api = client(async (path, options) => { calls.push({ path, ...options }); return {}; });
  await api.user.update({ id: 'forged', tier: 'premium', fullName: 'New name' });
  await api.security.update({ pinSet: true, biometricsType: 'face', autoLockSeconds: 120 }, 'proof');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body)), { fullName: 'New name' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].body)), { autoLock: 120, stepUpToken: 'proof' });
});
test('notification links come from recognized targets, never server hrefs', async () => {
  const api = client(async () => [
    { id: 'n1', targetType: 'transaction', targetId: 'a/b', href: 'https://untrusted.test' },
    { id: 'n2', targetType: 'unknown', href: '/securitysettings' },
  ]);
  const notices = await api.notifications.list();
  assert.equal(notices[0].href, '/transaction/a%2Fb');
  assert.equal(notices[1].href, null);
});
test('watchlist IDs are adapted to frontend items', async () => {
  const api = client(async () => ['product-1']);
  assert.equal((await api.investing.watchlist())[0].productId, 'product-1');
});
test('PIN proof is action-scoped and money mutations carry idempotency headers', async () => {
  const calls = [];
  const api = client(async (path, options) => { calls.push({ path, ...options }); return {}; });
  await api.auth.verifyPin('5678', 'transfer');
  await api.transfers.send({ fromAccountId: 'account-1', beneficiaryId: 'beneficiary-1', amount: 20, note: '', stepUpToken: 'proof' }, 'logical-transfer-1');
  await api.investing.placeOrder({ productId: 'product-1', side: 'buy', units: 1, stepUpToken: 'proof-2' }, 'logical-order-1');
  assert.equal(calls[0].body.action, 'transfer');
  assert.equal(calls[1].idempotencyKey, 'logical-transfer-1');
  assert.equal(calls[2].idempotencyKey, 'logical-order-1');
  const contract = require('../docs/backend-openapi.json');
  for (const call of calls) assert.ok(contract.paths[call.path][call.method.toLowerCase()]);
});
test('accounts normalize backend accountNumber and decimal balances', async () => {
  const api = client(async () => [{ id: 'account-1', accountNumber: '0123456789', balance: '123.45', interestRate: '2.5', name: 'Wallet', kind: 'wallet', currency: 'USD' }]);
  const [account] = await api.accounts.list();
  assert.equal(account.number, '0123456789');
  assert.equal(account.balance, 123.45);
  assert.equal(account.interestRate, 2.5);
});
test('accounts without a number keep an explicit missing value', async () => {
  const api = client(async () => [{ id: 'account-1', balance: 0 }]);
  const [account] = await api.accounts.list();
  assert.equal(account.number, null);
  assert.equal(account.interestRate, null);
});
test('new flows use their documented routes and strict request bodies', async () => {
  const calls = [];
  const api = client(async (path, options) => { calls.push({ path, ...options }); return {}; });
  await api.auth.confirmPasswordReset('reset-token', 'Password123!');
  await api.auth.requestEmailVerification('user@example.test');
  await api.auth.confirmEmailVerification('verification-token');
  await api.cards.initializeLink();
  await api.cards.confirmLink('checkout-reference');
  await api.auth.biometricRegistrationOptions('enroll-proof');
  await api.auth.registerBiometric('challenge-1', { id: 'credential-1', response: { attestationObject: 'signed' } });
  await api.auth.biometricChallenge('transfer');
  await api.auth.verifyBiometric('challenge-2', { id: 'credential-1', response: { signature: 'signed' } });
  await api.security.biometricCredentials();
  await api.security.revokeBiometric('credential-1', 'downgrade-proof');
  await api.security.registerPush('expo', 'ExponentPushToken[test]');
  await api.security.removePush('push-1');
  const contract = require('../docs/backend-openapi.json');
  for (const call of calls) {
    const path = call.path.replace(/\/biometric-credentials\/[^/]+$/, '/biometric-credentials/{id}').replace(/\/push-tokens\/[^/]+$/, '/push-tokens/{id}');
    const operation = contract.paths[path]?.[(call.method ?? 'GET').toLowerCase()];
    assert.ok(operation, `Missing contract route: ${call.method} ${path}`);
    const ref = operation.requestBody?.content['application/json'].schema.$ref;
    if (ref) {
      const schema = contract.components.schemas[ref.split('/').pop()];
      const body = JSON.parse(JSON.stringify(call.body));
      for (const field of Object.keys(body)) assert.ok(field in schema.properties, `Unexpected ${field} in ${path}`);
      for (const field of schema.required ?? []) assert.ok(field in body, `Missing ${field} in ${path}`);
    }
  }
  assert.equal(calls[0].public, true);
  assert.equal(calls[2].public, true);
  assert.equal(calls[4].body.reference, 'checkout-reference');
  assert.equal(calls[7].body.action, 'transfer');
  assert.equal(calls[10].body.stepUpToken, 'downgrade-proof');
});
