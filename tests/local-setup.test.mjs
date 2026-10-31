import assert from 'node:assert/strict';
import test from 'node:test';
import { configureLocalConnection } from '../dist/src/local/setup.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

const SHOP_ID = 82002;
const KEYSTRING = 'fabricated-app-keystring';
const SHARED_SECRET = 'fabricated-app-shared-secret';

function makeOptions({
  inputs = [KEYSTRING, SHARED_SECRET],
  expectedShopId = SHOP_ID,
  secretStore = new InMemorySecretStore(),
  configRead,
  configWrite,
} = {}) {
  const prompts = [];
  const configWrites = [];
  const configReads = [];
  const options = {
    expectedShopId,
    async readHiddenInput(prompt, ...unexpectedArguments) {
      prompts.push(prompt);
      assert.equal(unexpectedArguments.length, 0);
      if (inputs instanceof Error) throw inputs;
      const value = inputs.shift();
      if (value instanceof Error) throw value;
      return value;
    },
    secretStore,
    configStore: {
      async read() {
        configReads.push(true);
        if (configRead instanceof Error) throw configRead;
        return configRead;
      },
      async write(shopId) {
        configWrites.push(shopId);
        if (configWrite instanceof Error) throw configWrite;
      },
    },
  };
  return { options, prompts, configReads, configWrites, secretStore };
}

test('successful setup reads both secrets hidden, stores them, then writes only the expected shop ID', async () => {
  const flow = makeOptions();

  const result = await configureLocalConnection(flow.options);

  assert.deepEqual(result, { status: 'configured' });
  assert.deepEqual(flow.prompts, ['Etsy API keystring: ', 'Etsy app shared secret: ']);
  assert.deepEqual(flow.configWrites, [SHOP_ID]);
  assert.equal(await flow.secretStore.get('appKeystring'), KEYSTRING);
  assert.equal(await flow.secretStore.get('appSharedSecret'), SHARED_SECRET);
  assert.deepEqual(Object.keys(result), ['status']);
  assert.equal(JSON.stringify(result).includes(KEYSTRING), false);
  assert.equal(JSON.stringify(result).includes(SHARED_SECRET), false);
});

test('invalid shop ID fails before asking for secrets or touching stores', async () => {
  const flow = makeOptions({ expectedShopId: Number.MAX_SAFE_INTEGER + 1 });

  assert.deepEqual(await configureLocalConnection(flow.options), {
    status: 'failed',
    reason: 'invalid_shop_id',
  });
  assert.deepEqual(flow.prompts, []);
  assert.deepEqual(flow.configWrites, []);
  assert.equal(await flow.secretStore.get('appKeystring'), undefined);
});

test('missing or malformed hidden values fail before writing any secret or config', async () => {
  for (const inputs of [
    [''],
    ['   ', SHARED_SECRET],
    [KEYSTRING, 'secret\nwith-control'],
    [KEYSTRING, 'too-long'],
  ]) {
    const secretStore = new InMemorySecretStore();
    const flow = makeOptions({ inputs, secretStore });
    if (inputs[1] === 'too-long') {
      flow.options.readHiddenInput = async (prompt) => {
        flow.prompts.push(prompt);
        return prompt.startsWith('Etsy API') ? KEYSTRING : 'x'.repeat(4097);
      };
    }

    assert.deepEqual(await configureLocalConnection(flow.options), {
      status: 'failed',
      reason: 'invalid_secret',
    });
    assert.deepEqual(flow.configWrites, []);
    assert.equal(await secretStore.get('appKeystring'), undefined);
    assert.equal(await secretStore.get('appSharedSecret'), undefined);
  }
});

test('hidden-input failures are sanitized and do not touch the stores', async () => {
  const flow = makeOptions({ inputs: new Error('fabricated keystring leaked') });

  const result = await configureLocalConnection(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'input_failed' });
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
  assert.deepEqual(flow.configWrites, []);
  assert.equal(await flow.secretStore.get('appKeystring'), undefined);

  const secondInputFailure = makeOptions({
    inputs: [KEYSTRING, new Error('fabricated shared secret details')],
  });
  assert.deepEqual(await configureLocalConnection(secondInputFailure.options), {
    status: 'failed',
    reason: 'input_failed',
  });
  assert.deepEqual(secondInputFailure.configWrites, []);
  assert.equal(await secondInputFailure.secretStore.get('appKeystring'), undefined);
});

test('local state read failures are sanitized before prompting', async () => {
  const flow = makeOptions({ configRead: new Error('fabricated local configuration detail') });

  const result = await configureLocalConnection(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'state_check_failed' });
  assert.deepEqual(flow.prompts, []);
  assert.deepEqual(flow.configWrites, []);
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
});

test('existing configuration or credentials are never overwritten', async () => {
  const underlying = new InMemorySecretStore();
  await underlying.set('appKeystring', 'fabricated-previous-keystring');
  await underlying.set('appSharedSecret', 'fabricated-previous-shared-secret');
  await underlying.set('accessToken', 'fabricated-existing-access-token');
  const credentialsFlow = makeOptions({ secretStore: underlying });

  assert.deepEqual(await configureLocalConnection(credentialsFlow.options), {
    status: 'failed',
    reason: 'existing_credentials',
  });
  assert.deepEqual(credentialsFlow.prompts, []);
  assert.equal(await underlying.get('appKeystring'), 'fabricated-previous-keystring');
  assert.equal(await underlying.get('appSharedSecret'), 'fabricated-previous-shared-secret');
  assert.equal(await underlying.get('accessToken'), 'fabricated-existing-access-token');

  const configFlow = makeOptions({ configRead: { expectedShopId: SHOP_ID } });
  assert.deepEqual(await configureLocalConnection(configFlow.options), {
    status: 'failed',
    reason: 'already_configured',
  });
  assert.deepEqual(configFlow.prompts, []);
  assert.deepEqual(configFlow.configWrites, []);
});

test('partial initial secret writes fail closed and are not automatically erased', async () => {
  const underlying = new InMemorySecretStore();
  const partialStore = {
    async get(key) {
      return underlying.get(key);
    },
    async set(key, value) {
      if (key === 'appSharedSecret') throw new Error('fabricated backend secret detail');
      await underlying.set(key, value);
    },
    async delete(key) {
      return underlying.delete(key);
    },
  };
  const flow = makeOptions({ secretStore: partialStore });

  const result = await configureLocalConnection(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'partial_secret_store_failed' });
  assert.equal(await underlying.get('appKeystring'), KEYSTRING);
  assert.equal(await underlying.get('appSharedSecret'), undefined);
  assert.deepEqual(flow.configWrites, []);
  assert.equal(JSON.stringify(result).includes('fabricated'), false);

  const retry = makeOptions({ secretStore: partialStore });
  assert.deepEqual(await configureLocalConnection(retry.options), {
    status: 'failed',
    reason: 'existing_credentials',
  });
  assert.deepEqual(retry.prompts, []);
  assert.equal(await underlying.get('appKeystring'), KEYSTRING);
});

test('config failure leaves protected secrets intact and reports no raw error', async () => {
  const flow = makeOptions({ configWrite: new Error('fabricated filesystem details') });

  const result = await configureLocalConnection(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'config_store_failed' });
  assert.equal(await flow.secretStore.get('appKeystring'), KEYSTRING);
  assert.equal(await flow.secretStore.get('appSharedSecret'), SHARED_SECRET);
  assert.deepEqual(flow.configWrites, [SHOP_ID]);
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
});
