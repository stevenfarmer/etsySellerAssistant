import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { platform } from 'node:process';
import test from 'node:test';
import {
  createLocalConfigStore,
  LocalConfigError,
  resolveLocalConfigDirectory,
} from '../dist/src/local/config.js';

async function withTempDirectory(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-config-test-'));
  try {
    await run(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('default paths are local and platform appropriate', () => {
  assert.equal(
    resolveLocalConfigDirectory({
      platform: 'darwin',
      homeDirectory: '/fabricated/home',
      path: path.posix,
    }),
    '/fabricated/home/Library/Application Support/etsySellerAssistant',
  );
  assert.equal(
    resolveLocalConfigDirectory({
      platform: 'win32',
      localAppData: 'C:\\Fabricated\\Local',
      path: path.win32,
    }),
    'C:\\Fabricated\\Local\\etsySellerAssistant',
  );
  assert.throws(() => resolveLocalConfigDirectory({ platform: 'linux' }), {
    name: 'LocalConfigError',
    code: 'unsupported_platform',
  });
  assert.throws(() => createLocalConfigStore({ directory: 'relative/path', platform: 'darwin' }), {
    name: 'LocalConfigError',
    code: 'invalid_path',
  });
});

test('missing and configured status are distinct, and writes contain only expectedShopId', async () => {
  await withTempDirectory(async (root) => {
    const directory = path.join(root, 'application-config');
    const store = createLocalConfigStore({ directory, platform: 'darwin' });

    assert.equal(await store.read(), undefined);
    assert.equal(await store.status(), 'missing');
    await store.write(24681357);
    assert.deepEqual(await store.read(), { expectedShopId: 24681357 });
    assert.equal(await store.status(), 'configured');
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, 'config.json'), 'utf8')), {
      expectedShopId: 24681357,
    });
    await store.delete();
    assert.equal(await store.read(), undefined);
    await store.delete();
  });
});

test('rejects invalid IDs, unknown properties, and credential-like configuration fields', async () => {
  await withTempDirectory(async (root) => {
    const directory = path.join(root, 'application-config');
    const store = createLocalConfigStore({ directory, platform: 'darwin' });

    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '24681357', Number.NaN]) {
      await assert.rejects(store.write(value), {
        name: 'LocalConfigError',
        code: 'invalid_shop_id',
      });
    }
    await fs.mkdir(directory, { recursive: true });
    for (const serialized of [
      '{broken',
      JSON.stringify({ expectedShopId: 24681357, extra: true }),
      JSON.stringify({ expectedShopId: 24681357, accessToken: 'fabricated-token' }),
      JSON.stringify({ expectedShopId: '24681357' }),
      JSON.stringify({ expectedShopId: Number.MAX_SAFE_INTEGER + 1 }),
      ' '.repeat(1025),
    ]) {
      await fs.writeFile(path.join(directory, 'config.json'), serialized, 'utf8');
      await assert.rejects(store.read(), (error) => {
        assert.ok(error instanceof LocalConfigError);
        assert.equal(error.code, 'invalid_config');
        assert.equal(error.message.includes('fabricated-token'), false);
        return true;
      });
      assert.equal(await store.status(), 'invalid');
    }
  });
});

test('writes use restrictive modes on POSIX', async (t) => {
  if (platform === 'win32') return t.skip('POSIX mode bits are not a Windows ACL check.');
  await withTempDirectory(async (root) => {
    const directory = path.join(root, 'application-config');
    const store = createLocalConfigStore({ directory, platform: 'darwin' });
    await store.write(24681357);

    assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path.join(directory, 'config.json'))).mode & 0o777, 0o600);
  });
});

test('failed atomic rename reports sanitized IO failure and removes the temp file', async () => {
  await withTempDirectory(async (root) => {
    const directory = path.join(root, 'application-config');
    const injectedFileSystem = {
      mkdir: (...args) => fs.mkdir(...args),
      chmod: (...args) => fs.chmod(...args),
      lstat: (...args) => fs.lstat(...args),
      open: (...args) => fs.open(...args),
      rename: async () => {
        throw new Error('fabricated private path');
      },
      unlink: (...args) => fs.unlink(...args),
    };
    const store = createLocalConfigStore({
      directory,
      platform: 'darwin',
      fileSystem: injectedFileSystem,
    });

    await assert.rejects(store.write(24681357), (error) => {
      assert.ok(error instanceof LocalConfigError);
      assert.equal(error.code, 'io_failed');
      assert.equal(error.message.includes('fabricated private path'), false);
      return true;
    });
    assert.deepEqual(await fs.readdir(directory), []);
  });
});

test('refuses a symlinked configuration file and directory', async (t) => {
  if (platform === 'win32') return t.skip('Symlink creation depends on Windows host policy.');
  await withTempDirectory(async (root) => {
    const directory = path.join(root, 'application-config');
    await fs.mkdir(directory);
    const outsideFile = path.join(root, 'outside.json');
    await fs.writeFile(outsideFile, JSON.stringify({ expectedShopId: 24681357 }), 'utf8');
    await fs.symlink(outsideFile, path.join(directory, 'config.json'));
    const fileLinkStore = createLocalConfigStore({ directory, platform: 'darwin' });
    await assert.rejects(fileLinkStore.read(), { name: 'LocalConfigError', code: 'unsafe_path' });

    const directoryLink = path.join(root, 'config-link');
    await fs.symlink(directory, directoryLink, 'dir');
    const directoryLinkStore = createLocalConfigStore({
      directory: directoryLink,
      platform: 'darwin',
    });
    await assert.rejects(directoryLinkStore.write(24681357), {
      name: 'LocalConfigError',
      code: 'unsafe_path',
    });
  });
});
