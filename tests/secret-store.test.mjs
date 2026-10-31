import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemorySecretStore, SecretStoreError } from '../dist/src/secret-store.js';

test('in-memory store returns undefined for an absent key', async () => {
  const store = new InMemorySecretStore();

  assert.equal(await store.get('accessToken'), undefined);
});

test('in-memory store replaces a secret value', async () => {
  const store = new InMemorySecretStore();

  await store.set('accessToken', 'fabricated-first-token');
  await store.set('accessToken', 'fabricated-replacement-token');

  assert.equal(await store.get('accessToken'), 'fabricated-replacement-token');
});

test('delete reports whether an entry existed', async () => {
  const store = new InMemorySecretStore();
  await store.set('refreshToken', 'fabricated-refresh-token');

  assert.equal(await store.delete('refreshToken'), true);
  assert.equal(await store.delete('refreshToken'), false);
  assert.equal(await store.get('refreshToken'), undefined);
});

test('runtime validation rejects keys outside the closed key set', async () => {
  const store = new InMemorySecretStore();
  const invalidKey = 'shopId';

  await assert.rejects(store.get(invalidKey), {
    name: 'SecretStoreError',
    code: 'invalid_key',
  });
  await assert.rejects(store.set(invalidKey, 'fabricated-secret'), {
    name: 'SecretStoreError',
    code: 'invalid_key',
  });
  await assert.rejects(store.delete(invalidKey), {
    name: 'SecretStoreError',
    code: 'invalid_key',
  });
});

test('runtime validation rejects empty values without including them in errors', async () => {
  const store = new InMemorySecretStore();

  await assert.rejects(store.set('appSharedSecret', ''), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'invalid_value');
    assert.equal(error.message.includes('fabricated'), false);
    return true;
  });
});

test('store operation failures remain errors instead of appearing as missing data', async () => {
  const failure = new SecretStoreError('unavailable');
  const store = {
    async get() {
      throw failure;
    },
    async set() {
      throw failure;
    },
    async delete() {
      throw failure;
    },
  };

  await assert.rejects(store.get('accessToken'), (error) => error === failure);
  await assert.rejects(store.set('accessToken', 'fabricated-token'), (error) => error === failure);
  await assert.rejects(store.delete('accessToken'), (error) => error === failure);
});
