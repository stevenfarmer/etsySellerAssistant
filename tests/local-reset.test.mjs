import assert from 'node:assert/strict';
import test from 'node:test';
import { resetLocalSetup } from '../dist/src/local/reset.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

test('reset clears all local credentials and settings only after explicit confirmation', async () => {
  const store = new InMemorySecretStore();
  for (const key of ['accessToken', 'refreshToken', 'appKeystring', 'appSharedSecret'])
    await store.set(key, 'fabricated');
  const events = [];
  const options = {
    confirmation: 'no',
    secretStore: store,
    async clearTokenState() {
      events.push('state');
    },
    async deleteConfig() {
      events.push('config');
    },
  };
  assert.equal(await resetLocalSetup(options), 'cancelled');
  assert.equal(await store.get('accessToken'), 'fabricated');
  assert.deepEqual(events, []);
  assert.equal(await resetLocalSetup({ ...options, confirmation: 'RESET' }), 'reset');
  for (const key of ['accessToken', 'refreshToken', 'appKeystring', 'appSharedSecret'])
    assert.equal(await store.get(key), undefined);
  assert.deepEqual(events, ['state', 'config']);
});

test('partial failures report failure without erasing configuration or leaking errors', async () => {
  const calls = [];
  const result = await resetLocalSetup({
    confirmation: 'RESET',
    secretStore: {
      async delete(key) {
        calls.push(key);
        throw new Error('private fake value');
      },
    },
    async clearTokenState() {
      calls.push('state');
    },
    async deleteConfig() {
      calls.push('config');
    },
  });
  assert.equal(result, 'failed');
  assert.deepEqual(calls, ['accessToken']);
});
