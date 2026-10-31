import assert from 'node:assert/strict';
import test from 'node:test';
import { runVerificationFlow } from '../dist/src/auth/verification-flow.js';

const OWNER_ID = 71001;
const SHOP_ID = 82002;
const CODE_VERIFIER = 'fabricated-verifier-value-that-is-long-enough-1234567890';
const AUTHORIZATION_URL = 'https://www.etsy.com/oauth/connect?fabricated=1';
const LOCAL_START_URL = 'http://localhost:3003/oauth/start';

function makeGrant(overrides = {}) {
  return {
    accessToken: `${OWNER_ID}.fabricated-access-token`,
    refreshToken: `${OWNER_ID}.fabricated-refresh-token`,
    expiresIn: 3600,
    scope: ['listings_r'],
    ...overrides,
  };
}

function makeAttempt() {
  return {
    authorizationUrl: AUTHORIZATION_URL,
    codeVerifier: CODE_VERIFIER,
  };
}

function makeFlow(overrides = {}) {
  const events = [];
  const stored = new Map();
  let resolveCallback;
  let rejectCallback;
  const callbackResult = new Promise((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });
  const receiver = {
    result: callbackResult,
    browserStartUrl: LOCAL_START_URL,
    async close() {
      events.push('close');
    },
  };
  const options = {
    attempt: makeAttempt(),
    expectedShopId: SHOP_ID,
    async receiverFactory(attempt) {
      assert.equal(attempt, options.attempt);
      events.push('receiver');
      return receiver;
    },
    async openBrowser(url) {
      events.push('browser');
      assert.equal(url, LOCAL_START_URL);
      resolveCallback({ kind: 'authorized', code: 'fabricated-authorization-code' });
    },
    async exchange(code, verifier) {
      events.push('exchange');
      assert.equal(code, 'fabricated-authorization-code');
      assert.equal(verifier, CODE_VERIFIER);
      return makeGrant();
    },
    store: {
      async set(key, value) {
        events.push(`store:${key}`);
        stored.set(key, value);
      },
      async get(key) {
        return stored.get(key);
      },
      async delete(key) {
        return stored.delete(key);
      },
    },
    async verifyShop(input) {
      events.push('verify-shop');
      assert.equal(input.expectedShopId, SHOP_ID);
      assert.equal(input.ownerId, OWNER_ID);
      assert.equal(input.grant.accessToken, `${OWNER_ID}.fabricated-access-token`);
    },
    ...overrides,
  };
  return { options, events, stored, resolveCallback, rejectCallback };
}

test('starts the callback receiver before browser open, verifies shop, then stores refresh and access', async () => {
  const { options, events, stored } = makeFlow();

  const result = await runVerificationFlow(options);

  assert.deepEqual(result, { status: 'passed' });
  assert.deepEqual(events, [
    'receiver',
    'browser',
    'exchange',
    'verify-shop',
    'store:refreshToken',
    'store:accessToken',
    'close',
  ]);
  assert.equal(stored.get('refreshToken'), `${OWNER_ID}.fabricated-refresh-token`);
  assert.equal(stored.get('accessToken'), `${OWNER_ID}.fabricated-access-token`);
  assert.equal('accessToken' in result, false);
});

test('denial is sanitized and does not exchange or persist credentials', async () => {
  const flow = makeFlow({
    async openBrowser() {
      flow.resolveCallback({ kind: 'denied', error: 'access_denied' });
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'consent_denied' });
  assert.equal(flow.events.includes('exchange'), false);
  assert.equal(flow.events.includes('verify-shop'), false);
  assert.equal(
    flow.events.some((event) => event.startsWith('store:')),
    false,
  );
  assert.equal(flow.events.at(-1), 'close');
});

test('unexpected scope is rejected before identity verification or storage', async () => {
  const flow = makeFlow({
    async exchange() {
      flow.events.push('exchange');
      return makeGrant({ scope: ['listings_r', 'shops_r'] });
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'invalid_scope' });
  assert.equal(flow.events.includes('verify-shop'), false);
  assert.equal(
    flow.events.some((event) => event.startsWith('store:')),
    false,
  );
  assert.equal(flow.events.at(-1), 'close');
});

test('malformed token owner identity is rejected without shop lookup', async () => {
  const flow = makeFlow({
    async exchange() {
      return makeGrant({ accessToken: 'malformed-fabricated-token' });
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'invalid_identity' });
  assert.equal(flow.events.includes('verify-shop'), false);
  assert.equal(
    flow.events.some((event) => event.startsWith('store:')),
    false,
  );
  assert.equal(flow.events.at(-1), 'close');
});

test('numeric token owner identity is passed to the configured-shop verifier', async () => {
  const flow = makeFlow({
    async exchange() {
      return makeGrant({
        accessToken: `${OWNER_ID + 1}.fabricated-token`,
        refreshToken: `${OWNER_ID + 1}.fabricated-refresh`,
      });
    },
    async verifyShop(input) {
      flow.events.push('verify-shop');
      assert.equal(input.ownerId, OWNER_ID + 1);
      throw new Error('fabricated wrong-owner details');
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'shop_verification_failed' });
  assert.equal(
    flow.events.some((event) => event.startsWith('store:')),
    false,
  );
  assert.equal(flow.events.at(-1), 'close');
});

test('mismatched access and refresh token owners fail before verification or persistence', async () => {
  const flow = makeFlow({
    async exchange() {
      return makeGrant({ refreshToken: `${OWNER_ID + 1}.fabricated-refresh` });
    },
  });
  assert.deepEqual(await runVerificationFlow(flow.options), {
    status: 'failed',
    reason: 'invalid_identity',
  });
  assert.equal(flow.events.includes('verify-shop'), false);
  assert.equal(flow.stored.size, 0);
});

test('shop verification failure prevents all token persistence', async () => {
  const flow = makeFlow({
    async verifyShop() {
      flow.events.push('verify-shop');
      throw new Error('fabricated shop or token detail');
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'shop_verification_failed' });
  assert.equal(
    flow.events.some((event) => event.startsWith('store:')),
    false,
  );
  assert.equal(flow.events.at(-1), 'close');
});

test('store failures return a sanitized failure and still close the receiver', async () => {
  const flow = makeFlow({
    store: {
      async set(key) {
        flow.events.push(`store:${key}`);
        if (key === 'accessToken') throw new Error('fabricated access token detail');
      },
      async get() {
        return undefined;
      },
      async delete() {
        return false;
      },
    },
  });

  const result = await runVerificationFlow(flow.options);

  assert.deepEqual(result, { status: 'failed', reason: 'storage_failed' });
  assert.deepEqual(flow.events.slice(-3), ['store:refreshToken', 'store:accessToken', 'close']);
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
});

test('browser, exchange, and callback errors are sanitized and close the receiver', async () => {
  const browserFailure = makeFlow({
    async openBrowser() {
      throw new Error('fabricated authorization URL detail');
    },
  });
  assert.deepEqual(await runVerificationFlow(browserFailure.options), {
    status: 'failed',
    reason: 'browser_failed',
  });
  assert.deepEqual(browserFailure.events, ['receiver', 'close']);

  const exchangeFailure = makeFlow({
    async exchange() {
      throw new Error('fabricated code and token details');
    },
  });
  assert.deepEqual(await runVerificationFlow(exchangeFailure.options), {
    status: 'failed',
    reason: 'exchange_failed',
  });
  assert.equal(exchangeFailure.events.at(-1), 'close');
  assert.equal(
    JSON.stringify(await runVerificationFlow(exchangeFailure.options)).includes('fabricated'),
    false,
  );

  const callbackFailure = makeFlow({
    async openBrowser() {
      callbackFailure.rejectCallback(new Error('fabricated callback query'));
    },
  });
  assert.deepEqual(await runVerificationFlow(callbackFailure.options), {
    status: 'failed',
    reason: 'callback_failed',
  });
  assert.equal(callbackFailure.events.at(-1), 'close');
});

test('receiver cleanup failure does not report a successful verification', async () => {
  const flow = makeFlow({
    receiverFactory: async () => {
      flow.events.push('receiver');
      return {
        result: Promise.resolve({ kind: 'authorized', code: 'fabricated-code' }),
        async close() {
          flow.events.push('close');
          throw new Error('fabricated cleanup details');
        },
      };
    },
  });

  assert.deepEqual(await runVerificationFlow(flow.options), {
    status: 'failed',
    reason: 'cleanup_failed',
  });
});
