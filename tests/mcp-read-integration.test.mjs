import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import test from 'node:test';

test('opt-in MCP server exposes only bounded read tools and sanitizes service errors', async () => {
  const script = `
    import { serveStdio } from '@modelcontextprotocol/server/stdio';
    import { createServer } from './dist/src/server.js';
    import { EtsyReadError } from './dist/src/etsy/read-client.js';
    const service = {
      async listActiveListings() { return { listings: [], nextOffset: null }; },
      async getListing() { const error = new EtsyReadError('authorization_rejected'); error.message = 'fake secret'; throw error; }
    };
    await serveStdio(() => createServer({ readService: service }));
  `;
  const child = spawn(process.execPath, [
    '--import',
    './tests/offline-network.mjs',
    '--input-type=module',
    '-e',
    script,
  ]);
  const lines = createInterface({ input: child.stdout });
  const replies = new Map();
  let rejectPending;
  const failed = new Promise((_, reject) => {
    rejectPending = reject;
  });
  const timeout = setTimeout(() => rejectPending(new Error('MCP test timed out')), 10_000);
  child.once('error', rejectPending);
  child.once('exit', () => rejectPending(new Error('MCP server exited early')));
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    replies.get(message.id)?.(message);
  });
  const request = async (id, method, params) => {
    const response = new Promise((resolve) => replies.set(id, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    return Promise.race([response, failed]);
  };
  try {
    assert.ok(
      (
        await request(1, 'initialize', {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'offline-test', version: '1.0.0' },
        })
      ).result,
    );
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    );
    const inventory = await request(2, 'tools/list', {});
    assert.deepEqual(inventory.result.tools.map((tool) => tool.name).sort(), [
      'get_listing',
      'get_setup_status',
      'list_active_listings',
    ]);
    const status = await request(6, 'tools/call', { name: 'get_setup_status', arguments: {} });
    assert.equal(JSON.parse(status.result.content[0].text).etsyAccess, 'not_checked');
    const listed = await request(3, 'tools/call', { name: 'list_active_listings', arguments: {} });
    assert.deepEqual(JSON.parse(listed.result.content[0].text), { listings: [], nextOffset: null });
    const failedRead = await request(4, 'tools/call', {
      name: 'get_listing',
      arguments: { listingId: 123 },
    });
    assert.equal(failedRead.result.isError, true);
    assert.match(failedRead.result.content[0].text, /Etsy rejected the authorization/);
    assert.equal(JSON.stringify(failedRead).includes('fake secret'), false);
    const invalid = await request(5, 'tools/call', {
      name: 'list_active_listings',
      arguments: { shopId: 123 },
    });
    assert.ok(invalid.error || invalid.result.isError);
  } finally {
    clearTimeout(timeout);
    lines.close();
    child.kill();
  }
});
