import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import {
  formatAlphaSmokeResult,
  createStdioTransport,
  parseAlphaSmokeArgs,
  runAlphaSmoke,
} from '../scripts/alpha-smoke.mjs';

test('detail smoke accepts the actual MCP server response shape over STDIO', async () => {
  const source = `
    import { serveStdio } from '@modelcontextprotocol/server/stdio';
    import { createServer } from './dist/src/server.js';
    const listing = {listingId: 123, title: 'fake', description: 'fake', tags: [], categoryId: null, price: {amount: 100, divisor: 100, currencyCode: 'USD'}, quantity: 1, state: 'active', url: 'https://www.etsy.com/listing/123/fake'};
    await serveStdio(() => createServer({readService: { async listActiveListings() {return {listings: [listing], nextOffset: null};}, async getListing() {return listing;} }}));
  `;
  const fakeSpawn = () =>
    spawn(
      process.execPath,
      ['--import', './tests/offline-network.mjs', '--input-type=module', '-e', source],
      { stdio: ['pipe', 'pipe', 'ignore'] },
    );
  const result = await runAlphaSmoke({
    detail: true,
    transportFactory: () => createStdioTransport(fakeSpawn),
  });
  assert.deepEqual(result, { status: 'passed', listingCount: 1 });
});

const privateListingText = 'fabricated listing text with fabricated token and ID';

function fakeTransport({
  listingCount = 1,
  payloadText = privateListingText,
  failAt,
  wrongDetailId = false,
  detailExtraField = false,
  extraTools = [],
} = {}) {
  const calls = [];
  let closed = false;
  return {
    calls,
    get closed() {
      return closed;
    },
    factory: async () => ({
      async request(method, params, timeoutMs) {
        calls.push({ method, params, timeoutMs });
        if (failAt !== undefined && (method === failAt || params?.name === failAt))
          throw new Error(`private error: ${privateListingText}`);
        if (method === 'initialize') return { serverInfo: { name: 'fabricated-alpha' } };
        if (method === 'tools/list')
          return {
            tools: [
              ...extraTools,
              { name: 'get_setup_status' },
              {
                name: 'get_listing',
                annotations: { readOnlyHint: true, destructiveHint: false },
              },
              {
                name: 'list_active_listings',
                annotations: { readOnlyHint: true, destructiveHint: false },
              },
            ],
          };
        if (method === 'tools/call' && params.name === 'list_active_listings') {
          const listings = Array.from({ length: listingCount }, (_, index) => ({
            listingId: index + 1,
            title: payloadText,
          }));
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ listings, nextOffset: null }),
              },
            ],
          };
        }
        if (method === 'tools/call' && params.name === 'get_listing') {
          const detail = {
            listingId: wrongDetailId ? params.arguments.listingId + 1 : params.arguments.listingId,
            title: payloadText,
            description: payloadText,
            tags: ['fabricated-tag'],
            categoryId: null,
            price: { amount: 100, divisor: 1, currencyCode: 'USD' },
            quantity: 2,
            state: 'active',
            url: 'https://www.etsy.com/listing/fabricated',
          };
          if (detailExtraField) detail.shopId = 456;
          return {
            content: [{ type: 'text', text: JSON.stringify(detail) }],
          };
        }
        throw new Error('unexpected fake method');
      },
      notify(method) {
        calls.push({ method, notification: true });
      },
      async close() {
        closed = true;
      },
    }),
  };
}

test('runs initialize, inventory, and one-item read through injected transport only', async () => {
  const fake = fakeTransport();
  const result = await runAlphaSmoke({ transportFactory: fake.factory, timeoutMs: 1000 });

  assert.deepEqual(result, { status: 'passed', listingCount: 1 });
  assert.equal(fake.closed, true);
  const toolCall = fake.calls.find((call) => call.method === 'tools/call');
  assert.deepEqual(toolCall.params, {
    name: 'list_active_listings',
    arguments: { pageSize: 1, offset: 0 },
  });
  assert.ok(fake.calls.every((call) => call.timeoutMs === undefined || call.timeoutMs === 1000));
  assert.equal(JSON.stringify(result).includes(privateListingText), false);
  assert.equal(formatAlphaSmokeResult(result), 'Alpha smoke passed (listings: 1).\n');
});

test('reports zero listings without returning listing content', async () => {
  const fake = fakeTransport({ listingCount: 0 });
  const result = await runAlphaSmoke({ transportFactory: fake.factory });
  assert.deepEqual(result, { status: 'passed', listingCount: 0 });
  assert.equal(formatAlphaSmokeResult(result), 'Alpha smoke passed (listings: 0).\n');
});

test('detail mode reads one listed ID in the same session and emits no listing content or ID', async () => {
  const fake = fakeTransport();
  const result = await runAlphaSmoke({ transportFactory: fake.factory, detail: true });

  assert.deepEqual(result, { status: 'passed', listingCount: 1 });
  const calls = fake.calls.filter((call) => call.method === 'tools/call');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].params, {
    name: 'get_listing',
    arguments: { listingId: 1 },
  });
  assert.equal(JSON.stringify(result).includes('listingId'), false);
  assert.equal(JSON.stringify(result).includes(privateListingText), false);
  assert.equal(formatAlphaSmokeResult(result), 'Alpha smoke passed (listings: 1).\n');
});

test('detail mode fails on zero listings, wrong detail IDs, or unexpected detail fields', async () => {
  for (const [fake, expectedDetailCalls] of [
    [fakeTransport({ listingCount: 0 }), 0],
    [fakeTransport({ wrongDetailId: true }), 1],
    [fakeTransport({ detailExtraField: true }), 1],
    [fakeTransport({ failAt: 'get_listing' }), 1],
  ]) {
    const result = await runAlphaSmoke({ transportFactory: fake.factory, detail: true });
    assert.deepEqual(result, { status: 'failed' });
    assert.equal(formatAlphaSmokeResult(result), 'Alpha smoke failed.\n');
    const detailCalls = fake.calls.filter(
      (call) => call.method === 'tools/call' && call.params.name === 'get_listing',
    );
    assert.equal(detailCalls.length, expectedDetailCalls);
    assert.equal(JSON.stringify(result).includes(privateListingText), false);
  }
});

test('malformed or oversized responses fail generically and always close transport', async () => {
  for (const fake of [
    fakeTransport({ listingCount: 2 }),
    fakeTransport({ failAt: 'tools/call' }),
  ]) {
    const result = await runAlphaSmoke({ transportFactory: fake.factory });
    assert.deepEqual(result, { status: 'failed' });
    assert.equal(formatAlphaSmokeResult(result), 'Alpha smoke failed.\n');
    assert.equal(fake.closed, true);
    assert.equal(JSON.stringify(result).includes(privateListingText), false);
  }

  let malformedTransportClosed = false;
  const malformed = await runAlphaSmoke({
    transportFactory: async () => ({
      async request(method) {
        if (method === 'initialize') return { serverInfo: {} };
        if (method === 'tools/list')
          return {
            tools: [
              { name: 'get_setup_status' },
              { name: 'get_listing', annotations: { readOnlyHint: true, destructiveHint: false } },
              {
                name: 'list_active_listings',
                annotations: { readOnlyHint: true, destructiveHint: false },
              },
            ],
          };
        return { content: [{ type: 'text', text: 'not json' }] };
      },
      notify() {},
      async close() {
        malformedTransportClosed = true;
      },
    }),
  });
  assert.deepEqual(malformed, { status: 'failed' });
  assert.equal(malformedTransportClosed, true);
});

test('timeouts and invalid timeout options fail without exposing transport errors', async () => {
  let closed = false;
  const result = await runAlphaSmoke({
    timeoutMs: 10,
    transportFactory: async () => ({
      async request() {
        return new Promise(() => {});
      },
      notify() {},
      async close() {
        closed = true;
      },
    }),
  });
  assert.deepEqual(result, { status: 'failed' });
  assert.equal(closed, true);
  assert.deepEqual(await runAlphaSmoke({ timeoutMs: 0 }), { status: 'failed' });
});

test('result formatter only emits the fixed status and bounded count', () => {
  assert.equal(
    formatAlphaSmokeResult({ status: 'failed', error: privateListingText }),
    'Alpha smoke failed.\n',
  );
  assert.equal(
    formatAlphaSmokeResult({ status: 'passed', listingCount: 2, error: privateListingText }),
    'Alpha smoke failed.\n',
  );
});

test('CLI accepts only one explicit detail flag', () => {
  assert.deepEqual(parseAlphaSmokeArgs([]), { detail: false });
  assert.deepEqual(parseAlphaSmokeArgs(['--detail']), { detail: true });
  assert.equal(parseAlphaSmokeArgs(['--detail', '--detail']), undefined);
  assert.equal(parseAlphaSmokeArgs(['--other']), undefined);
});

test('smoke accepts optional read-only guidance without invoking it, but rejects unsafe or unknown tools', async () => {
  for (const [extraTools, status] of [
    [
      [
        {
          name: 'get_review_guidance',
          annotations: { readOnlyHint: true, destructiveHint: false },
        },
      ],
      'passed',
    ],
    [
      [
        {
          name: 'get_review_guidance',
          annotations: { readOnlyHint: false, destructiveHint: false },
        },
      ],
      'failed',
    ],
    [[{ name: 'unapproved_tool' }], 'failed'],
    [[{ name: 'get_setup_status' }], 'failed'],
  ]) {
    const fake = fakeTransport({ extraTools });
    assert.equal((await runAlphaSmoke({ transportFactory: fake.factory })).status, status);
    assert.equal(
      fake.calls.some((c) => c.method === 'tools/call' && c.params.name === 'get_review_guidance'),
      false,
    );
  }
});
