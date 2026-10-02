const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function setup({ platform = 'android', granted = true, removeFails = false } = {}) {
  const saved = new Map();
  const calls = [];
  const dependencies = {
    '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => saved.get(key) ?? null, setItem: async (key, value) => saved.set(key, value), removeItem: async key => saved.delete(key) } },
    'expo-constants': { __esModule: true, default: { executionEnvironment: 'standalone', easConfig: { projectId: 'project-id' } } },
    'expo-device': { isDevice: true },
    'react-native': { Platform: { OS: platform } },
    '@/src/store/push': { notifyPushChange: () => {} },
    '@/src/api/client': { api: { security: {
      registerPush: async (provider, token) => { calls.push({ provider, token }); return { id: 'registration-1', deliveryEnabled: false }; },
      removePush: async id => { if (removeFails) throw new Error('offline'); calls.push({ remove: id }); },
    } } },
    'expo-notifications': { AndroidImportance: { DEFAULT: 3 }, setNotificationChannelAsync: async () => {}, getPermissionsAsync: async () => ({ granted }), requestPermissionsAsync: async () => ({ granted }), getExpoPushTokenAsync: async () => ({ data: 'ExpoPushToken[test]' }) },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/push.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: name => dependencies[name] });
  return { api: exports, calls, saved };
}
test('push registration preserves delivery-disabled status and is scoped to the account', async () => {
  const { api, calls } = setup();
  const result = await api.registerDevicePush('user-1');
  assert.equal(result.deliveryEnabled, false);
  assert.equal((await api.getPushRegistration('user-1')).id, 'registration-1');
  assert.equal(await api.getPushRegistration('user-2'), null);
  assert.deepEqual(calls[0], { provider: 'expo', token: 'ExpoPushToken[test]' });
  await api.unregisterDevicePush('user-1');
  assert.deepEqual(calls[1], { remove: 'registration-1' });
  assert.equal(await api.getPushRegistration('user-1'), null);
});
test('denied permissions never register a push token', async () => {
  const { api, calls } = setup({ granted: false });
  await assert.rejects(api.registerDevicePush('user-1'), /not allowed/);
  assert.equal(calls.length, 0);
});
test('web cannot claim native push registration succeeded', async () => {
  const { api, calls } = setup({ platform: 'web' });
  await assert.rejects(api.registerDevicePush('user-1'), /mobile app/);
  assert.equal(calls.length, 0);
});
test('failed revocation preserves registration so it can be retried', async () => {
  const { api } = setup({ removeFails: true });
  await api.registerDevicePush('user-1');
  await assert.rejects(api.unregisterDevicePush('user-1'), /offline/);
  assert.equal((await api.getPushRegistration('user-1')).id, 'registration-1');
});
