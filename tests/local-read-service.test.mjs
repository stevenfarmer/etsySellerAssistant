import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createLocalReadService } from '../dist/src/etsy/local-read-service.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

test('local read refreshes once under the lock, verifies the shop, and makes only fixed reads', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'etsy-alpha-offline-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new InMemorySecretStore();
  for (const [key, value] of Object.entries({
    appKeystring: 'fake-key',
    appSharedSecret: 'fake-secret',
    accessToken: '2222.old',
    refreshToken: '2222.old-refresh',
  }))
    await store.set(key, value);
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, method: init.method });
    if (url === 'https://api.etsy.com/v3/public/oauth/token')
      return globalThis.Response.json({
        access_token: '2222.new',
        refresh_token: '2222.new-refresh',
        expires_in: 3600,
        scope: 'listings_r',
        token_type: 'Bearer',
      });
    if (url.endsWith('/users/2222/shops'))
      return globalThis.Response.json({ shop_id: 1111, user_id: 2222 });
    if (url.includes('/shops/1111/listings?'))
      return globalThis.Response.json({ count: 0, results: [] });
    throw new Error('unexpected request');
  };
  const config = {
    async read() {
      return { expectedShopId: 1111 };
    },
  };
  const service = createLocalReadService(fetch, { directory, store, config });
  assert.deepEqual(await service.listActiveListings({}), { listings: [], nextOffset: null });
  assert.deepEqual(
    calls.map(({ method }) => method),
    ['POST', 'GET', 'GET'],
  );
  assert.equal(await store.get('refreshToken'), '2222.new-refresh');
  assert.deepEqual(await service.listActiveListings({}), { listings: [], nextOffset: null });
  assert.deepEqual(
    calls.map(({ method }) => method),
    ['POST', 'GET', 'GET', 'GET', 'GET'],
  );
});
