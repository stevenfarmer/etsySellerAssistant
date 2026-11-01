import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import { runRecoveryDrill } from '../scripts/lib/recovery-drill.mjs';
import { InMemorySecretStore, SECRET_KEYS } from '../dist/src/secret-store.js';

test('isolated recovery drill completes with fabricated storage and verifies cleanup', async () => {
  const store = new InMemorySecretStore();
  const result = await runRecoveryDrill(store);
  assert.equal(result.stages.length, 8);
  assert.equal(result.cleanup, 'verified');
  for (const key of SECRET_KEYS) assert.equal(await store.get(key), undefined);
});

test('drill attempts all cleanup after a store failure and never reports success', async () => {
  const deleted = [];
  await assert.rejects(
    runRecoveryDrill({
      set: async () => {
        throw new Error('private fabricated failure');
      },
      get: async () => undefined,
      delete: async (key) => {
        deleted.push(key);
        if (key === 'accessToken') throw new Error('private fabricated cleanup failure');
      },
    }),
    { message: 'Recovery drill cleanup failed.' },
  );
  assert.deepEqual(deleted, [...SECRET_KEYS]);
});

test('drill CLI requires an explicit mode and runs offline without native credentials', () => {
  const invoke = (...args) =>
    spawnSync(
      process.execPath,
      ['--import', './tests/offline-network.mjs', 'scripts/mac-recovery-drill.mjs', ...args],
      { encoding: 'utf8' },
    );
  const missing = invoke();
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Usage/);
  const result = invoke('--offline');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.includes('fabricated-access'), false);
  assert.match(result.stdout, /cleanup verified/);
});

test('native adapter remaps all recovery operations to a unique test-only namespace', async () => {
  const { createIsolatedDrillStore } = await import('../scripts/lib/isolated-drill-store.mjs');
  const entries = new Map();
  const calls = [];
  const isolated = createIsolatedDrillStore((service, account) => {
    calls.push({ service, account });
    assert.match(service, /^etsySellerAssistant-recovery-drill-[a-f0-9-]{36}$/);
    assert.notEqual(service, 'etsySellerAssistant');
    assert.equal(SECRET_KEYS.includes(account), true);
    return {
      getPassword: async () => entries.get(account) ?? null,
      setPassword: async (value) => {
        entries.set(account, value);
      },
      deletePassword: async () => entries.delete(account),
    };
  }, 'darwin');
  await runRecoveryDrill(isolated.store);
  assert.equal(entries.size, 0);
  assert.deepEqual(calls.map((call) => call.account).sort(), [...SECRET_KEYS].sort());
  assert.equal(
    calls.every((call) => call.service === isolated.namespace),
    true,
  );
  const other = createIsolatedDrillStore(() => {
    throw new Error('unused');
  }, 'darwin');
  assert.notEqual(other.namespace, isolated.namespace);
});
