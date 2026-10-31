import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';

function run(...args) {
  return spawnSync(
    process.execPath,
    ['--import', './tests/offline-network.mjs', './dist/src/local/cli-main.js', ...args],
    { encoding: 'utf8' },
  );
}

test('CLI rejects extra arguments without echoing them or accessing setup', () => {
  const result = run('setup', 'fabricated-private-value');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
  assert.equal(result.stderr.includes('fabricated-private-value'), false);
});

test('CLI refuses noninteractive setup and connection', () => {
  for (const command of ['guided', 'lookup', 'setup', 'connect', 'reset']) {
    const result = run(command);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /interactive local terminal/);
  }
});
