import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCallbackTarget } from '../dist/src/auth/oauth.js';
import { connectLocal } from '../dist/src/local/connect.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

const CLIENT_ID = 'fabricated-client-id';
const APP_SHARED_SECRET = 'fabricated-app-shared-secret';
const OWNER_ID = 71001;
const SHOP_ID = 82002;
const BROWSER_START_URL = 'http://localhost:3003/oauth/start';

function makeHarness({
  config = { expectedShopId: SHOP_ID },
  shopId = SHOP_ID,
  shopOwnerId = OWNER_ID,
  tokenResponse = {
    access_token: `${OWNER_ID}.fabricated-access-token`,
    refresh_token: `${OWNER_ID}.fabricated-refresh-token`,
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'listings_r',
  },
  secretStore = new InMemorySecretStore(),
  configReadError,
} = {}) {
  const events = [];
  const requests = [];
  const browserUrls = [];
  let attempt;
  let resolveCallback;
  let receiverClosed = false;

  const callbackResult = new Promise((resolve) => {
    resolveCallback = resolve;
  });
  const receiverFactory = async (currentAttempt) => {
    attempt = currentAttempt;
    events.push('receiver-started');
    return {
      browserStartUrl: BROWSER_START_URL,
      result: callbackResult,
      async close() {
        events.push('receiver-closed');
        receiverClosed = true;
      },
    };
  };
  const openBrowser = async (url) => {
    events.push('browser-opened');
    browserUrls.push(url);
    assert.equal(url, BROWSER_START_URL);
    const callback = validateCallbackTarget(
      `/oauth/redirect?code=fabricated-authorization-code&state=${attempt.state}`,
      'localhost:3003',
      attempt,
    );
    resolveCallback(callback);
  };
  const tokenFetch = async (url, init) => {
    events.push('token-exchange');
    requests.push({ kind: 'token', url, init });
    assert.equal(url, 'https://api.etsy.com/v3/public/oauth/token');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.get('client_id'), CLIENT_ID);
    assert.equal(init.body.get('grant_type'), 'authorization_code');
    assert.equal(init.body.get('code'), 'fabricated-authorization-code');
    assert.equal(init.body.get('code_verifier'), attempt.codeVerifier);
    return globalThis.Response.json(tokenResponse);
  };
  const shopFetch = async (url, init) => {
    events.push('shop-verification');
    requests.push({ kind: 'shop', url, init });
    assert.equal(url, `https://openapi.etsy.com/v3/application/users/${OWNER_ID}/shops`);
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.authorization, `Bearer ${OWNER_ID}.fabricated-access-token`);
    assert.equal(init.headers['x-api-key'], `${CLIENT_ID}:${APP_SHARED_SECRET}`);
    return globalThis.Response.json({
      shop_id: shopId,
      user_id: shopOwnerId,
      shop_name: 'fabricated-shop-name',
    });
  };
  const options = {
    configStore: {
      async read() {
        events.push('read-config');
        if (configReadError !== undefined) throw configReadError;
        return config;
      },
      async status() {
        return config === undefined ? 'missing' : 'configured';
      },
      async write() {
        throw new Error('config writes are not part of connect');
      },
    },
    secretStore,
    receiverFactory,
    openBrowser,
    tokenFetch,
    shopFetch,
  };

  return {
    options,
    events,
    requests,
    browserUrls,
    secretStore,
    get receiverClosed() {
      return receiverClosed;
    },
  };
}

test('connect wires OAuth, fixed browser start URL, one shop lookup, and delayed token persistence', async () => {
  const secretStore = new InMemorySecretStore();
  await secretStore.set('appKeystring', CLIENT_ID);
  await secretStore.set('appSharedSecret', APP_SHARED_SECRET);
  const harness = makeHarness({ secretStore });

  const result = await connectLocal(harness.options);

  assert.deepEqual(result, { status: 'connected' });
  assert.deepEqual(harness.browserUrls, [BROWSER_START_URL]);
  assert.equal(harness.browserUrls[0].includes('etsy.com/oauth/connect'), false);
  assert.deepEqual(harness.events, [
    'read-config',
    'receiver-started',
    'browser-opened',
    'token-exchange',
    'shop-verification',
    'receiver-closed',
  ]);
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.requests[0].kind, 'token');
  assert.equal(harness.requests[1].kind, 'shop');
  assert.equal(await secretStore.get('refreshToken'), `${OWNER_ID}.fabricated-refresh-token`);
  assert.equal(await secretStore.get('accessToken'), `${OWNER_ID}.fabricated-access-token`);
  assert.deepEqual(Object.keys(result), ['status']);
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
  assert.equal(harness.receiverClosed, true);
});

test('existing access or refresh tokens refuse connect before receiver, browser, or network', async (t) => {
  for (const tokenKey of ['accessToken', 'refreshToken']) {
    await t.test(tokenKey, async () => {
      const secretStore = new InMemorySecretStore();
      await secretStore.set('appKeystring', CLIENT_ID);
      await secretStore.set('appSharedSecret', APP_SHARED_SECRET);
      await secretStore.set(tokenKey, 'fabricated-existing-token');
      const harness = makeHarness({ secretStore });

      const result = await connectLocal(harness.options);

      assert.deepEqual(result, { status: 'failed', reason: 'already_connected' });
      assert.deepEqual(harness.events, ['read-config']);
      assert.equal(harness.requests.length, 0);
      assert.equal(harness.browserUrls.length, 0);
      assert.equal(harness.receiverClosed, false);
    });
  }
});

test('missing configuration or app credentials fails before any external side effect', async () => {
  const missingConfig = makeHarness();
  missingConfig.options.configStore.read = async () => {
    missingConfig.events.push('read-config');
    return undefined;
  };
  assert.deepEqual(await connectLocal(missingConfig.options), {
    status: 'failed',
    reason: 'not_configured',
  });
  assert.deepEqual(missingConfig.events, ['read-config']);

  const missingCredentials = makeHarness();
  assert.deepEqual(await connectLocal(missingCredentials.options), {
    status: 'failed',
    reason: 'missing_credentials',
  });
  assert.deepEqual(missingCredentials.events, ['read-config']);
  assert.equal(missingCredentials.requests.length, 0);
  assert.equal(missingCredentials.browserUrls.length, 0);

  const configFailure = makeHarness({ configReadError: new Error('fabricated config details') });
  const failed = await connectLocal(configFailure.options);
  assert.deepEqual(failed, { status: 'failed', reason: 'configuration_failed' });
  assert.equal(JSON.stringify(failed).includes('fabricated'), false);
});

test('configured shop or token owner mismatch fails closed without persisting tokens', async (t) => {
  for (const [shopId, shopOwnerId] of [
    [SHOP_ID + 1, OWNER_ID],
    [SHOP_ID, OWNER_ID + 1],
  ]) {
    await t.test(`${shopId}:${shopOwnerId}`, async () => {
      const secretStore = new InMemorySecretStore();
      await secretStore.set('appKeystring', CLIENT_ID);
      await secretStore.set('appSharedSecret', APP_SHARED_SECRET);
      const harness = makeHarness({ secretStore, shopId, shopOwnerId });

      const result = await connectLocal(harness.options);

      assert.deepEqual(result, {
        status: 'failed',
        reason: 'shop_verification_failed',
      });
      assert.equal(await secretStore.get('accessToken'), undefined);
      assert.equal(await secretStore.get('refreshToken'), undefined);
      assert.equal(harness.receiverClosed, true);
      assert.deepEqual(harness.browserUrls, [BROWSER_START_URL]);
      assert.equal(JSON.stringify(result).includes('fabricated'), false);
    });
  }
});

test('secret-store read failures are sanitized and stop before OAuth', async () => {
  const secretStore = {
    async get() {
      throw new Error('fabricated secret-store detail');
    },
    async set() {
      throw new Error('must not write');
    },
    async delete() {
      return false;
    },
  };
  const harness = makeHarness({ secretStore });

  const result = await connectLocal(harness.options);

  assert.deepEqual(result, { status: 'failed', reason: 'store_failed' });
  assert.equal(JSON.stringify(result).includes('fabricated'), false);
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.browserUrls.length, 0);
});
