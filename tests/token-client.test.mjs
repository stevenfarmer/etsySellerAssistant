import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exchangeAuthorizationCode,
  refreshAuthorization,
  TokenGrantError,
} from '../dist/src/auth/token-client.js';

const grant = {
  access_token: 'fake-access',
  refresh_token: 'fake-refresh',
  token_type: 'Bearer',
  expires_in: 3600,
  scope: 'listings_r',
};
const verifier = 'x'.repeat(43);

test('code exchange uses the fixed Etsy endpoint and exact registered callback', async () => {
  const fetchMock = async (url, init) => {
    assert.equal(url, 'https://api.etsy.com/v3/public/oauth/token');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.get('redirect_uri'), 'http://localhost:3003/oauth/redirect');
    assert.equal(init.body.get('grant_type'), 'authorization_code');
    assert.equal(init.body.get('code_verifier'), verifier);
    return globalThis.Response.json(grant);
  };
  const result = await exchangeAuthorizationCode('fake-client', 'fake-code', verifier, fetchMock);
  assert.equal(result.accessToken, 'fake-access');
  assert.deepEqual(result.scope, ['listings_r']);
});

test('refresh uses refresh grant with a mock transport', async () => {
  const result = await refreshAuthorization('fake-client', 'fake-refresh', async (_url, init) => {
    assert.equal(init.body.get('grant_type'), 'refresh_token');
    assert.equal(init.body.get('refresh_token'), 'fake-refresh');
    return globalThis.Response.json(grant);
  });
  assert.equal(result.refreshToken, 'fake-refresh');
});

test('missing or broader permissions and malformed responses fail closed', async () => {
  for (const invalid of [
    { ...grant, scope: '' },
    { ...grant, scope: 'listings_r listings_w' },
  ]) {
    await assert.rejects(
      exchangeAuthorizationCode('fake', 'fake', verifier, async () =>
        globalThis.Response.json(invalid),
      ),
      { code: 'invalid_scope' },
    );
  }
  await assert.rejects(
    exchangeAuthorizationCode('fake', 'fake', verifier, async () =>
      globalThis.Response.json({ ...grant, expires_in: -1 }),
    ),
    { code: 'invalid_response' },
  );
});

test('transport and response errors do not leak secret details', async () => {
  for (const fetchMock of [
    async () => {
      throw new Error('fake-secret');
    },
    async () => new globalThis.Response('fake-secret', { status: 400 }),
    async () => new globalThis.Response('fake-secret', { status: 200 }),
  ]) {
    await assert.rejects(
      exchangeAuthorizationCode('fake', 'fake', verifier, fetchMock),
      (error) => {
        assert.ok(error instanceof TokenGrantError);
        assert.equal(JSON.stringify(error).includes('fake-secret'), false);
        assert.equal(error.message.includes('fake-secret'), false);
        return true;
      },
    );
  }
});

test('invalid authorization input is rejected before transport', async () => {
  let called = false;
  const forbiddenFetch = async () => {
    called = true;
    throw new Error('unexpected network');
  };
  await assert.rejects(exchangeAuthorizationCode('fake', 'fake', 'short', forbiddenFetch), {
    code: 'invalid_request',
  });
  await assert.rejects(refreshAuthorization('fake', '', forbiddenFetch), {
    code: 'invalid_request',
  });
  assert.equal(called, false);
});
