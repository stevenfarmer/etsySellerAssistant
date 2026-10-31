import assert from 'node:assert/strict';
import test from 'node:test';
import { createOAuthAttempt, validateCallbackTarget } from '../dist/src/auth/oauth.js';
import { exchangeAuthorizationCode } from '../dist/src/auth/token-client.js';
import { runVerificationFlow } from '../dist/src/auth/verification-flow.js';
import { EtsyReadClient } from '../dist/src/etsy/read-client.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

const CLIENT_ID = 'fabricated-client-id';
const APP_KEYSTRING = 'fabricated-app-keystring';
const APP_SHARED_SECRET = 'fabricated-app-shared-secret';
const OWNER_ID = 71001;
const SHOP_ID = 82002;

function makeShopResponse(shopId, ownerId) {
  return globalThis.Response.json({
    shop_id: shopId,
    user_id: ownerId,
    shop_name: 'fabricated-shop-name',
  });
}

function makeHarness({ shopId = SHOP_ID, shopOwnerId = OWNER_ID } = {}) {
  const events = [];
  const attempt = createOAuthAttempt({ clientId: CLIENT_ID });
  const underlyingStore = new InMemorySecretStore();
  let resolveCallback;
  let receiverClosed = false;
  const callbackResult = new Promise((resolve) => {
    resolveCallback = resolve;
  });

  const store = {
    async get(key) {
      return underlyingStore.get(key);
    },
    async set(key, value) {
      events.push(`store:${key}`);
      await underlyingStore.set(key, value);
    },
    async delete(key) {
      return underlyingStore.delete(key);
    },
  };

  const receiverFactory = async (receivedAttempt) => {
    assert.equal(receivedAttempt, attempt);
    events.push('receiver-started');
    return {
      result: callbackResult,
      browserStartUrl: 'http://localhost:3003/oauth/start',
      async close() {
        events.push('receiver-closed');
        receiverClosed = true;
      },
    };
  };

  const openBrowser = async (localStartUrl) => {
    events.push('browser-opened');
    assert.equal(localStartUrl, 'http://localhost:3003/oauth/start');
    const callback = validateCallbackTarget(
      `/oauth/redirect?code=fabricated-authorization-code&state=${attempt.state}`,
      'localhost:3003',
      attempt,
    );
    resolveCallback(callback);
  };

  const tokenFetch = async (url, init) => {
    events.push('token-exchange');
    assert.equal(url, 'https://api.etsy.com/v3/public/oauth/token');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.get('grant_type'), 'authorization_code');
    assert.equal(init.body.get('client_id'), CLIENT_ID);
    assert.equal(init.body.get('redirect_uri'), 'http://localhost:3003/oauth/redirect');
    assert.equal(init.body.get('code'), 'fabricated-authorization-code');
    assert.equal(init.body.get('code_verifier'), attempt.codeVerifier);
    return globalThis.Response.json({
      access_token: `${OWNER_ID}.fabricated-access-token`,
      refresh_token: `${OWNER_ID}.fabricated-refresh-token`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'listings_r',
    });
  };

  const shopFetch = async (url, init) => {
    events.push('shop-lookup');
    assert.equal(url, `https://openapi.etsy.com/v3/application/users/${OWNER_ID}/shops`);
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.authorization, `Bearer ${OWNER_ID}.fabricated-access-token`);
    assert.equal(init.headers['x-api-key'], `${APP_KEYSTRING}:${APP_SHARED_SECRET}`);
    return makeShopResponse(shopId, shopOwnerId);
  };

  const verifyShop = async ({ expectedShopId, ownerId, grant }) => {
    events.push('shop-verifier');
    assert.deepEqual(grant.scope, ['listings_r']);
    const client = new EtsyReadClient({
      fetch: shopFetch,
      expectedShopId,
      ownerId,
      grant: { accessToken: grant.accessToken, scopes: grant.scope },
      apiKeystring: APP_KEYSTRING,
      apiSharedSecret: APP_SHARED_SECRET,
    });
    await client.verifyConfiguredShop();
  };

  const options = {
    attempt,
    expectedShopId: SHOP_ID,
    receiverFactory,
    openBrowser,
    exchange: (code, verifier) => exchangeAuthorizationCode(CLIENT_ID, code, verifier, tokenFetch),
    store,
    verifyShop,
  };

  return {
    attempt,
    events,
    options,
    underlyingStore,
    get receiverClosed() {
      return receiverClosed;
    },
  };
}

test('full mocked OAuth verifier validates callback, scope and shop before persisting tokens', async () => {
  const harness = makeHarness();

  const result = await runVerificationFlow(harness.options);

  assert.deepEqual(result, { status: 'passed' });
  assert.deepEqual(harness.events, [
    'receiver-started',
    'browser-opened',
    'token-exchange',
    'shop-verifier',
    'shop-lookup',
    'store:refreshToken',
    'store:accessToken',
    'receiver-closed',
  ]);
  assert.equal(
    await harness.underlyingStore.get('refreshToken'),
    `${OWNER_ID}.fabricated-refresh-token`,
  );
  assert.equal(
    await harness.underlyingStore.get('accessToken'),
    `${OWNER_ID}.fabricated-access-token`,
  );
  assert.equal(harness.receiverClosed, true);
  assert.deepEqual(Object.keys(result), ['status']);
});

test('shop ID or owner mismatch fails closed without persisting exchanged tokens', async (t) => {
  for (const [label, configuredShopId, configuredOwnerId] of [
    ['wrong shop', SHOP_ID + 1, OWNER_ID],
    ['wrong owner', SHOP_ID, OWNER_ID + 1],
  ]) {
    await t.test(label, async () => {
      const harness = makeHarness({ shopId: configuredShopId, shopOwnerId: configuredOwnerId });

      const result = await runVerificationFlow(harness.options);

      assert.deepEqual(result, {
        status: 'failed',
        reason: 'shop_verification_failed',
      });
      assert.equal(await harness.underlyingStore.get('refreshToken'), undefined);
      assert.equal(await harness.underlyingStore.get('accessToken'), undefined);
      assert.equal(harness.receiverClosed, true);
      assert.equal(harness.events.includes('store:refreshToken'), false);
      assert.equal(harness.events.includes('store:accessToken'), false);
      assert.equal(JSON.stringify(result).includes('fabricated'), false);
    });
  }
});
