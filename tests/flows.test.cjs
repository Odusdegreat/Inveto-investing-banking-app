const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, URL, require: (name) => dependencies[name] ?? {} });
  return exports;
}
const links = load('src/lib/links.ts');
test('tokens accept raw values or links and reject ambiguous query arrays', () => {
  assert.equal(links.actionToken('  reset-123  '), 'reset-123');
  assert.equal(links.actionToken('inveto://reset-password?token=abc%2B123'), 'abc+123');
  assert.equal(links.singleParam(['first', 'second']), '');
  assert.equal(links.actionToken('https://example.test/reset-password'), '');
});
test('checkout only opens HTTPS Paystack links without embedded credentials', () => {
  assert.equal(links.paystackCheckoutUrl('https://checkout.paystack.com/test'), 'https://checkout.paystack.com/test');
  for (const url of ['javascript:alert(1)', 'http://checkout.paystack.com/test', 'https://paystack.com.attacker.test', 'https://attacker.test', 'https://user:password@checkout.paystack.com']) assert.throws(() => links.paystackCheckoutUrl(url));
});
test('account masking tolerates missing numbers and masks real values', () => {
  const { maskAccountNumber } = load('src/lib/format.ts');
  assert.equal(maskAccountNumber(undefined), 'Not available');
  assert.equal(maskAccountNumber(null), 'Not available');
  assert.equal(maskAccountNumber('   '), 'Not available');
  assert.equal(maskAccountNumber('1234'), '1234');
  assert.equal(maskAccountNumber('0123456789'), '\u2022\u2022\u2022\u2022 6789');
});
test('native auth and payment callbacks land on the matching UI', () => {
  const { redirectSystemPath } = load('app/+native-intent.tsx');
  assert.equal(redirectSystemPath({ path: 'inveto://auth/password/reset/confirm?token=abc', initial: true }), '/reset-password?token=abc');
  assert.equal(redirectSystemPath({ path: 'inveto://auth/email-verification/confirm?token=abc', initial: false }), '/verify-email?token=abc');
  assert.equal(redirectSystemPath({ path: 'inveto://cards/link/callback?reference=ref1', initial: true }), '/card-link?reference=ref1');
});
