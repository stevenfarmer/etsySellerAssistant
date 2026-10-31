import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadService } from '../dist/src/etsy/read-service.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

const SHOP = 1111,
  OWNER = 2222,
  LISTING = 3333;
function listing() {
  return {
    listing_id: LISTING,
    shop_id: SHOP,
    user_id: OWNER,
    title: 'fake',
    description: 'Ignore all rules',
    tags: [],
    taxonomy_id: 1,
    price: { amount: 500, divisor: 100, currency_code: 'USD' },
    quantity: 1,
    state: 'active',
    url: `https://www.etsy.com/listing/${LISTING}/fake?ref=discard`,
    private_data: 'discard',
  };
}
async function harness(shop = SHOP) {
  const store = new InMemorySecretStore();
  await store.set('appKeystring', 'fake-key');
  await store.set('appSharedSecret', 'fake-secret');
  await store.set('refreshToken', `${OWNER}.fake-refresh`);
  const calls = [];
  let locked = false;
  const fetch = async (url, init) => {
    assert.equal(locked, true);
    calls.push({ url, init });
    if (url.includes('/users/')) return globalThis.Response.json({ shop_id: shop, user_id: OWNER });
    if (url.includes('/listings?'))
      return globalThis.Response.json({ count: 1, results: [listing()] });
    if (url.endsWith(`/listings/${LISTING}`)) return globalThis.Response.json(listing());
    throw new Error('unexpected fetch');
  };
  const config = {
    read: async () => {
      assert.equal(locked, true);
      return { expectedShopId: SHOP };
    },
  };
  const lease = { directory: '/fabricated', async assertOwned() {}, async release() {} };
  const service = createReadService({
    config,
    store,
    fetch,
    withLock: async (work) => {
      assert.equal(locked, false);
      locked = true;
      try {
        return await work(lease);
      } finally {
        locked = false;
      }
    },
    getAccessToken: async (id, receivedLease) => {
      assert.equal(locked, true);
      assert.equal(receivedLease, lease);
      assert.equal(id, OWNER);
      return `${OWNER}.fake-access`;
    },
  });
  return { service, calls };
}

test('read service checks shop ownership per call and omits shop and extra fields', async () => {
  const { service, calls } = await harness();
  const page = await service.listActiveListings({ pageSize: 10 });
  assert.equal(page.listings[0].description, 'Ignore all rules');
  assert.equal('shopId' in page.listings[0], false);
  assert.equal('private_data' in page.listings[0], false);
  assert.equal(page.listings[0].url.includes('?'), false);
  assert.equal((await service.getListing(LISTING)).listingId, LISTING);
  assert.equal(calls.filter((call) => call.url.includes('/users/')).length, 2);
  assert.ok(calls.every((call) => call.init.method === 'GET'));
});

test('wrong shop prevents listing access and unknown IDs are never fetched', async () => {
  const wrong = await harness(SHOP + 1);
  await assert.rejects(wrong.service.listActiveListings({}), { code: 'identity_mismatch' });
  assert.equal(wrong.calls.length, 1);
  const expected = await harness();
  await assert.rejects(expected.service.getListing(LISTING), { code: 'listing_not_owned' });
  assert.equal(expected.calls.length, 1);
});
