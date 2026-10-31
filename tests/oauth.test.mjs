import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { connect } from 'node:net';
import { clearTimeout, setTimeout } from 'node:timers';
import { URL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import {
  createOAuthAttempt,
  LOCAL_REDIRECT_URI,
  OAuthError,
  validateCallbackTarget,
} from '../dist/src/auth/oauth.js';
import { CallbackServerError, startCallbackReceiver } from '../dist/src/auth/callback-server.js';

async function within(promise, timeoutMs, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

test('authorization attempt uses PKCE S256, one listings_r scope, state, and the exact local callback', () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated-client-id' });
  const url = new URL(attempt.authorizationUrl);
  assert.equal(url.origin + url.pathname, 'https://www.etsy.com/oauth/connect');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'fabricated-client-id');
  assert.equal(url.searchParams.get('redirect_uri'), LOCAL_REDIRECT_URI);
  assert.equal(url.searchParams.get('scope'), 'listings_r');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.match(attempt.codeVerifier, /^[A-Za-z0-9._~-]{43,128}$/);
  assert.equal(
    url.searchParams.get('code_challenge'),
    createHash('sha256').update(attempt.codeVerifier, 'ascii').digest('base64url'),
  );
  assert.match(attempt.state, /^[A-Za-z0-9_-]{43}$/);
});

test('authorization attempt refuses alternate redirects and malformed scopes', () => {
  assert.throws(
    () =>
      createOAuthAttempt({ clientId: 'x', redirectUri: 'http://127.0.0.1:3003/oauth/redirect' }),
    OAuthError,
  );
  assert.throws(
    () => createOAuthAttempt({ clientId: 'x', scopes: ['listings_r', 'listings_w'] }),
    OAuthError,
  );
  assert.throws(
    () => createOAuthAttempt({ clientId: 'x', scopes: ['listings_r', 'listings_r'] }),
    OAuthError,
  );
});

test('callback accepts a matching single-use authorization code and rejects replay', () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  const callback = validateCallbackTarget(
    `/oauth/redirect?code=fabricated-code&state=${attempt.state}`,
    'localhost:3003',
    attempt,
  );
  assert.deepEqual(callback, { kind: 'authorized', code: 'fabricated-code' });
  assert.equal(attempt.isConsumed(), true);
  assert.throws(
    () =>
      validateCallbackTarget(
        `/oauth/redirect?code=second&state=${attempt.state}`,
        'localhost:3003',
        attempt,
      ),
    (error) => error instanceof OAuthError && error.code === 'attempt_consumed',
  );
});

test('accepts Etsy issuer on a validated callback and refuses mismatched or repeated issuers', () => {
  for (const [issuer, expected] of [
    ['iss=https%3A%2F%2Fopenapi.etsy.com', true],
    ['iss=https%3A%2F%2Fevil.example', false],
    ['iss=https%3A%2F%2Fopenapi.etsy.com&iss=https%3A%2F%2Fopenapi.etsy.com', false],
  ]) {
    const attempt = createOAuthAttempt({ clientId: 'fabricated' });
    const target = `/oauth/redirect?code=fake-code&state=${attempt.state}&${issuer}`;
    if (expected) {
      assert.deepEqual(validateCallbackTarget(target, 'localhost:3003', attempt), {
        kind: 'authorized',
        code: 'fake-code',
      });
    } else {
      assert.throws(() => validateCallbackTarget(target, 'localhost:3003', attempt), {
        code: 'callback_invalid',
      });
    }
  }
});

test('callback rejects wrong host, wrong path, duplicate parameters, and mismatched state', () => {
  for (const [target, host, expected] of [
    ['/oauth/redirect?code=x&state=wrong', 'localhost:3003', 'state_mismatch'],
    ['/other?code=x&state=state', 'localhost:3003', 'callback_invalid'],
    ['/other/../oauth/redirect?code=x&state=state', 'localhost:3003', 'callback_invalid'],
    [
      'http://localhost:3003/oauth/redirect?code=x&state=state',
      'localhost:3003',
      'callback_invalid',
    ],
    ['/oauth/redirect?code=x&code=y&state=state', 'localhost:3003', 'callback_invalid'],
    ['/oauth/redirect?code=x&state=state&state=state', 'localhost:3003', 'callback_invalid'],
    ['/oauth/redirect?code=x&state=state', 'localhost.evil:3003', 'callback_invalid'],
    ['/oauth/redirect?code=x&error=denied&state=state', 'localhost:3003', 'callback_invalid'],
    ['/oauth/redirect?code=x&state=state&extra=1', 'localhost:3003', 'callback_invalid'],
  ]) {
    const attempt = createOAuthAttempt({ clientId: 'fabricated' });
    const actual = target.replaceAll('state=state', `state=${attempt.state}`);
    assert.throws(
      () => validateCallbackTarget(actual, host, attempt),
      (error) => error instanceof OAuthError && error.code === expected,
    );
    assert.equal(attempt.isConsumed(), true);
  }
});

test('callback validates a consent denial and does not expose its description', () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  assert.deepEqual(
    validateCallbackTarget(
      `/oauth/redirect?error=access_denied&error_description=private%20detail&state=${attempt.state}`,
      'localhost:3003',
      attempt,
    ),
    { kind: 'denied', error: 'access_denied' },
  );
});

test('loopback receiver handles callback and closes its listeners', async () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  const receiver = await startCallbackReceiver(attempt, { timeoutMs: 5_000 });
  try {
    const response = await globalThis.fetch(
      `${LOCAL_REDIRECT_URI}?code=fabricated-code&state=${attempt.state}`,
      { redirect: 'manual' },
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(await response.text(), /Authorization response received/);
    assert.deepEqual(await receiver.result, { kind: 'authorized', code: 'fabricated-code' });
  } finally {
    await receiver.close();
  }
});

test('browser start route uses one fixed local launch URL and redirects once without changing callback behavior', async () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  const receiver = await startCallbackReceiver(attempt, { timeoutMs: 5_000 });
  try {
    assert.equal(receiver.browserStartUrl, 'http://localhost:3003/oauth/start');
    const launchUrl = new URL(receiver.browserStartUrl);
    assert.equal(launchUrl.search, '');
    assert.notEqual(receiver.browserStartUrl, attempt.authorizationUrl);

    const launch = await globalThis.fetch(receiver.browserStartUrl, { redirect: 'manual' });
    assert.equal(launch.status, 302);
    assert.equal(launch.headers.get('location'), attempt.authorizationUrl);
    assert.equal(launch.headers.get('cache-control'), 'no-store, max-age=0');
    assert.equal(launch.headers.get('referrer-policy'), 'no-referrer');
    assert.equal((await launch.text()).includes(attempt.state), false);

    const replay = await globalThis.fetch(receiver.browserStartUrl, { redirect: 'manual' });
    assert.equal(replay.status, 410);
    assert.equal(replay.headers.get('location'), null);

    const callback = await globalThis.fetch(
      `${LOCAL_REDIRECT_URI}?code=fabricated-code&state=${attempt.state}`,
      { redirect: 'manual' },
    );
    assert.equal(callback.status, 200);
    assert.deepEqual(await receiver.result, { kind: 'authorized', code: 'fabricated-code' });
  } finally {
    await receiver.close();
  }
});

test('browser start rejects non-GET requests and non-exact paths without exposing the authorization URL', async (t) => {
  for (const [label, url, init] of [
    ['non-GET method', 'http://localhost:3003/oauth/start', { method: 'POST' }],
    ['query on launcher path', 'http://localhost:3003/oauth/start?extra=1', {}],
  ]) {
    await t.test(label, async () => {
      const attempt = createOAuthAttempt({ clientId: 'fabricated' });
      const receiver = await startCallbackReceiver(attempt, { timeoutMs: 5_000 });
      const resultRejection = assert.rejects(
        receiver.result,
        (error) => error instanceof CallbackServerError && error.code === 'callback_invalid',
      );
      try {
        const response = await globalThis.fetch(url, { redirect: 'manual', ...init });
        assert.equal(response.status, 400);
        assert.equal(response.headers.get('connection'), 'close');
        assert.equal((await response.text()).includes(attempt.state), false);
        await resultRejection;
      } finally {
        await receiver.close();
      }
    });
  }
});

test('browser start rejects an unexpected Host header', async () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  const receiver = await startCallbackReceiver(attempt, { timeoutMs: 5_000 });
  const resultRejection = assert.rejects(
    receiver.result,
    (error) => error instanceof CallbackServerError && error.code === 'callback_invalid',
  );
  const socket = connect({ host: '127.0.0.1', port: 3003 });
  let responseText = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    responseText += chunk;
  });

  try {
    await once(socket, 'connect');
    const socketClosed = once(socket, 'close');
    socket.write(
      'GET /oauth/start HTTP/1.1\r\n' +
        'Host: localhost.evil:3003\r\n' +
        'Connection: close\r\n' +
        '\r\n',
    );
    await within(socketClosed, 2_000, 'Invalid Host connection did not close in time.');
    await resultRejection;
    assert.match(responseText, /^HTTP\/1\.1 400 Bad Request/);
    assert.equal(responseText.includes(attempt.authorizationUrl), false);
    assert.equal(responseText.includes(attempt.state), false);
  } finally {
    socket.destroy();
    await receiver.close();
  }
});

test('incomplete chunked callback body gets a close response and cannot block receiver shutdown', async () => {
  const attempt = createOAuthAttempt({ clientId: 'fabricated' });
  const receiver = await startCallbackReceiver(attempt, { timeoutMs: 5_000 });
  const resultRejection = assert.rejects(
    receiver.result,
    (error) => error instanceof CallbackServerError && error.code === 'callback_invalid',
  );
  const socket = connect({ host: '127.0.0.1', port: 3003 });
  let responseText = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    responseText += chunk;
  });

  try {
    await once(socket, 'connect');
    socket.write(
      `POST /oauth/redirect?code=fabricated-code&state=${attempt.state} HTTP/1.1\r\n` +
        'Host: localhost:3003\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        '5\r\nab',
    );
    await within(
      once(socket, 'close'),
      2_000,
      'Incomplete callback request did not close within the bound.',
    );

    assert.match(responseText, /^HTTP\/1\.1 400 Bad Request/);
    assert.match(responseText, /Connection: close/i);
    assert.equal(responseText.includes('fabricated-code'), false);
    await resultRejection;
    await within(
      receiver.close(),
      1_500,
      'Callback receiver shutdown did not settle within the bound.',
    );
  } finally {
    socket.destroy();
    await within(
      receiver.close(),
      1_500,
      'Callback receiver cleanup did not settle within the bound.',
    );
  }
});

test('partial HTTP headers are force-closed when callback receiver times out', async () => {
  const receiver = await startCallbackReceiver(createOAuthAttempt({ clientId: 'fabricated' }), {
    timeoutMs: 100,
  });
  const resultRejection = assert.rejects(
    receiver.result,
    (error) => error instanceof CallbackServerError && error.code === 'timeout',
  );
  const socket = connect({ host: '127.0.0.1', port: 3003 });

  try {
    await once(socket, 'connect');
    const socketClosed = once(socket, 'close');
    socket.write('GET /oauth/redirect HTTP/1.1\r\nHost: localhost:3003\r\nX-Incomplete:');

    await within(
      resultRejection,
      1_800,
      'Callback receiver timeout did not settle with incomplete headers.',
    );
    await within(socketClosed, 1_800, 'Incomplete header socket did not close within the bound.');
    await within(
      receiver.close(),
      1_500,
      'Timed out callback receiver cleanup did not settle within the bound.',
    );
  } finally {
    socket.destroy();
    await within(
      receiver.close(),
      1_500,
      'Callback receiver cleanup did not settle within the bound.',
    );
  }
});

test('loopback receiver timeout and cancellation close listeners', async () => {
  const timed = await startCallbackReceiver(createOAuthAttempt({ clientId: 'fabricated' }), {
    timeoutMs: 20,
  });
  await assert.rejects(
    timed.result,
    (error) => error instanceof CallbackServerError && error.code === 'timeout',
  );

  const controller = new globalThis.AbortController();
  const cancelled = await startCallbackReceiver(createOAuthAttempt({ clientId: 'fabricated' }), {
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(
    cancelled.result,
    (error) => error instanceof CallbackServerError && error.code === 'cancelled',
  );
  await delay(1);
});
