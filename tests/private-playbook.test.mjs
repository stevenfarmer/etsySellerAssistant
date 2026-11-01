import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  createPrivatePlaybookReader,
  resolvePrivatePlaybookDirectory,
  PRIVATE_PLAYBOOK_FILENAME,
  MAX_PLAYBOOK_BYTES,
  PlaybookError,
} from '../dist/src/local/private-playbook.js';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-playbook-test-'));
  try {
    const repositoryDirectory = path.join(root, 'checkout');
    const directory = path.join(root, 'private-guidance');
    await fs.mkdir(repositoryDirectory);
    await fs.mkdir(directory, { mode: 0o700 });
    const filename = path.join(directory, PRIVATE_PLAYBOOK_FILENAME);
    const options = { repositoryDirectory, directory };
    await run({ root, filename, options, reader: createPrivatePlaybookReader(options) });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

const expectCode = (code) => (error) => {
  assert.ok(error instanceof PlaybookError);
  assert.equal(error.code, code);
  assert.equal(error.message, `Private guidance could not be loaded (${code}).`);
  assert.equal(error.cause, undefined);
  return true;
};

test('resolves private local defaults or an explicit directory without file I/O', () => {
  assert.equal(
    resolvePrivatePlaybookDirectory({
      platform: 'darwin',
      homeDirectory: '/fabricated/home',
      path: path.posix,
    }),
    '/fabricated/home/Library/Application Support/etsySellerAssistant/guidance',
  );
  assert.equal(
    resolvePrivatePlaybookDirectory({ directory: path.resolve('fabricated-private') }),
    path.resolve('fabricated-private'),
  );
  assert.equal(
    resolvePrivatePlaybookDirectory({
      platform: 'win32',
      localAppData: 'C:\\Fabricated\\Local',
      path: path.win32,
    }),
    'C:\\Fabricated\\Local\\etsySellerAssistant\\guidance',
  );
  const noIo = async () => {
    throw new Error('unexpected I/O');
  };
  createPrivatePlaybookReader({
    directory: path.resolve('fabricated-private'),
    repositoryDirectory: path.resolve('checkout'),
    fileSystem: { lstat: noIo, realpath: noIo, open: noIo },
  });
  for (const directory of ['', 'relative', `${path.sep}bad\0path`]) {
    assert.throws(
      () => createPrivatePlaybookReader({ directory, repositoryDirectory: path.resolve('.') }),
      expectCode('invalid_path'),
    );
  }
});

test('missing guidance returns absence without creating or modifying files', async () => {
  await fixture(async ({ options, reader }) => {
    assert.equal(await reader.read(), undefined);
    assert.deepEqual(await fs.readdir(options.directory), []);
    await fs.rmdir(options.directory);
    assert.equal(await reader.read(), undefined);
    await assert.rejects(fs.stat(options.directory), { code: 'ENOENT' });
  });
});

test('explicit reads preserve UTF-8 content, reload edits and never overwrite customization', async () => {
  await fixture(async ({ filename, reader }) => {
    const first = '# Fabricated preferences\nUse a calm café tone.\n';
    await fs.writeFile(filename, first, { mode: 0o600 });
    assert.equal(await reader.read(), first);
    const second = '# Fabricated replacement\nAsk about unknown dimensions.\n';
    await fs.writeFile(filename, second);
    assert.equal(await reader.read(), second);
    assert.equal(await fs.readFile(filename, 'utf8'), second);
    assert.deepEqual(await fs.readdir(path.dirname(filename)), [PRIVATE_PLAYBOOK_FILENAME]);
  });
});

test('accepts the exact byte limit and rejects oversized or invalid content', async () => {
  await fixture(async ({ filename, reader }) => {
    await fs.writeFile(filename, 'a'.repeat(MAX_PLAYBOOK_BYTES), { mode: 0o600 });
    assert.equal((await reader.read()).length, MAX_PLAYBOOK_BYTES);
    for (const [data, code] of [
      ['a'.repeat(MAX_PLAYBOOK_BYTES + 1), 'too_large'],
      ['é'.repeat(MAX_PLAYBOOK_BYTES), 'too_large'],
      ['', 'invalid_content'],
      [' \n\t', 'invalid_content'],
      [Buffer.from([0xc3, 0x28]), 'invalid_content'],
      ['bad\0data', 'invalid_content'],
      ['bad\u001bdata', 'invalid_content'],
    ]) {
      await fs.writeFile(filename, data);
      await assert.rejects(reader.read(), expectCode(code));
    }
    await fs.writeFile(filename, '\ufeff# Valid BOM\r\nTab\there\n');
    assert.equal(await reader.read(), '# Valid BOM\r\nTab\there\n');
  });
});

test('refuses own checkout placement and another worktree before opening guidance', async () => {
  await fixture(async ({ root, options }) => {
    assert.throws(
      () => createPrivatePlaybookReader({ ...options, directory: options.repositoryDirectory }),
      expectCode('unsafe_path'),
    );
    const other = path.join(root, 'other-checkout');
    await fs.mkdir(other, { mode: 0o700 });
    await fs.writeFile(path.join(other, '.git'), 'gitdir: fabricated\n');
    const reader = createPrivatePlaybookReader({
      ...options,
      directory: other,
      fileSystem: {
        ...fs,
        open: async () => {
          assert.fail('must reject before opening guidance');
        },
      },
    });
    await assert.rejects(reader.read(), expectCode('unsafe_path'));
  });
});

test('rejects symbolic links and resolved aliases into the checkout', async (t) => {
  if (process.platform === 'win32') {
    t.skip('symlink creation requires separate OS privilege');
    return;
  }
  await fixture(async ({ root, filename, options, reader }) => {
    const target = path.join(root, 'fabricated-target');
    await fs.writeFile(target, 'fabricated content', { mode: 0o600 });
    await fs.symlink(target, filename);
    await assert.rejects(reader.read(), expectCode('unsafe_path'));
    const alias = path.join(root, 'alias');
    await fs.symlink(options.directory, alias);
    await assert.rejects(
      createPrivatePlaybookReader({ ...options, directory: alias }).read(),
      expectCode('unsafe_path'),
    );
    const child = path.join(options.repositoryDirectory, 'child');
    await fs.mkdir(child, { mode: 0o700 });
    const parentAlias = path.join(root, 'parent-alias');
    await fs.symlink(options.repositoryDirectory, parentAlias);
    await assert.rejects(
      createPrivatePlaybookReader({
        ...options,
        directory: path.join(parentAlias, 'child'),
      }).read(),
      expectCode('unsafe_path'),
    );
  });
});

test('rejects hard-linked and non-regular targets', async () => {
  await fixture(async ({ root, filename, reader }) => {
    await fs.mkdir(filename);
    await assert.rejects(reader.read(), expectCode('unsafe_path'));
    await fs.rmdir(filename);
    const target = path.join(root, 'fabricated-target');
    await fs.writeFile(target, 'fabricated content', { mode: 0o600 });
    await fs.link(target, filename);
    await assert.rejects(reader.read(), expectCode('unsafe_path'));
  });
});

test('rejects shared POSIX permissions and unexpected ownership', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX ownership/mode rules');
    return;
  }
  await fixture(async ({ filename, options, reader }) => {
    await fs.writeFile(filename, 'fabricated', { mode: 0o600 });
    await fs.chmod(filename, 0o644);
    await assert.rejects(reader.read(), expectCode('unsafe_permissions'));
    await fs.chmod(filename, 0o600);
    await fs.chmod(options.directory, 0o755);
    await assert.rejects(reader.read(), expectCode('unsafe_permissions'));
    await fs.chmod(options.directory, 0o700);
    const wrongOwner = createPrivatePlaybookReader({
      ...options,
      fileSystem: {
        ...fs,
        async lstat(location) {
          const info = await fs.lstat(location);
          info.uid = process.getuid() + 1;
          return info;
        },
      },
    });
    await assert.rejects(wrongOwner.read(), expectCode('unsafe_permissions'));
  });
});

function wrappedReader(options, modify) {
  return createPrivatePlaybookReader({
    ...options,
    fileSystem: {
      ...fs,
      async open(location, flags) {
        assert.equal(
          flags & (constants.O_CREAT | constants.O_TRUNC | constants.O_WRONLY | constants.O_RDWR),
          0,
        );
        const handle = await fs.open(location, flags);
        return modify(handle);
      },
    },
  });
}

test('bounded reads detect growth after stat without allocating unbounded content', async () => {
  await fixture(async ({ filename, options }) => {
    await fs.writeFile(filename, 'fabricated', { mode: 0o600 });
    let bytesRequested = 0;
    const reader = wrappedReader(options, (h) => ({
      stat: () => h.stat(),
      close: () => h.close(),
      async read(buffer, offset, length) {
        bytesRequested += length;
        buffer.fill(97, offset, offset + length);
        return { bytesRead: length };
      },
    }));
    await assert.rejects(reader.read(), expectCode('too_large'));
    assert.equal(bytesRequested, MAX_PLAYBOOK_BYTES + 1);
  });
});

test('detects substituted identity and modified files during reads', async () => {
  await fixture(async ({ filename, options }) => {
    await fs.writeFile(filename, 'fabricated', { mode: 0o600 });
    for (const kind of ['identity', 'modified']) {
      let stats = 0;
      const reader = wrappedReader(options, (h) => ({
        read: (...args) => h.read(...args),
        close: () => h.close(),
        async stat() {
          const info = await h.stat();
          stats += 1;
          if (kind === 'identity') info.ino += 1;
          else if (stats === 2) info.mtimeMs += 1;
          return info;
        },
      }));
      await assert.rejects(reader.read(), expectCode('changed_file'));
    }
  });
});

test('sanitizes I/O errors and reports cleanup failure without masking the primary error', async () => {
  await fixture(async ({ filename, options }) => {
    await fs.writeFile(filename, 'fabricated', { mode: 0o600 });
    for (const failRead of [true, false]) {
      const reader = wrappedReader(options, (h) => ({
        stat: () => h.stat(),
        read: (...args) =>
          failRead ? Promise.reject(new Error('fabricated private path/content')) : h.read(...args),
        async close() {
          await h.close();
          throw new Error('fabricated cleanup details');
        },
      }));
      await assert.rejects(reader.read(), expectCode('io_failed'));
    }
    await fs.writeFile(filename, Buffer.from([0xff]));
    const reader = wrappedReader(options, (h) => ({
      stat: () => h.stat(),
      read: (...args) => h.read(...args),
      async close() {
        await h.close();
        throw new Error('fabricated cleanup details');
      },
    }));
    await assert.rejects(reader.read(), expectCode('invalid_content'));
    const inaccessible = createPrivatePlaybookReader({
      ...options,
      fileSystem: {
        ...fs,
        realpath: async () => {
          throw new Error('fabricated confidential path');
        },
      },
    });
    await assert.rejects(inaccessible.read(), expectCode('io_failed'));
  });
});

test('private filenames are Git-ignored while the generic template is publishable', () => {
  const files = ['playbook.private.md', 'nested/custom.playbook.private.md'];
  const ignored = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], {
    input: `${files.join('\n')}\n`,
    encoding: 'utf8',
  })
    .trim()
    .split('\n');
  assert.deepEqual(ignored, files);
  assert.throws(
    () =>
      execFileSync('git', ['check-ignore', '--no-index', 'templates/playbook.example.md'], {
        stdio: 'pipe',
      }),
    { status: 1 },
  );
});
