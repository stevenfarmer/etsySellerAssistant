import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCoordinatedAccessToken } from '../../dist/src/auth/coordinated-token-manager.js';
import { createLocalConfigStore } from '../../dist/src/local/config.js';
import { connectLocal } from '../../dist/src/local/connect.js';
import { resetLocalSetup } from '../../dist/src/local/reset.js';
import {
  acquireRefreshLock,
  createRefreshStateStore,
  withRefreshLease,
} from '../../dist/src/local/refresh-lock.js';
import { SECRET_KEYS } from '../../dist/src/secret-store.js';

/** Test harness only. Caller supplies an isolated fabricated store; no production defaults. */
export async function runRecoveryDrill(store) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'etsy-recovery-drill-'));
  const config = createLocalConfigStore({ directory });
  const stages = [];
  let primary;
  let failed = false;
  const seed = async () => {
    for (const key of SECRET_KEYS)
      await store.set(
        key,
        key === 'accessToken'
          ? '123.fabricated-access'
          : key === 'refreshToken'
            ? '123.fabricated-refresh'
            : 'fabricated-app-value',
      );
    await config.write(456);
  };
  const reset = async (confirmation, secretStore = store) => {
    const lease = await acquireRefreshLock({ directory });
    return withRefreshLease(lease, async () =>
      resetLocalSetup({
        confirmation,
        secretStore,
        deleteConfig: () => config.delete(),
        clearTokenState: () => createRefreshStateStore({ directory }).clear(lease),
      }),
    );
  };
  try {
    await seed();
    let refreshes = 0;
    const options = {
      directory,
      store,
      ownerId: 123,
      refresh: async () => {
        refreshes++;
        throw new Error('fabricated transport failure');
      },
    };
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'recovery_required' });
    await assert.rejects(getCoordinatedAccessToken(options), { code: 'recovery_required' });
    assert.equal(refreshes, 1);
    assert.equal(
      JSON.parse(await fs.readFile(join(directory, 'token-state.json'), 'utf8')).status,
      'refreshing',
    );
    stages.push('uncertain refresh blocks retries');

    assert.equal(await reset('cancel'), 'cancelled');
    assert.equal(await store.get('refreshToken'), '123.fabricated-refresh');
    assert.deepEqual(await config.read(), { expectedShopId: 456 });
    stages.push('cancelled reset preserves setup');

    assert.equal(
      await reset('RESET', {
        delete: async (key) => {
          if (key === 'refreshToken') throw new Error('fabricated deletion denial');
          return store.delete(key);
        },
      }),
      'failed',
    );
    assert.deepEqual(await config.read(), { expectedShopId: 456 });
    assert.equal(
      JSON.parse(await fs.readFile(join(directory, 'token-state.json'), 'utf8')).status,
      'refreshing',
    );
    assert.equal(await store.get('accessToken'), undefined);
    assert.equal(await store.get('refreshToken'), '123.fabricated-refresh');
    stages.push('reset failure preserves recovery state');

    assert.equal(await reset('RESET'), 'reset');
    for (const key of SECRET_KEYS) assert.equal(await store.get(key), undefined);
    assert.equal(await config.read(), undefined);
    const stateLease = await acquireRefreshLock({ directory });
    await withRefreshLease(stateLease, async () =>
      assert.equal(await createRefreshStateStore({ directory }).read(stateLease), undefined),
    );
    stages.push('deliberate reset verifies deletion');

    const lock = join(directory, 'refresh.lock');
    await fs.mkdir(lock);
    await fs.writeFile(join(lock, 'owner.json'), '{partial');
    await assert.rejects(acquireRefreshLock({ directory, waitTimeoutMs: 5, retryIntervalMs: 1 }), {
      code: 'recovery_required',
    });
    assert.equal(await fs.readFile(join(lock, 'owner.json'), 'utf8'), '{partial');
    // This directory belongs only to this single-process fabricated drill.
    await fs.rm(lock, { recursive: true });
    stages.push('incomplete lock preserved until explicit fixture cleanup');

    const releaseLease = await acquireRefreshLock({
      directory,
      fileSystem: {
        ...fs,
        rm: async () => {
          throw new Error('fabricated tombstone cleanup failure');
        },
      },
    });
    await assert.rejects(
      withRefreshLease(releaseLease, async () => 'done'),
      { code: 'io_failed' },
    );
    await assert.rejects(releaseLease.assertOwned(), { code: 'ownership_lost' });
    const next = await acquireRefreshLock({ directory });
    await next.release();
    stages.push('cleanup-only failure reported and new ownership possible');

    const dualLease = await acquireRefreshLock({ directory });
    const failure = new Error('fabricated primary failure');
    await assert.rejects(
      withRefreshLease(dualLease, async () => {
        await fs.writeFile(join(lock, 'owner.json'), '{partial');
        throw failure;
      }),
      (error) => error === failure,
    );
    await fs.rm(lock, { recursive: true });
    stages.push('primary failure survives release failure');

    await config.write(456);
    await store.set('appKeystring', 'fabricated-app-key');
    await store.set('appSharedSecret', 'fabricated-app-secret');
    let closed = false;
    const calls = [];
    const lease = await acquireRefreshLock({ directory });
    const connected = await withRefreshLease(lease, async () =>
      connectLocal({
        configStore: config,
        secretStore: store,
        receiverFactory: async () => ({
          browserStartUrl: 'http://localhost:3003/oauth/start',
          result: Promise.resolve({ kind: 'authorized', code: 'fabricated-code' }),
          close: async () => {
            closed = true;
          },
        }),
        openBrowser: async () => {},
        tokenFetch: async (url, init) => {
          assert.equal(url, 'https://api.etsy.com/v3/public/oauth/token');
          assert.equal(init.method, 'POST');
          calls.push('mock exchange');
          return globalThis.Response.json({
            access_token: '123.fabricated-new',
            refresh_token: '123.fabricated-rotated',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'listings_r',
          });
        },
        shopFetch: async (url, init) => {
          assert.equal(url, 'https://openapi.etsy.com/v3/application/users/123/shops');
          assert.equal(init.method, 'GET');
          calls.push('mock identity');
          return globalThis.Response.json({ shop_id: 456, user_id: 123 });
        },
      }),
    );
    assert.deepEqual(connected, { status: 'connected' });
    assert.deepEqual(calls, ['mock exchange', 'mock identity']);
    assert.equal(closed, true);
    assert.equal(await store.get('accessToken'), '123.fabricated-new');
    assert.equal(await store.get('refreshToken'), '123.fabricated-rotated');
    stages.push('mock reconnect verifies identity and persists fabricated tokens');
  } catch (error) {
    failed = true;
    primary = error;
  }
  // Attempt every cleanup even if an earlier deletion fails. Never report success on cleanup failure.
  let cleanupFailed = false;
  for (const key of SECRET_KEYS) {
    try {
      await store.delete(key);
      assert.equal(await store.get(key), undefined);
    } catch {
      cleanupFailed = true;
    }
  }
  try {
    await fs.rm(directory, { recursive: true, force: true });
    await assert.rejects(fs.stat(directory), { code: 'ENOENT' });
  } catch {
    cleanupFailed = true;
  }
  if (cleanupFailed) throw new Error('Recovery drill cleanup failed.');
  if (failed) throw primary;
  return { stages, cleanup: 'verified' };
}
