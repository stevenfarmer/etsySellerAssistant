import assert from 'node:assert/strict';
import test from 'node:test';
import { LOCAL_START_URL, openLocalAuthorization } from '../dist/src/local/browser.js';

test('macOS and Windows launch only the fixed local start URL', async () => {
  const calls = [];
  const launch = async (command, args) => calls.push({ command, args });
  await openLocalAuthorization({ platform: 'darwin', launch });
  await openLocalAuthorization({ platform: 'win32', windowsRoot: 'C:\\Windows', launch });
  assert.deepEqual(calls, [
    { command: '/usr/bin/open', args: [LOCAL_START_URL] },
    {
      command: 'C:\\Windows\\System32\\rundll32.exe',
      args: ['url.dll,FileProtocolHandler', LOCAL_START_URL],
    },
  ]);
});

test('unsupported systems, invalid roots and launcher failures return sanitized errors', async () => {
  await assert.rejects(openLocalAuthorization({ platform: 'linux' }), {
    name: 'BrowserLaunchError',
  });
  await assert.rejects(openLocalAuthorization({ platform: 'win32', windowsRoot: 'relative' }), {
    name: 'BrowserLaunchError',
  });
  await assert.rejects(
    openLocalAuthorization({
      platform: 'darwin',
      launch: async () => {
        throw new Error('private details');
      },
    }),
    (error) => {
      assert.equal(error.name, 'BrowserLaunchError');
      assert.equal(error.message.includes('private details'), false);
      return true;
    },
  );
});
