import assert from 'node:assert/strict';
import test from 'node:test';

test('offline preload blocks Etsy HTTPS fetches before networking without exposing the URL', async () => {
  await assert.rejects(globalThis.fetch('https://api.etsy.com/v3/public/oauth/token'), (error) => {
    assert.equal(error.message, 'Offline test guard blocked a non-loopback network request.');
    assert.equal(error.message.includes('etsy.com'), false);
    return true;
  });
});

test('offline preload rejects HTTPS even for localhost', async () => {
  await assert.rejects(globalThis.fetch('https://localhost:3003/oauth/redirect'), {
    message: 'Offline test guard blocked a non-loopback network request.',
  });
});
