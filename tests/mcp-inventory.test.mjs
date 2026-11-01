import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

async function readInventory(entry) {
  const child = spawn(process.execPath, ['--import', './tests/offline-network.mjs', entry]);
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
    const initialized = await request(1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'offline-test', version: '1.0.0' },
    });
    assert.ok(initialized.result);
    const manifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );
    const lock = JSON.parse(
      await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'),
    );
    assert.equal(initialized.result.serverInfo.version, manifest.version);
    assert.equal(lock.version, manifest.version);
    assert.equal(lock.packages[''].version, manifest.version);
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    );
    const status = await request(3, 'tools/call', { name: 'get_setup_status', arguments: {} });
    const setup = JSON.parse(status.result.content[0].text);
    assert.equal(setup.version, manifest.version);
    assert.equal(setup.etsyAccess, entry.endsWith('/alpha.js') ? 'not_checked' : 'not_configured');
    assert.equal('connection' in setup, false);
    const inventory = await request(2, 'tools/list', {});
    return inventory.result.tools.map((tool) => tool.name).sort();
  } finally {
    clearTimeout(timeout);
    lines.close();
    child.kill();
  }
}

test('the default STDIO server remains status-only', async () => {
  assert.deepEqual(await readInventory('./dist/src/index.js'), ['get_setup_status']);
});

test('the explicit alpha entry point exposes the bounded read-only tools without starting a read', async () => {
  assert.deepEqual(await readInventory('./dist/src/alpha.js'), [
    'get_listing',
    'get_setup_status',
    'list_active_listings',
  ]);
});
