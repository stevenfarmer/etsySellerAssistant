import assert from 'node:assert/strict';
import test from 'node:test';
import { createOsSecretStore } from '../dist/src/os-secret-store.js';
import { SecretStoreError } from '../dist/src/secret-store.js';

function createFakeBackend({ deleteRemoves = true, readFailure, writeFailure } = {}) {
  const values = new Map();
  const createdEntries = [];
  const factory = (service, account) => {
    createdEntries.push({ service, account });
    return {
      async getPassword() {
        if (readFailure) throw readFailure;
        return values.get(account) ?? null;
      },
      async setPassword(value) {
        if (writeFailure) throw writeFailure;
        values.set(account, value);
      },
      async deletePassword() {
        const existed = values.has(account);
        if (deleteRemoves) values.delete(account);
        return existed && deleteRemoves;
      },
    };
  };
  return { factory, values, createdEntries };
}

test('OS store maps the closed secret keys into one fixed service and persists fabricated values', async () => {
  const backend = createFakeBackend();
  const store = createOsSecretStore({ platform: 'darwin', backendFactory: backend.factory });

  assert.equal(await store.get('accessToken'), undefined);
  await store.set('accessToken', 'fabricated-access-token');
  assert.equal(await store.get('accessToken'), 'fabricated-access-token');
  assert.deepEqual(backend.createdEntries, [
    { service: 'etsySellerAssistant', account: 'accessToken' },
  ]);
});

test('unsupported platform fails closed without constructing the injected backend', async () => {
  let factoryCalls = 0;
  const store = createOsSecretStore({
    platform: 'linux',
    backendFactory: () => {
      factoryCalls += 1;
      throw new Error('must not be called');
    },
  });

  await assert.rejects(store.get('appKeystring'), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'unavailable');
    return true;
  });
  assert.equal(factoryCalls, 0);
});

test('delete confirms absence by reading the backend again', async () => {
  const backend = createFakeBackend();
  const store = createOsSecretStore({ platform: 'win32', backendFactory: backend.factory });
  await store.set('refreshToken', 'fabricated-refresh-token');

  assert.equal(await store.delete('refreshToken'), true);
  assert.equal(await store.delete('refreshToken'), false);
  assert.equal(await store.get('refreshToken'), undefined);
});

test('delete fails if the backend reports success but leaves a value behind', async () => {
  const backend = createFakeBackend({ deleteRemoves: false });
  const store = createOsSecretStore({ platform: 'darwin', backendFactory: backend.factory });
  await store.set('appSharedSecret', 'fabricated-shared-secret');

  await assert.rejects(store.delete('appSharedSecret'), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'operation_failed');
    assert.equal(error.message.includes('fabricated'), false);
    return true;
  });
});

test('backend read and write failures are typed and never expose backend messages', async () => {
  const readBackend = createFakeBackend({
    readFailure: new Error('fabricated token must stay private'),
  });
  const readStore = createOsSecretStore({ platform: 'win32', backendFactory: readBackend.factory });
  await assert.rejects(readStore.get('accessToken'), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'operation_failed');
    assert.equal(error.message.includes('fabricated'), false);
    return true;
  });

  const writeBackend = createFakeBackend({
    writeFailure: Object.assign(new Error('raw denial details'), { code: 'EACCES' }),
  });
  const writeStore = createOsSecretStore({
    platform: 'darwin',
    backendFactory: writeBackend.factory,
  });
  await assert.rejects(writeStore.set('appKeystring', 'fabricated-keystring'), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'access_denied');
    assert.equal(error.message.includes('raw denial details'), false);
    return true;
  });
});

test('runtime validation rejects unknown keys and malformed secret input', async () => {
  const backend = createFakeBackend();
  const store = createOsSecretStore({ platform: 'darwin', backendFactory: backend.factory });

  await assert.rejects(store.get('shopId'), { name: 'SecretStoreError', code: 'invalid_key' });
  await assert.rejects(store.set('accessToken', ''), {
    name: 'SecretStoreError',
    code: 'invalid_value',
  });
  await assert.rejects(store.set('accessToken', ' \n '), {
    name: 'SecretStoreError',
    code: 'invalid_value',
  });
  await assert.rejects(store.set('accessToken', 'fabricated\u0000token'), {
    name: 'SecretStoreError',
    code: 'invalid_value',
  });
  assert.deepEqual(backend.createdEntries, []);
});
