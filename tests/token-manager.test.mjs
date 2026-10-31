import assert from 'node:assert/strict';
import test from 'node:test';
import { createTokenManager, TokenManagerError } from '../dist/src/auth/token-manager.js';
import { SecretStoreError } from '../dist/src/secret-store.js';

const OWNER_ID = 71001;

function ownerToken(value) {
  return /^\d+\./.test(value) ? value : `${OWNER_ID}.${value}`;
}

function createManager(options) {
  return createTokenManager({ expectedOwnerId: OWNER_ID, ...options });
}

function makeGrant(accessToken, refreshToken, expiresIn = 3600, scope = ['listings_r']) {
  return {
    accessToken: ownerToken(accessToken),
    refreshToken: ownerToken(refreshToken),
    expiresIn,
    scope,
  };
}

function createStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  const operations = [];
  let failSetKey;
  const store = {
    async get(key) {
      operations.push(`get:${key}`);
      return values.get(key);
    },
    async set(key, value) {
      operations.push(`set:${key}`);
      if (failSetKey === key) {
        failSetKey = undefined;
        throw new SecretStoreError('access_denied');
      }
      values.set(key, value);
    },
    async delete(key) {
      operations.push(`delete:${key}`);
      return values.delete(key);
    },
    values,
    operations,
    failNextSet(key) {
      failSetKey = key;
    },
  };
  return store;
}

test('accepts a grant in refresh-token-first order and keeps expiry in memory', async () => {
  let clock = 1_000_000;
  let transportCalls = 0;
  const store = createStore();
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    now: () => clock,
    expirySkewMs: 1_000,
    transport: async () => {
      transportCalls += 1;
      return makeGrant('unexpected', 'unexpected');
    },
  });

  await manager.acceptGrant(makeGrant('fabricated-access', 'fabricated-refresh', 60));
  assert.deepEqual(store.operations, ['set:refreshToken', 'set:accessToken']);
  assert.equal(await manager.getAccessToken(), ownerToken('fabricated-access'));
  assert.equal(transportCalls, 0);

  clock += 59_000;
  assert.equal(await manager.getAccessToken(), ownerToken('unexpected'));
  assert.equal(transportCalls, 1);
});

test('serializes concurrent refreshes and persists the rotated refresh token first', async () => {
  const store = createStore({
    refreshToken: ownerToken('fabricated-old-refresh'),
    accessToken: ownerToken('stale-access'),
  });
  let resolveGrant;
  let announceTransport;
  let transportCalls = 0;
  const transportStarted = new Promise((resolve) => {
    announceTransport = resolve;
  });
  const transportResult = new Promise((resolve) => {
    resolveGrant = resolve;
  });
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    now: () => 2_000_000,
    transport: async (clientId, refreshToken) => {
      transportCalls += 1;
      announceTransport();
      assert.equal(clientId, 'fabricated-client');
      assert.equal(refreshToken, ownerToken('fabricated-old-refresh'));
      return transportResult;
    },
  });

  const first = manager.getAccessToken();
  const second = manager.getAccessToken();
  const third = manager.getAccessToken();
  await transportStarted;
  assert.equal(transportCalls, 1);
  resolveGrant(makeGrant('fabricated-new-access', 'fabricated-new-refresh'));

  assert.deepEqual(await Promise.all([first, second, third]), [
    ownerToken('fabricated-new-access'),
    ownerToken('fabricated-new-access'),
    ownerToken('fabricated-new-access'),
  ]);
  assert.deepEqual(store.operations, ['get:refreshToken', 'set:refreshToken', 'set:accessToken']);
});

test('refresh failures preserve stored credentials and do not expose transport errors', async () => {
  const store = createStore({
    accessToken: ownerToken('fabricated-access'),
    refreshToken: ownerToken('fabricated-refresh'),
  });
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    transport: async () => {
      throw new Error('fabricated token details');
    },
  });

  await assert.rejects(manager.getAccessToken(), (error) => {
    assert.ok(error instanceof TokenManagerError);
    assert.equal(error.code, 'refresh_failed');
    assert.equal(error.message.includes('fabricated token details'), false);
    return true;
  });
  assert.equal(store.values.get('accessToken'), ownerToken('fabricated-access'));
  assert.equal(store.values.get('refreshToken'), ownerToken('fabricated-refresh'));
  assert.equal(store.operations.includes('delete:accessToken'), false);
  assert.equal(store.operations.includes('delete:refreshToken'), false);
});

test('access-token persistence failure keeps the newly rotated refresh token and fails closed', async () => {
  const store = createStore({
    accessToken: ownerToken('fabricated-old-access'),
    refreshToken: ownerToken('fabricated-old-refresh'),
  });
  store.failNextSet('accessToken');
  let suppliedRefreshToken;
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    transport: async (_clientId, refreshToken) => {
      suppliedRefreshToken = refreshToken;
      return makeGrant('fabricated-new-access', 'fabricated-new-refresh');
    },
  });

  await assert.rejects(manager.getAccessToken(), (error) => {
    assert.ok(error instanceof SecretStoreError);
    assert.equal(error.code, 'access_denied');
    return true;
  });
  assert.equal(suppliedRefreshToken, ownerToken('fabricated-old-refresh'));
  assert.equal(store.values.get('refreshToken'), ownerToken('fabricated-new-refresh'));
  assert.equal(store.values.get('accessToken'), ownerToken('fabricated-old-access'));
  assert.deepEqual(store.operations.slice(-2), ['set:refreshToken', 'set:accessToken']);
});

test('a restart has no trusted expiry and refreshes before returning stored access', async () => {
  const store = createStore({
    accessToken: ownerToken('possibly-stale'),
    refreshToken: ownerToken('fabricated-refresh'),
  });
  let transportCalls = 0;
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    now: () => 3_000_000,
    transport: async () => {
      transportCalls += 1;
      return makeGrant('fresh-after-restart', 'rotated-after-restart');
    },
  });

  assert.equal(await manager.getAccessToken(), ownerToken('fresh-after-restart'));
  assert.equal(transportCalls, 1);
});

test('a partial replacement invalidates any previously cached expiry', async () => {
  const store = createStore();
  let calls = 0;
  const manager = createManager({
    store,
    clientId: 'fabricated-client',
    now: () => 1_000_000,
    transport: async () => {
      calls += 1;
      return makeGrant('recovered-access', 'recovered-refresh');
    },
  });
  await manager.acceptGrant(makeGrant('old-access', 'old-refresh'));
  store.failNextSet('accessToken');
  await assert.rejects(manager.acceptGrant(makeGrant('new-access', 'new-refresh')));
  assert.equal(await manager.getAccessToken(), ownerToken('recovered-access'));
  assert.equal(calls, 1);
});

test('initial and refreshed grants must match the configured owner before persistence', async () => {
  const initialStore = createStore();
  const initialManager = createManager({
    store: initialStore,
    clientId: 'fabricated-client',
    transport: async () => makeGrant('unused', 'unused'),
  });
  await assert.rejects(
    initialManager.acceptGrant(
      makeGrant(ownerToken('initial-access'), `${OWNER_ID + 1}.initial-refresh`),
    ),
    { name: 'TokenManagerError', code: 'invalid_identity' },
  );
  assert.deepEqual(initialStore.operations, []);

  const refreshToken = ownerToken('current-refresh');
  const refreshStore = createStore({ refreshToken });
  const refreshManager = createManager({
    store: refreshStore,
    clientId: 'fabricated-client',
    transport: async () => makeGrant(ownerToken('new-access'), `${OWNER_ID + 1}.new-refresh`),
  });
  await assert.rejects(refreshManager.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_identity',
  });
  assert.equal(refreshStore.values.get('refreshToken'), refreshToken);
  assert.deepEqual(refreshStore.operations, ['get:refreshToken']);
});

test('stored refresh and cached access tokens must match the configured owner', async () => {
  let transportCalls = 0;
  const invalidRefreshStore = createStore({ refreshToken: `${OWNER_ID + 1}.wrong-owner-refresh` });
  const invalidRefreshManager = createManager({
    store: invalidRefreshStore,
    clientId: 'fabricated-client',
    transport: async () => {
      transportCalls += 1;
      return makeGrant('unused', 'unused');
    },
  });
  await assert.rejects(invalidRefreshManager.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_identity',
  });
  assert.equal(transportCalls, 0);

  const cachedStore = createStore();
  const cachedManager = createManager({
    store: cachedStore,
    clientId: 'fabricated-client',
    now: () => 4_000_000,
    transport: async () => makeGrant('unused', 'unused'),
  });
  await cachedManager.acceptGrant(makeGrant('valid-access', 'valid-refresh'));
  cachedStore.values.set('accessToken', `${OWNER_ID + 1}.wrong-owner-access`);
  await assert.rejects(cachedManager.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_identity',
  });
  cachedStore.values.set('accessToken', '');
  await assert.rejects(cachedManager.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_identity',
  });
});

test('shared store managers deduplicate refreshes and reject conflicting settings', async () => {
  const store = createStore({ refreshToken: ownerToken('shared-refresh') });
  const clock = () => 5_000_000;
  let resolveGrant;
  let announceTransport;
  let calls = 0;
  const started = new Promise((resolve) => {
    announceTransport = resolve;
  });
  const result = new Promise((resolve) => {
    resolveGrant = resolve;
  });
  const transport = async () => {
    calls += 1;
    announceTransport();
    return result;
  };
  const options = { store, clientId: 'fabricated-client', now: clock, transport };
  const firstManager = createManager(options);
  const secondManager = createManager(options);

  const first = firstManager.getAccessToken();
  await started;
  const second = secondManager.getAccessToken();
  assert.equal(calls, 1);
  await assert.rejects(secondManager.acceptGrant(makeGrant('concurrent', 'concurrent-refresh')), {
    name: 'TokenManagerError',
    code: 'invalid_grant',
  });
  resolveGrant(makeGrant('shared-access', 'shared-next-refresh'));
  assert.deepEqual(await Promise.all([first, second]), [
    ownerToken('shared-access'),
    ownerToken('shared-access'),
  ]);

  assert.throws(() => createManager({ ...options, clientId: 'different-client' }), {
    name: 'TokenManagerError',
    code: 'invalid_configuration',
  });
  assert.throws(() => createManager({ ...options, expectedOwnerId: OWNER_ID + 1 }), {
    name: 'TokenManagerError',
    code: 'invalid_configuration',
  });
  assert.throws(
    () => createManager({ ...options, transport: async () => makeGrant('other', 'other') }),
    { name: 'TokenManagerError', code: 'invalid_configuration' },
  );
});

test('grant acceptance blocks another manager from refreshing during a partial write', async () => {
  const baseStore = createStore();
  let announceWrite;
  let releaseWrite;
  const writeStarted = new Promise((resolve) => {
    announceWrite = resolve;
  });
  const writeGate = new Promise((resolve) => {
    releaseWrite = resolve;
  });
  const store = {
    ...baseStore,
    async set(key, value) {
      if (key === 'refreshToken') {
        announceWrite();
        await writeGate;
      }
      return baseStore.set(key, value);
    },
  };
  let transportCalls = 0;
  const now = () => 6_000_000;
  const transport = async () => {
    transportCalls += 1;
    return makeGrant('unused', 'unused');
  };
  const options = { store, clientId: 'fabricated-client', now, transport };
  const acceptingManager = createManager(options);
  const readingManager = createManager(options);
  const accepting = acceptingManager.acceptGrant(makeGrant('accepted', 'accepted-refresh'));
  await writeStarted;

  await assert.rejects(readingManager.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_grant',
  });
  assert.equal(transportCalls, 0);
  releaseWrite();
  await accepting;
});

test('missing refresh token, unexpected scope, and invalid expiry fail closed', async () => {
  const disconnected = createManager({
    store: createStore(),
    clientId: 'fabricated-client',
    transport: async () => makeGrant('unused', 'unused'),
  });
  await assert.rejects(disconnected.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'not_connected',
  });

  const store = createStore({ refreshToken: ownerToken('fabricated-refresh') });
  const broadScope = createManager({
    store,
    clientId: 'fabricated-client',
    transport: async () =>
      makeGrant('broad-access', 'broad-refresh', 3600, ['listings_r', 'listings_w']),
  });
  await assert.rejects(broadScope.getAccessToken(), {
    name: 'TokenManagerError',
    code: 'invalid_scope',
  });
  assert.equal(store.values.has('accessToken'), false);
  assert.equal(store.values.get('refreshToken'), ownerToken('fabricated-refresh'));

  await assert.rejects(broadScope.acceptGrant(makeGrant('invalid', 'invalid', 0)), {
    name: 'TokenManagerError',
    code: 'invalid_expiry',
  });
});
