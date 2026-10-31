import assert from 'node:assert/strict';
import test from 'node:test';
import { URL } from 'node:url';
import { lookupLocalShop, shopNameFromInput } from '../dist/src/local/lookup.js';

function harness(response, inputs = ['SampleShop', 'fakekey', 'fakesecret', 'LOOKUP']) {
  const values = [...inputs];
  const requests = [];
  return {
    requests,
    options: {
      async readHiddenInput() {
        return values.shift();
      },
      async fetch(url, init) {
        requests.push({ url, init });
        return globalThis.Response.json(response);
      },
    },
  };
}

test('returns the exact locally entered match and ignores other shop fields', async () => {
  const h = harness({
    count: 2,
    results: [
      { shop_id: 42, shop_name: 'SampleShop', announcement: 'discard me' },
      { shop_id: 77, shop_name: 'SampleShopExtra' },
    ],
  });
  assert.deepEqual(await lookupLocalShop(h.options), { status: 'found', shopId: 42 });
  assert.equal(h.requests.length, 1);
  assert.equal(new URL(h.requests[0].url).searchParams.get('shop_name'), 'SampleShop');
  assert.equal(h.requests[0].init.headers['x-api-key'], 'fakekey:fakesecret');
  assert.equal(h.requests[0].init.redirect, 'error');
});

test('accepts Etsy shop URL formats and transmits only the extracted name', async () => {
  for (const input of [
    'https://www.etsy.com/shop/SampleShop?ref=private-marker',
    'etsy.com/shop/SampleShop/',
    'https://sampleshop.etsy.com/',
    'SampleShop.etsy.com',
  ]) {
    const h = harness({ results: [{ shop_id: 42, shop_name: 'SampleShop' }] }, [
      input,
      'fakekey',
      'fakesecret',
      'LOOKUP',
    ]);
    assert.deepEqual(await lookupLocalShop(h.options), { status: 'found', shopId: 42 });
    assert.equal(
      new URL(h.requests[0].url).searchParams.get('shop_name').toLowerCase(),
      'sampleshop',
    );
    assert.equal(h.requests[0].url.includes('private-marker'), false);
  }
});

test('rejects unrelated hosts, credentials in URLs, and non-shop paths', () => {
  for (const input of [
    'https://etsy.com.evil.test/shop/SampleShop',
    'https://user:password@www.etsy.com/shop/SampleShop',
    'https://www.etsy.com/listing/12345',
    'https://www.etsy.com/shop/SampleShop/extra',
    'http://www.etsy.com/shop/SampleShop',
  ])
    assert.equal(shopNameFromInput(input), undefined);
});

test('cancellation and invalid names never make a request', async () => {
  for (const values of [
    ['SampleShop', 'fakekey', 'fakesecret', 'no'],
    ['bad name', 'fakekey', 'fakesecret', 'LOOKUP'],
  ]) {
    const h = harness({}, values);
    assert.equal((await lookupLocalShop(h.options)).status, 'failed');
    assert.equal(h.requests.length, 0);
  }
});

test('ambiguous and malformed results fail closed; network errors are sanitized', async () => {
  const h = harness({
    results: [
      { shop_id: 1, shop_name: 'SampleShop' },
      { shop_id: 2, shop_name: 'sampleshop' },
    ],
  });
  assert.deepEqual(await lookupLocalShop(h.options), {
    status: 'failed',
    reason: 'no_unique_match',
  });
  const failed = harness({});
  failed.options.fetch = async () => {
    throw new Error('sensitive fake details');
  };
  const result = await lookupLocalShop(failed.options);
  assert.deepEqual(result, { status: 'failed', reason: 'lookup_failed' });
  assert.equal(JSON.stringify(result).includes('sensitive'), false);
});
