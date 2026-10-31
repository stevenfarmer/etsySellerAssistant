import assert from 'node:assert/strict';
import test from 'node:test';
import { isInitialTokenStateEmpty, runLocalCommand } from '../dist/src/local/commands.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

function harness(inputs = []) {
  const values = [...inputs];
  const state = { config: undefined, calls: 0, prompts: [] };
  return {
    state,
    options: {
      secretStore: new InMemorySecretStore(),
      configStore: {
        async read() {
          return state.config;
        },
        async write(expectedShopId) {
          state.config = { expectedShopId };
        },
        async status() {
          return state.config ? 'configured' : 'missing';
        },
      },
      async readHiddenInput(prompt) {
        state.prompts.push(prompt);
        return values.shift();
      },
      async connect() {
        state.calls += 1;
        return { status: 'connected' };
      },
    },
  };
}

test('a new connection refuses to inherit any previous token expiry state', async () => {
  assert.equal(await isInitialTokenStateEmpty(async () => undefined), true);
  assert.equal(await isInitialTokenStateEmpty(async () => ({ status: 'ready' })), false);
  assert.equal(await isInitialTokenStateEmpty(async () => ({ status: 'refreshing' })), false);
  await assert.rejects(
    isInitialTokenStateEmpty(async () => {
      throw new Error('unavailable');
    }),
  );
});

test('guided setup finds the shop and stores credentials without asking twice or displaying its ID', async () => {
  const h = harness(['https://www.etsy.com/shop/SampleShop', 'fakekey', 'fakesecret', 'LOOKUP']);
  h.options.lookupFetch = async () =>
    globalThis.Response.json({ results: [{ shop_name: 'SampleShop', shop_id: 12345 }] });
  assert.deepEqual(await runLocalCommand(['guided'], h.options), { status: 'configured' });
  assert.equal(h.state.prompts.length, 4);
  assert.deepEqual(h.state.config, { expectedShopId: 12345 });
  assert.equal(await h.options.secretStore.get('appKeystring'), 'fakekey');
  assert.equal(await h.options.secretStore.get('appSharedSecret'), 'fakesecret');
});

test('guided setup never looks up or overwrites an already configured shop', async () => {
  const h = harness();
  h.state.config = { expectedShopId: 12345 };
  let calls = 0;
  h.options.lookupFetch = async () => {
    calls += 1;
    throw new Error('unexpected');
  };
  assert.deepEqual(await runLocalCommand(['guided'], h.options), {
    status: 'failed',
    reason: 'already_configured',
  });
  assert.equal(calls, 0);
  assert.equal(h.state.prompts.length, 0);
});

test('guided setup leaves no credentials or configuration when lookup is ambiguous', async () => {
  const h = harness(['SampleShop', 'fakekey', 'fakesecret', 'LOOKUP']);
  h.options.lookupFetch = async () => globalThis.Response.json({ results: [] });
  assert.deepEqual(await runLocalCommand(['guided'], h.options), {
    status: 'failed',
    reason: 'no_unique_match',
  });
  assert.equal(h.state.config, undefined);
  assert.equal(await h.options.secretStore.get('appKeystring'), undefined);
});

test('setup takes all values through local input and stores only the expected ID in config', async () => {
  const h = harness(['12345', 'fake-key', 'fake-secret']);
  assert.deepEqual(await runLocalCommand(['setup'], h.options), { status: 'configured' });
  assert.deepEqual(h.state.config, { expectedShopId: 12345 });
  assert.equal(await h.options.secretStore.get('appKeystring'), 'fake-key');
  assert.equal(h.state.calls, 0);
});

test('arguments and invalid IDs never reach setup or connect', async () => {
  const h = harness(['invalid']);
  assert.deepEqual(await runLocalCommand(['setup', 'fake-key'], h.options), {
    status: 'failed',
    reason: 'invalid_command',
  });
  assert.equal(h.state.prompts.length, 0);
  assert.deepEqual(await runLocalCommand(['setup'], h.options), {
    status: 'failed',
    reason: 'invalid_shop_id',
  });
  assert.equal(h.state.config, undefined);
  assert.equal(h.state.calls, 0);
});

test('connection errors are sanitized', async () => {
  const h = harness();
  h.options.connect = async () => {
    throw new Error('fabricated-private-details');
  };
  assert.deepEqual(await runLocalCommand(['connect'], h.options), {
    status: 'failed',
    reason: 'connection_failed',
  });
});
