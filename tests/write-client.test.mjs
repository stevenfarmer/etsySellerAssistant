import assert from 'node:assert/strict';
import test from 'node:test';
import { EDIT_SCOPES } from '../dist/src/auth/oauth.js';
import { EtsyWriteClient } from '../dist/src/etsy/write-client.js';

const OWNER_ID = 71001;
const SHOP_ID = 82002;
const LISTING_ID = 93003;

function createClient(fetch) {
  return new EtsyWriteClient({
    fetch,
    expectedShopId: SHOP_ID,
    ownerId: OWNER_ID,
    accessToken: `${OWNER_ID}.fabricated-edit-token`,
    scopes: EDIT_SCOPES,
    apiKeystring: 'fabricated-client',
    apiSharedSecret: 'fabricated-secret',
  });
}

test('sends one fixed form-encoded PATCH containing only approved fields', async () => {
  const requests = [];
  const client = createClient(async (url, init) => {
    requests.push({ url, init });
    return new globalThis.Response(null, { status: 200 });
  });

  await client.updateListing(LISTING_ID, {
    title: 'Fabricated title ™',
    description: 'Fabricated description\nsecond line',
    tags: ['blue beads', 'UV reactive', 'bracelet'],
  });

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
  );
  assert.equal(requests[0].init.method, 'PATCH');
  assert.equal(requests[0].init.redirect, 'error');
  assert.equal(requests[0].init.headers['x-api-key'], 'fabricated-client:fabricated-secret');
  assert.equal(requests[0].init.headers.authorization, `Bearer ${OWNER_ID}.fabricated-edit-token`);
  assert.equal(requests[0].init.headers['content-type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(
    [...requests[0].init.body.entries()],
    [
      ['title', 'Fabricated title ™'],
      ['description', 'Fabricated description\nsecond line'],
      ['tags', 'blue beads,UV reactive,bracelet'],
    ],
  );
  assert.equal(requests[0].init.body.has('state'), false);
});

test('omits every untouched field and rejects arbitrary fields before transport', async () => {
  let calls = 0;
  const client = createClient(async (_url, init) => {
    calls += 1;
    assert.deepEqual([...init.body.entries()], [['description', 'New copy']]);
    return new globalThis.Response(null, { status: 200 });
  });

  await client.updateListing(LISTING_ID, { description: 'New copy' });
  await assert.rejects(client.updateListing(LISTING_ID, { state: 'active' }), {
    name: 'EtsyWriteError',
    code: 'invalid_input',
    mayHaveApplied: false,
  });
  await assert.rejects(client.updateListing(LISTING_ID, {}), {
    name: 'EtsyWriteError',
    code: 'invalid_input',
  });
  assert.equal(calls, 1);
});

test('rejects missing or broadened write grants during client construction', () => {
  const fetch = async () => new globalThis.Response(null, { status: 200 });
  assert.throws(
    () =>
      new EtsyWriteClient({
        fetch,
        expectedShopId: SHOP_ID,
        ownerId: OWNER_ID,
        accessToken: `${OWNER_ID}.fabricated-token`,
        scopes: ['listings_r'],
        apiKeystring: 'fabricated-client',
        apiSharedSecret: 'fabricated-secret',
      }),
    { code: 'invalid_configuration' },
  );
  assert.throws(
    () =>
      new EtsyWriteClient({
        fetch,
        expectedShopId: SHOP_ID,
        ownerId: OWNER_ID,
        accessToken: `${OWNER_ID}.fabricated-token`,
        scopes: [...EDIT_SCOPES, 'shops_w'],
        apiKeystring: 'fabricated-client',
        apiSharedSecret: 'fabricated-secret',
      }),
    { code: 'invalid_configuration' },
  );
});

test('sanitizes rejection and does not retry or expose an error body', async () => {
  let calls = 0;
  const client = createClient(async () => {
    calls += 1;
    return new globalThis.Response('fabricated sensitive Etsy body', { status: 403 });
  });

  await assert.rejects(client.updateListing(LISTING_ID, { title: 'New title' }), (error) => {
    assert.equal(error.code, 'rejected');
    assert.equal(error.mayHaveApplied, false);
    assert.equal(error.message.includes('fabricated sensitive'), false);
    return true;
  });
  assert.equal(calls, 1);
});

test('classifies lost responses and server failures as possibly applied without retry', async () => {
  for (const fetch of [
    async () => {
      const error = new Error('fabricated transport secret');
      error.name = 'TimeoutError';
      throw error;
    },
    async () => new globalThis.Response('fabricated server body', { status: 503 }),
  ]) {
    let calls = 0;
    const client = createClient(async (...args) => {
      calls += 1;
      return fetch(...args);
    });
    await assert.rejects(client.updateListing(LISTING_ID, { title: 'New title' }), (error) => {
      assert.equal(error.mayHaveApplied, true);
      assert.equal(error.message.includes('fabricated'), false);
      return true;
    });
    assert.equal(calls, 1);
  }
});
