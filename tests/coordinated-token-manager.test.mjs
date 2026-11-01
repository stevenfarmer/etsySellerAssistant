import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { getCoordinatedAccessToken } from '../dist/src/auth/coordinated-token-manager.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';
import { acquireRefreshLock } from '../dist/src/local/refresh-lock.js';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'etsy-offline-token-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new InMemorySecretStore();
  await store.set('accessToken', '123.old-access');
  await store.set('refreshToken', '123.old-refresh');
  return { directory, store };
}

test('concurrent requests share a persisted fresh token after a single refresh', async (t) => {
  const { directory, store } = await fixture(t);
  let calls = 0;
  const options = {
    directory,
    store,
    ownerId: 123,
    now: () => 1_000_000,
    refresh: async () => {
      calls += 1;
      return {
        accessToken: '123.new-access',
        refreshToken: '123.new-refresh',
        expiresIn: 3600,
        scope: ['listings_r'],
      };
    },
  };
  assert.deepEqual(
    await Promise.all([getCoordinatedAccessToken(options), getCoordinatedAccessToken(options)]),
    ['123.new-access', '123.new-access'],
  );
  assert.equal(calls, 1);
});

test('a caller-held lease remains held across token refresh', async (t) => {
  const { directory, store } = await fixture(t);
  const lease = await acquireRefreshLock({ directory });
  try {
    const token = await getCoordinatedAccessToken({
      directory,
      store,
      ownerId: 123,
      lease,
      refresh: async () => ({
        accessToken: '123.new',
        refreshToken: '123.rotated',
        expiresIn: 3600,
        scope: ['listings_r'],
      }),
    });
    assert.equal(token, '123.new');
    await lease.assertOwned();
  } finally {
    await lease.release();
  }
});

test('independent processes share refreshed credentials through the lock and state file', async (t) => {
  const { directory } = await fixture(t);
  const storePath = join(directory, 'fabricated-store.json');
  const callsPath = join(directory, 'fabricated-calls.txt');
  await writeFile(storePath, JSON.stringify({ accessToken: '123.old', refreshToken: '123.old' }));
  const moduleUrl = pathToFileURL(
    join(process.cwd(), 'dist/src/auth/coordinated-token-manager.js'),
  ).href;
  const script = `
    import { readFile, writeFile, appendFile } from 'node:fs/promises';
    import { getCoordinatedAccessToken } from ${JSON.stringify(moduleUrl)};
    const [directory, storePath, callsPath] = process.argv.slice(1);
    const store = {
      async get(key) { return JSON.parse(await readFile(storePath, 'utf8'))[key]; },
      async set(key, value) { const data = JSON.parse(await readFile(storePath, 'utf8')); data[key] = value; await writeFile(storePath, JSON.stringify(data)); },
      async delete() { throw new Error('unexpected delete'); },
    };
    const token = await getCoordinatedAccessToken({ directory, store, ownerId: 123, now: () => 1000000,
      refresh: async () => { await appendFile(callsPath, 'called\\n'); return { accessToken: '123.fresh', refreshToken: '123.rotated', expiresIn: 3600, scope: ['listings_r'] }; } });
    process.stdout.write(token);
  `;
  const child = () =>
    new Promise((resolve, reject) => {
      const processChild = spawn(
        process.execPath,
        [
          '--import',
          './tests/offline-network.mjs',
          '--input-type=module',
          '-e',
          script,
          directory,
          storePath,
          callsPath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let output = '';
      let errors = '';
      processChild.stdout.on('data', (chunk) => {
        output += chunk;
      });
      processChild.stderr.on('data', (chunk) => {
        errors += chunk;
      });
      processChild.on('error', reject);
      processChild.on('close', (code) =>
        code === 0 ? resolve(output) : reject(new Error(errors)),
      );
    });
  assert.deepEqual(await Promise.all([child(), child()]), ['123.fresh', '123.fresh']);
  assert.equal(await readFile(callsPath, 'utf8'), 'called\n');
});

test('uncertain refresh is not retried and does not expose transport errors', async (t) => {
  const { directory, store } = await fixture(t);
  let calls = 0;
  const options = {
    directory,
    store,
    ownerId: 123,
    refresh: async () => {
      calls += 1;
      throw new Error('private fake token');
    },
  };
  for (let i = 0; i < 2; i += 1) {
    await assert.rejects(getCoordinatedAccessToken(options), (error) => {
      assert.equal(error.code, 'recovery_required');
      assert.equal(error.message.includes('private fake token'), false);
      return true;
    });
  }
  assert.equal(calls, 1);
});

test('wrong-owner refresh response is not persisted', async (t) => {
  const { directory, store } = await fixture(t);
  const refresh = async () => ({
    accessToken: '456.bad',
    refreshToken: '456.bad',
    expiresIn: 3600,
    scope: ['listings_r'],
  });
  await assert.rejects(getCoordinatedAccessToken({ directory, store, ownerId: 123, refresh }), {
    code: 'invalid_state',
  });
  assert.equal(await store.get('refreshToken'), '123.old-refresh');
});

test('an incomplete initial token pair is never refreshed', async (t) => {
  const { directory, store } = await fixture(t);
  await store.delete('accessToken');
  let calls = 0;
  await assert.rejects(
    getCoordinatedAccessToken({
      directory,
      store,
      ownerId: 123,
      refresh: async () => {
        calls += 1;
        throw new Error('unexpected');
      },
    }),
    { code: 'invalid_state' },
  );
  assert.equal(calls, 0);
});

for (const failedKey of ['refreshToken', 'accessToken']) {
  test(`failed ${failedKey} persistence preserves uncertain state and prevents another refresh`, async (t) => {
    const { directory, store } = await fixture(t);
    let calls = 0;
    const options = {
      directory,
      ownerId: 123,
      store: {
        get: (key) => store.get(key),
        set: async (key, value) => {
          if (key === failedKey) throw new Error('fabricated private store failure');
          await store.set(key, value);
        },
      },
      refresh: async () => {
        calls += 1;
        return {
          accessToken: '123.new',
          refreshToken: '123.rotated',
          expiresIn: 3600,
          scope: ['listings_r'],
        };
      },
    };
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'io_failed' });
    const state = JSON.parse(await readFile(join(directory, 'token-state.json'), 'utf8'));
    assert.equal(state.status, 'refreshing');
    assert.equal(await store.get('accessToken'), '123.old-access');
    assert.equal(
      await store.get('refreshToken'),
      failedKey === 'refreshToken' ? '123.old-refresh' : '123.rotated',
    );
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'recovery_required' });
    assert.equal(calls, 1);
  });
}

for (const grant of [
  { accessToken: '456.bad', refreshToken: '456.bad', expiresIn: 3600, scope: ['listings_r'] },
  { accessToken: '123.new', refreshToken: '123.rotated', expiresIn: 0, scope: ['listings_r'] },
  { accessToken: '123.new', refreshToken: '123.rotated', expiresIn: 3600, scope: [] },
]) {
  test('invalid refresh grant preserves marker and never retries the old token', async (t) => {
    const { directory, store } = await fixture(t);
    let calls = 0;
    const options = {
      directory,
      store,
      ownerId: 123,
      refresh: async () => {
        calls++;
        return grant;
      },
    };
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'invalid_state' });
    assert.equal(
      JSON.parse(await readFile(join(directory, 'token-state.json'), 'utf8')).status,
      'refreshing',
    );
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'recovery_required' });
    assert.equal(calls, 1);
    assert.equal(await store.get('refreshToken'), '123.old-refresh');
    assert.equal(await store.get('accessToken'), '123.old-access');
  });
}

test('failed refresh remains recovery_required when release loses ownership', async (t) => {
  const { directory, store } = await fixture(t);
  await assert.rejects(
    getCoordinatedAccessToken({
      directory,
      store,
      ownerId: 123,
      refresh: async () => {
        await writeFile(join(directory, 'refresh.lock', 'owner.json'), '{partial');
        throw new Error('fabricated private transport error');
      },
    }),
    { code: 'recovery_required' },
  );
  assert.equal(
    JSON.parse(await readFile(join(directory, 'token-state.json'), 'utf8')).status,
    'refreshing',
  );
});

test('fresh token cannot report success when release loses ownership', async (t) => {
  const { directory, store } = await fixture(t);
  const { createRefreshStateStore } = await import('../dist/src/local/refresh-lock.js');
  const lease = await acquireRefreshLock({ directory });
  const state = createRefreshStateStore({ directory });
  await state.markRefreshing(lease);
  await state.markReady(lease, 4_600_000);
  await lease.release();
  await assert.rejects(
    getCoordinatedAccessToken({
      directory,
      ownerId: 123,
      now: () => 1_000_000,
      store: {
        get: async (key) => {
          if (key === 'accessToken')
            await writeFile(join(directory, 'refresh.lock', 'owner.json'), '{partial');
          return store.get(key);
        },
      },
      refresh: async () => {
        throw new Error('unexpected refresh');
      },
    }),
    { code: 'ownership_lost' },
  );
});
