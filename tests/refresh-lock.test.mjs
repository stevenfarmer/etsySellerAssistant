import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import {
  acquireRefreshLock,
  createRefreshStateStore,
  isRefreshStateFresh,
} from '../dist/src/local/refresh-lock.js';

async function withTempDirectory(run) {
  const directory = await fs.mkdtemp(path.join(tmpdir(), 'refresh-lock-test-'));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function waitForOutput(child, marker) {
  return new Promise((resolve, reject) => {
    let output = '';
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes(marker)) {
        child.stdout.off('data', onData);
        resolve(output);
      }
    };
    child.stdout.on('data', onData);
    child.once('error', reject);
    child.once('exit', (code) => {
      child.stdout.off('data', onData);
      reject(new Error(`child exited before marker (${code})`));
    });
  });
}

test('exclusive lock acquisition, contention, and release are owner-checked', async () => {
  await withTempDirectory(async (directory) => {
    const lease = await acquireRefreshLock({ directory });
    await lease.assertOwned();
    const owner = JSON.parse(
      await fs.readFile(path.join(directory, 'refresh.lock', 'owner.json'), 'utf8'),
    );
    assert.deepEqual(Object.keys(owner).sort(), ['createdAt', 'nonce', 'pid', 'version']);
    assert.equal(JSON.stringify(owner).includes('fabricated-token'), false);

    await assert.rejects(acquireRefreshLock({ directory }), {
      name: 'RefreshCoordinationError',
      code: 'busy',
    });
    await lease.release();
    await assert.rejects(lease.assertOwned(), { code: 'ownership_lost' });

    const nextLease = await acquireRefreshLock({ directory });
    await nextLease.release();
  });
});

test('two independent Node processes cannot acquire the same lock simultaneously', async () => {
  await withTempDirectory(async (directory) => {
    const moduleUrl = pathToFileURL(path.resolve('dist/src/local/refresh-lock.js')).href;
    const acquireCode = `import { acquireRefreshLock } from ${JSON.stringify(moduleUrl)};
const lease = await acquireRefreshLock({ directory: ${JSON.stringify(directory)} });
console.log('LOCK_ACQUIRED');
process.stdin.once('data', async () => { await lease.release(); console.log('LOCK_RELEASED'); });`;
    const contenderCode = `import { acquireRefreshLock } from ${JSON.stringify(moduleUrl)};
try { await acquireRefreshLock({ directory: ${JSON.stringify(directory)} }); console.log('UNEXPECTED_ACQUIRE'); }
catch (error) { console.log('CONTENDER:' + error.code); }`;
    const holder = spawn(process.execPath, ['--input-type=module', '-e', acquireCode], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const holderExit = once(holder, 'exit');
    let contender;
    let contenderExit;
    try {
      await waitForOutput(holder, 'LOCK_ACQUIRED');
      contender = spawn(process.execPath, ['--input-type=module', '-e', contenderCode], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      contenderExit = once(contender, 'exit');
      const contenderOutput = await waitForOutput(contender, 'CONTENDER:');
      assert.match(contenderOutput, /CONTENDER:busy/);
      await contenderExit;

      const released = waitForOutput(holder, 'LOCK_RELEASED');
      holder.stdin.end('release');
      await released;
      const [exitCode] = await holderExit;
      assert.equal(exitCode, 0);
    } finally {
      if (contender && contender.exitCode === null) contender.kill();
      if (holder.exitCode === null) holder.kill();
    }
  });
});

test('stale and malformed locks are never automatically stolen', async () => {
  await withTempDirectory(async (directory) => {
    const lockDirectory = path.join(directory, 'refresh.lock');
    await fs.mkdir(lockDirectory);
    await fs.writeFile(
      path.join(lockDirectory, 'owner.json'),
      JSON.stringify({ version: 1, pid: 99999999, nonce: 'a'.repeat(64), createdAt: Date.now() }),
      'utf8',
    );
    await assert.rejects(acquireRefreshLock({ directory }), {
      name: 'RefreshCoordinationError',
      code: 'busy',
    });

    await fs.writeFile(path.join(lockDirectory, 'owner.json'), '{partial', 'utf8');
    await assert.rejects(acquireRefreshLock({ directory }), {
      name: 'RefreshCoordinationError',
      code: 'recovery_required',
    });
    assert.equal((await fs.lstat(lockDirectory)).isDirectory(), true);
  });
});

test('a waiting contender tolerates briefly incomplete owner metadata without stealing the lock', async () => {
  await withTempDirectory(async (directory) => {
    const lockPath = path.join(directory, 'refresh.lock');
    await fs.mkdir(lockPath);
    const ownerCompletion = delay(30).then(() => fs.rm(lockPath, { recursive: true }));
    const lease = await acquireRefreshLock({ directory, waitTimeoutMs: 1000, retryIntervalMs: 10 });
    await ownerCompletion;
    await lease.release();
  });
});

test('a preexisting empty lock directory is preserved for manual recovery', async () => {
  await withTempDirectory(async (directory) => {
    const lockDirectory = path.join(directory, 'refresh.lock');
    await fs.mkdir(lockDirectory);

    await assert.rejects(acquireRefreshLock({ directory }), {
      name: 'RefreshCoordinationError',
      code: 'recovery_required',
    });
    assert.equal((await fs.readdir(lockDirectory)).length, 0);
    assert.equal((await fs.lstat(lockDirectory)).isDirectory(), true);
  });
});

test('failed owner initialization leaves the claimed directory for manual recovery', async () => {
  await withTempDirectory(async (directory) => {
    const failingFileSystem = {
      mkdir: (...args) => fs.mkdir(...args),
      chmod: (...args) => fs.chmod(...args),
      lstat: (...args) => fs.lstat(...args),
      open: (...args) => {
        if (path.basename(args[0]) === 'owner.json')
          throw new Error('fabricated initialization failure');
        return fs.open(...args);
      },
      rename: (...args) => fs.rename(...args),
      rm: (...args) => fs.rm(...args),
    };

    await assert.rejects(acquireRefreshLock({ directory, fileSystem: failingFileSystem }), {
      name: 'RefreshCoordinationError',
      code: 'recovery_required',
    });
    assert.equal((await fs.readdir(path.join(directory, 'refresh.lock'))).length, 0);
    await assert.rejects(acquireRefreshLock({ directory }), {
      name: 'RefreshCoordinationError',
      code: 'recovery_required',
    });
  });
});

test('refresh state is non-secret, atomic, and distinguishes fresh from interrupted refresh', async () => {
  await withTempDirectory(async (directory) => {
    const lease = await acquireRefreshLock({ directory });
    const stateStore = createRefreshStateStore({ directory });
    try {
      assert.equal(await stateStore.read(lease), undefined);
      await stateStore.markRefreshing(lease);
      const interrupted = await stateStore.read(lease);
      assert.deepEqual(interrupted, { status: 'refreshing', expiresAtMs: null });
      assert.equal(isRefreshStateFresh(interrupted, Date.now(), 60_000), false);

      const expiresAtMs = Date.now() + 3_600_000;
      await stateStore.markReady(lease, expiresAtMs);
      const ready = await stateStore.read(lease);
      assert.deepEqual(ready, { status: 'ready', expiresAtMs });
      assert.equal(isRefreshStateFresh(ready, Date.now(), 60_000), true);
      const diskValue = JSON.parse(
        await fs.readFile(path.join(directory, 'token-state.json'), 'utf8'),
      );
      assert.deepEqual(Object.keys(diskValue).sort(), ['expiresAtMs', 'status', 'version']);
      assert.equal(JSON.stringify(diskValue).includes('fabricated-token'), false);
      await stateStore.clear(lease);
      assert.equal(await stateStore.read(lease), undefined);
      await stateStore.clear(lease);
    } finally {
      await lease.release();
    }
  });
});

test('failed ready-state publication leaves the previous refreshing marker intact', async () => {
  await withTempDirectory(async (directory) => {
    let failNextStateRename = false;
    const injectedFileSystem = {
      mkdir: (...args) => fs.mkdir(...args),
      chmod: (...args) => fs.chmod(...args),
      lstat: (...args) => fs.lstat(...args),
      open: (...args) => fs.open(...args),
      rename: async (source, destination) => {
        if (failNextStateRename && destination === path.join(directory, 'token-state.json')) {
          failNextStateRename = false;
          throw new Error('fabricated backend failure');
        }
        return fs.rename(source, destination);
      },
      rm: (...args) => fs.rm(...args),
    };
    const lease = await acquireRefreshLock({ directory, fileSystem: injectedFileSystem });
    const stateStore = createRefreshStateStore({ directory, fileSystem: injectedFileSystem });
    try {
      await stateStore.markRefreshing(lease);
      failNextStateRename = true;
      await assert.rejects(stateStore.markReady(lease, Date.now() + 60_000), {
        name: 'RefreshCoordinationError',
        code: 'io_failed',
      });
      assert.deepEqual(await stateStore.read(lease), {
        status: 'refreshing',
        expiresAtMs: null,
      });
      await assert.rejects(stateStore.markRefreshing(lease), {
        name: 'RefreshCoordinationError',
        code: 'recovery_required',
      });
    } finally {
      await lease.release();
    }
  });
});

test('an interrupted refresh marker requires manual recovery instead of an automatic retry', async () => {
  await withTempDirectory(async (directory) => {
    const firstLease = await acquireRefreshLock({ directory });
    const firstStore = createRefreshStateStore({ directory });
    await firstStore.markRefreshing(firstLease);
    await firstLease.release();

    const recoveredLease = await acquireRefreshLock({ directory });
    const recoveredStore = createRefreshStateStore({ directory });
    try {
      assert.deepEqual(await recoveredStore.read(recoveredLease), {
        status: 'refreshing',
        expiresAtMs: null,
      });
      await assert.rejects(recoveredStore.markRefreshing(recoveredLease), {
        name: 'RefreshCoordinationError',
        code: 'recovery_required',
      });
    } finally {
      await recoveredLease.release();
    }
  });
});

test('rejects invalid paths and state transitions without network or credential inputs', async () => {
  await assert.rejects(acquireRefreshLock({ directory: 'relative/path' }), {
    name: 'RefreshCoordinationError',
    code: 'invalid_input',
  });
  await withTempDirectory(async (directory) => {
    const lease = await acquireRefreshLock({ directory });
    const stateStore = createRefreshStateStore({ directory });
    try {
      await assert.rejects(stateStore.markReady(lease, 0), {
        name: 'RefreshCoordinationError',
        code: 'invalid_state',
      });
    } finally {
      await lease.release();
    }
  });
});

test('failed lock release preserves the owner and blocks another refresher', async () => {
  await withTempDirectory(async (directory) => {
    const injectedFileSystem = {
      ...fs,
      rename: async () => {
        throw new Error('fabricated private filesystem failure');
      },
    };
    const lease = await acquireRefreshLock({ directory, fileSystem: injectedFileSystem });
    const ownerPath = path.join(directory, 'refresh.lock', 'owner.json');
    const originalOwner = await fs.readFile(ownerPath, 'utf8');
    await assert.rejects(lease.release(), (error) => {
      assert.equal(error.code, 'ownership_lost');
      assert.equal(error.message.includes('fabricated private'), false);
      return true;
    });
    assert.equal(await fs.readFile(ownerPath, 'utf8'), originalOwner);
    await lease.assertOwned();
    await assert.rejects(acquireRefreshLock({ directory }), { code: 'busy' });
  });
});
