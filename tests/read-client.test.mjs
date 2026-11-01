import assert from 'node:assert/strict';
import test from 'node:test';
import { URL } from 'node:url';
import { EtsyReadClient, EtsyReadError } from '../dist/src/etsy/read-client.js';

const OWNER_ID = 71001;
const SHOP_ID = 82002;
const LISTING_ID = 93003;

function shop(shopId = SHOP_ID, userId = OWNER_ID) {
  return { shop_id: shopId, user_id: userId, shop_name: 'fabricated-shop-name' };
}

function listing(overrides = {}) {
  const listingId = overrides.listing_id ?? LISTING_ID;
  return {
    listing_id: listingId,
    shop_id: SHOP_ID,
    user_id: OWNER_ID,
    title: 'Fabricated title',
    description: 'Fabricated description',
    tags: ['fabricated-tag'],
    taxonomy_id: 123,
    price: { amount: 1999, divisor: 100, currency_code: 'USD' },
    quantity: 4,
    state: 'active',
    url: `https://www.etsy.com/listing/${listingId}/fabricated?tracking=discard#fragment`,
    private_data: 'must-not-be-returned',
    ...overrides,
  };
}

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

function createClient(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (next === undefined) throw new Error('No mocked response available');
    return next;
  };
  return {
    calls,
    client: new EtsyReadClient({
      fetch,
      expectedShopId: SHOP_ID,
      ownerId: OWNER_ID,
      grant: { accessToken: `${OWNER_ID}.fabricated-access-token`, scopes: ['listings_r'] },
      apiKeystring: 'fabricated-keystring',
      apiSharedSecret: 'fabricated-shared-secret',
    }),
  };
}

test('shop verification parses the single shop response and validates ownership', async () => {
  const { client, calls } = createClient([response(shop())]);

  assert.deepEqual(await client.verifyConfiguredShop(), { shopId: SHOP_ID, ownerId: OWNER_ID });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url.href,
    `https://openapi.etsy.com/v3/application/users/${OWNER_ID}/shops`,
  );
  assert.equal(calls[0].init.method, 'GET');
});

test('owner or configured-shop mismatches fail before any listing request', async () => {
  for (const payload of [shop(SHOP_ID, OWNER_ID + 1), shop(SHOP_ID + 1, OWNER_ID)]) {
    const { client, calls } = createClient([response(payload)]);
    await assert.rejects(client.listActiveListings(), { code: 'identity_mismatch' });
    assert.equal(calls.length, 1);
  }
});

test('active listing pages are bounded and request only the fixed shop endpoint', async () => {
  const first = listing({ listing_id: LISTING_ID });
  const second = listing({ listing_id: LISTING_ID + 1 });
  const { client, calls } = createClient([
    response(shop()),
    response({ count: 2, results: [first] }),
    response({ count: 2, results: [second] }),
  ]);

  const result = await client.listActiveListings({ pageSize: 1, maxPages: 2 });

  assert.equal(result.listings.length, 2);
  assert.equal(result.nextOffset, null);
  assert.deepEqual(
    calls.map(({ url }) => url.pathname + url.search),
    [
      `/v3/application/users/${OWNER_ID}/shops`,
      `/v3/application/shops/${SHOP_ID}/listings?state=active&limit=1&offset=0`,
      `/v3/application/shops/${SHOP_ID}/listings?state=active&limit=1&offset=1`,
    ],
  );
  assert.ok(calls.every(({ init }) => init.method === 'GET' && init.redirect === 'error'));
});

test('pagination parameters are validated and capped', async () => {
  const { client, calls } = createClient([]);

  await assert.rejects(client.listActiveListings({ pageSize: 101 }), {
    name: 'EtsyReadError',
    code: 'invalid_input',
  });
  await assert.rejects(client.listActiveListings({ maxPages: 6 }), {
    name: 'EtsyReadError',
    code: 'invalid_input',
  });
  await assert.rejects(client.listActiveListings({ offset: -1 }), {
    name: 'EtsyReadError',
    code: 'invalid_input',
  });
  await assert.rejects(client.listActiveListings({ offset: Number.MAX_SAFE_INTEGER }), {
    name: 'EtsyReadError',
    code: 'invalid_input',
  });
  assert.equal(calls.length, 0);
});

test('bounded pagination resumes at the returned offset without losing listing rows', async () => {
  const makePage = (start, end) =>
    response({
      count: 550,
      results: Array.from({ length: end - start }, (_, index) =>
        listing({ listing_id: start + index + 1 }),
      ),
    });
  const responses = [response(shop())];
  for (let page = 0; page < 5; page += 1) {
    responses.push(makePage(page * 100, (page + 1) * 100));
  }
  responses.push(makePage(500, 550));
  const { client, calls } = createClient(responses);

  const firstBatch = await client.listActiveListings({ pageSize: 100, maxPages: 5 });
  assert.equal(firstBatch.listings.length, 500);
  assert.equal(firstBatch.nextOffset, 500);
  const nextBatch = await client.listActiveListings({ pageSize: 100, maxPages: 5, offset: 500 });
  assert.equal(nextBatch.listings.length, 50);
  assert.equal(nextBatch.nextOffset, null);
  assert.deepEqual(
    [...firstBatch.listings, ...nextBatch.listings].map(({ listingId }) => listingId),
    Array.from({ length: 550 }, (_, index) => index + 1),
  );
  assert.ok(calls.some(({ url }) => url.searchParams.get('offset') === '500'));
});

test('only a listing ID previously returned from the configured shop can be fetched', async () => {
  const { client, calls } = createClient([response(shop())]);

  await assert.rejects(client.getListing(LISTING_ID), {
    name: 'EtsyReadError',
    code: 'listing_not_owned',
  });
  assert.equal(calls.length, 1);
});

test('OAuth token owner prefix must match configured owner before any request', () => {
  let requests = 0;
  const fetch = async () => {
    requests += 1;
    return response(shop());
  };

  assert.throws(
    () =>
      new EtsyReadClient({
        fetch,
        expectedShopId: SHOP_ID,
        ownerId: OWNER_ID,
        grant: { accessToken: `${OWNER_ID + 1}.fabricated-token`, scopes: ['listings_r'] },
        apiKeystring: 'fabricated-keystring',
        apiSharedSecret: 'fabricated-shared-secret',
      }),
    { name: 'EtsyReadError', code: 'identity_mismatch' },
  );
  assert.equal(requests, 0);
  assert.throws(
    () =>
      new EtsyReadClient({
        fetch,
        expectedShopId: SHOP_ID,
        ownerId: OWNER_ID,
        grant: { accessToken: 'malformed-fabricated-token', scopes: ['listings_r'] },
        apiKeystring: 'fabricated-keystring',
        apiSharedSecret: 'fabricated-shared-secret',
      }),
    { name: 'EtsyReadError', code: 'invalid_configuration' },
  );
});

test('detail output is allowlisted and returned listing identity is rechecked', async () => {
  const { client, calls } = createClient([
    response(shop()),
    response({ count: 1, results: [listing()] }),
    response(listing({ private_data: 'secret seller data' })),
  ]);
  await client.listActiveListings();

  const result = await client.getListing(LISTING_ID);

  assert.deepEqual(Object.keys(result).sort(), [
    'categoryId',
    'description',
    'listingId',
    'price',
    'quantity',
    'shopId',
    'state',
    'tags',
    'title',
    'url',
  ]);
  assert.equal('private_data' in result, false);
  assert.equal(result.url, `https://www.etsy.com/listing/${LISTING_ID}/fabricated`);
  assert.equal(calls.at(-1).url.pathname, `/v3/application/listings/${LISTING_ID}`);
  assert.equal(calls[0].init.headers.authorization, `Bearer ${OWNER_ID}.fabricated-access-token`);
  assert.equal(calls[0].init.headers['x-api-key'], 'fabricated-keystring:fabricated-shared-secret');
});

test('shop and owner IDs are checked on list and detail responses', async () => {
  const wrongShop = listing({ shop_id: SHOP_ID + 1 });
  const { client, calls } = createClient([
    response(shop()),
    response({ count: 1, results: [wrongShop] }),
  ]);

  await assert.rejects(client.listActiveListings(), { code: 'identity_mismatch' });
  assert.equal(calls.length, 2);

  const mismatchedDetail = listing({ shop_id: SHOP_ID + 1 });
  const detailCase = createClient([
    response(shop()),
    response({ count: 1, results: [listing()] }),
    response(mismatchedDetail),
  ]);
  await detailCase.client.listActiveListings();
  await assert.rejects(detailCase.client.getListing(LISTING_ID), { code: 'identity_mismatch' });
  assert.equal(detailCase.calls.length, 3);
});

test('detail response must be the requested listing ID', async () => {
  const { client, calls } = createClient([
    response(shop()),
    response({ count: 1, results: [listing()] }),
    response(listing({ listing_id: LISTING_ID + 1 })),
  ]);
  await client.listActiveListings();

  await assert.rejects(client.getListing(LISTING_ID), { code: 'identity_mismatch' });
  assert.equal(calls.length, 3);
});

test('failed shop re-verification clears the previously verified state', async () => {
  const { client, calls } = createClient([
    response(shop()),
    response(shop(SHOP_ID + 1)),
    response(shop(SHOP_ID + 2)),
  ]);
  await client.verifyConfiguredShop();
  await assert.rejects(client.verifyConfiguredShop(), { code: 'identity_mismatch' });

  await assert.rejects(client.listActiveListings(), { code: 'identity_mismatch' });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ url }) => url.pathname.endsWith(`/users/${OWNER_ID}/shops`)));
});

test('listing output rejects external or malformed URLs', async () => {
  const { client } = createClient([
    response(shop()),
    response({ count: 1, results: [listing({ url: 'https://attacker.invalid/listing/1' })] }),
  ]);

  await assert.rejects(client.listActiveListings(), { code: 'invalid_response' });
});

test('listing URLs must identify the returned listing ID', async () => {
  const { client } = createClient([
    response(shop()),
    response({
      count: 1,
      results: [listing({ url: `https://www.etsy.com/listing/${LISTING_ID + 1}/other` })],
    }),
  ]);

  await assert.rejects(client.listActiveListings(), { code: 'invalid_response' });
});

test('invalid scope grants and unsafe configuration are rejected', () => {
  const fetch = async () => response({});
  assert.throws(
    () =>
      new EtsyReadClient({
        fetch,
        expectedShopId: SHOP_ID,
        ownerId: OWNER_ID,
        grant: { accessToken: `${OWNER_ID}.fabricated-token`, scopes: ['listings_r', 'shops_r'] },
        apiKeystring: 'fabricated-key',
        apiSharedSecret: 'fabricated-secret',
      }),
    { name: 'EtsyReadError', code: 'invalid_configuration' },
  );
});

test('network and HTTP failures are sanitized and never expose response content', async () => {
  const { client: networkClient } = createClient([
    new Error('fabricated secret leaked by transport'),
  ]);
  await assert.rejects(networkClient.verifyConfiguredShop(), (error) => {
    assert.ok(error instanceof EtsyReadError);
    assert.equal(error.code, 'request_failed');
    assert.equal(error.message.includes('fabricated secret'), false);
    return true;
  });

  const { client: httpClient } = createClient([
    response({ error: 'fabricated private detail' }, 403),
  ]);
  await assert.rejects(httpClient.verifyConfiguredShop(), (error) => {
    assert.equal(error.code, 'access_denied');
    assert.equal(error.message.includes('fabricated private'), false);
    return true;
  });
});

for (const [status, code] of [
  [401, 'authorization_rejected'],
  [403, 'access_denied'],
  [404, 'not_found'],
  [408, 'request_timeout'],
  [429, 'rate_limited'],
  [500, 'service_unavailable'],
  [503, 'service_unavailable'],
  [599, 'service_unavailable'],
  [400, 'request_failed'],
]) {
  test(`HTTP ${status} is typed, sanitized, and not retried`, async () => {
    let bodyReads = 0;
    const failed = {
      ok: false,
      status,
      statusText: 'fabricated-private-status',
      json: async () => {
        bodyReads++;
        throw new Error('fabricated-private-body');
      },
    };
    for (const location of ['identity', 'list', 'detail']) {
      const responses =
        location === 'identity'
          ? [failed]
          : location === 'list'
            ? [response(shop()), failed]
            : [response(shop()), response({ count: 1, results: [listing()] }), failed];
      const { client, calls } = createClient(responses);
      if (location === 'detail') await client.listActiveListings();
      const operation =
        location === 'identity'
          ? client.verifyConfiguredShop()
          : location === 'list'
            ? client.listActiveListings()
            : client.getListing(LISTING_ID);
      await assert.rejects(operation, (error) => {
        assert.ok(error instanceof EtsyReadError);
        assert.equal(error.code, code);
        assert.equal(error.message.includes('fabricated-private'), false);
        return true;
      });
      assert.equal(calls.length, location === 'identity' ? 1 : location === 'list' ? 2 : 3);
    }
    assert.equal(bodyReads, 0);
  });
}

for (const name of ['TimeoutError', 'AbortError']) {
  test(`transport ${name} is sanitized without retry`, async () => {
    const { client, calls } = createClient([
      Object.assign(new Error('fabricated-private'), { name }),
    ]);
    await assert.rejects(client.verifyConfiguredShop(), { code: 'request_timeout' });
    assert.equal(calls.length, 1);
  });
}
