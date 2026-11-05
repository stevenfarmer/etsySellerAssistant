import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { platform } from 'node:process';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { AuditStoreError, createLocalAuditStore } from '../dist/src/local/audit-store.js';

const PROPOSAL_ID = '123e4567-e89b-42d3-a456-426614174000';
const RECORD_IDS = [
  '123e4567-e89b-42d3-a456-426614174001',
  '123e4567-e89b-42d3-a456-426614174002',
  '123e4567-e89b-42d3-a456-426614174003',
  '123e4567-e89b-42d3-a456-426614174004',
  '123e4567-e89b-42d3-a456-426614174005',
];

function proposal(overrides = {}) {
  return {
    proposalId: PROPOSAL_ID,
    listingId: 123456789,
    ownerId: 22222222,
    shopId: 33333333,
    lastModifiedTimestamp: 1_799_999_999,
    before: { description: 'Fabricated before copy.' },
    after: { description: 'Fabricated after copy.' },
    expiresAt: 1_800_000_000_000,
    ...overrides,
  };
}

async function withAuditDirectory(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-audit-test-'));
  const directory = path.join(root, 'Drive', 'github', 'etsySellerAssistant', 'auditTrail');
  try {
    await fs.mkdir(path.dirname(directory), { recursive: true });
    await run({ root, directory });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function makeStore(directory, options = {}) {
  let idIndex = 0;
  return createLocalAuditStore({
    directory,
    now: () => new Date('2026-11-05T12:00:00.000Z'),
    createId: () => RECORD_IDS[idIndex++ % RECORD_IDS.length],
    ...options,
  });
}

test('appends intent and outcome as linked JSONL records with exact changed values', async () => {
  await withAuditDirectory(async ({ directory }) => {
    const store = makeStore(directory);
    await store.withWriter(async (writer) => {
      const receipt = await writer.appendIntent(proposal());
      await writer.appendOutcome(receipt, 'verified');
    });

    const file = path.join(directory, '2026-11.jsonl');
    const records = (await fs.readFile(file, 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(records.length, 2);
    assert.equal(records[0].recordType, 'intent');
    assert.equal(records[0].outcome, 'pending');
    assert.deepEqual(records[0].changedFields, ['description']);
    assert.deepEqual(records[0].before, { description: 'Fabricated before copy.' });
    assert.deepEqual(records[0].after, { description: 'Fabricated after copy.' });
    assert.match(records[0].proposalDigest, /^[a-f0-9]{64}$/);
    assert.equal(records[1].recordType, 'outcome');
    assert.equal(records[1].intentRecordId, records[0].recordId);
    assert.equal(records[1].proposalId, PROPOSAL_ID);
    assert.equal(records[1].outcome, 'verified');
    assert.equal(
      records
        .map((record) => JSON.stringify(record))
        .join('')
        .includes(directory),
      false,
    );
  });
});

test('uses restrictive audit directory and file modes on POSIX', async (t) => {
  if (platform === 'win32') return t.skip('POSIX mode bits are not a Windows ACL check.');
  await withAuditDirectory(async ({ directory }) => {
    await makeStore(directory).withWriter(async (writer) => writer.appendIntent(proposal()));
    assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(path.join(directory, '2026-11.jsonl'))).mode & 0o777, 0o600);
  });
});

test('rejects invalid paths, invalid fields, and unbounded private values', async () => {
  await withAuditDirectory(async ({ root, directory }) => {
    assert.throws(() => createLocalAuditStore({ directory: path.join(root, 'other') }), {
      name: 'AuditStoreError',
      code: 'invalid_path',
    });
    const store = makeStore(directory);
    for (const invalid of [
      proposal({ proposalId: 'bad-id' }),
      proposal({ after: { status: 'active' } }),
      proposal({ after: { description: 'x'.repeat(32_769) } }),
    ]) {
      await assert.rejects(
        store.withWriter(async (writer) => writer.appendIntent(invalid)),
        { name: 'AuditStoreError', code: 'invalid_record' },
      );
    }
  });
});

test('rejects a symlinked audit directory and symlinked or hard-linked monthly files', async (t) => {
  if (platform === 'win32') return t.skip('Link creation depends on Windows host policy.');
  await withAuditDirectory(async ({ root, directory }) => {
    const outside = path.join(root, 'outside.jsonl');
    await fs.writeFile(outside, '', 'utf8');
    await fs.mkdir(directory, { recursive: true });
    await fs.symlink(outside, path.join(directory, '2026-11.jsonl'));
    await assert.rejects(
      makeStore(directory).withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'unsafe_path' },
    );
    await fs.unlink(path.join(directory, '2026-11.jsonl'));
    await fs.link(outside, path.join(directory, '2026-11.jsonl'));
    await assert.rejects(
      makeStore(directory).withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'unsafe_path' },
    );

    const linkedDirectory = path.join(
      root,
      'linked-parent',
      'github',
      'etsySellerAssistant',
      'auditTrail',
    );
    await fs.mkdir(path.dirname(linkedDirectory), { recursive: true });
    await fs.symlink(directory, linkedDirectory, 'dir');
    await assert.rejects(
      makeStore(linkedDirectory).withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'unsafe_path' },
    );
  });
});

test('only one process writer can hold the audit lock at a time', async () => {
  await withAuditDirectory(async ({ directory }) => {
    const store = makeStore(directory);
    const otherInstance = makeStore(directory);
    let releaseFirst;
    let signalEntered;
    const entered = new Promise((resolve) => {
      signalEntered = resolve;
    });
    const blocked = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const first = store.withWriter(async (writer) => {
      await writer.appendIntent(proposal());
      signalEntered();
      await blocked;
    });
    await entered;
    await assert.rejects(
      otherInstance.withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'writer_busy' },
    );
    releaseFirst();
    await first;
    await store.withWriter(async (writer) => writer.appendIntent(proposal()));
  });
});

test('rotates by UTC month without overwriting or losing the intent month for its outcome', async () => {
  await withAuditDirectory(async ({ directory }) => {
    let time = new Date('2026-11-30T23:59:59.000Z');
    const store = makeStore(directory, { now: () => time });
    let receipt;
    await store.withWriter(async (writer) => {
      receipt = await writer.appendIntent(proposal());
    });
    time = new Date('2026-12-01T00:00:01.000Z');
    await store.withWriter(async (writer) => {
      await writer.appendOutcome(receipt, 'reconciled');
      await writer.appendIntent(proposal({ proposalId: '123e4567-e89b-42d3-a456-426614174099' }));
    });

    assert.equal(
      (await fs.readFile(path.join(directory, '2026-11.jsonl'), 'utf8')).trim().split('\n').length,
      2,
    );
    assert.equal(
      (await fs.readFile(path.join(directory, '2026-12.jsonl'), 'utf8')).trim().split('\n').length,
      1,
    );
  });
});

test('a torn final record fails closed; controlled recovery retains intact history', async () => {
  await withAuditDirectory(async ({ directory }) => {
    const store = makeStore(directory);
    await store.withWriter(async (writer) => writer.appendIntent(proposal()));
    const file = path.join(directory, '2026-11.jsonl');
    const firstRecord = (await fs.readFile(file, 'utf8')).split('\n')[0];
    await fs.appendFile(file, '{"truncated":', 'utf8');
    await assert.rejects(
      store.withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'corrupt_log' },
    );
    await fs.writeFile(file, `${firstRecord}\n`, 'utf8');
    await store.withWriter(async (writer) => writer.appendIntent(proposal()));
    const lines = (await fs.readFile(file, 'utf8')).trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(lines[0], firstRecord);
  });
});

test('a crash-left writer lock fails closed until manually cleared after the process stops', async () => {
  await withAuditDirectory(async ({ directory }) => {
    await fs.mkdir(path.join(directory, '.writer.lock'), { recursive: true });
    await fs.writeFile(path.join(directory, '.writer.lock', 'owner'), 'stale-owner', 'utf8');
    const store = makeStore(directory);
    await assert.rejects(
      store.withWriter(async (writer) => writer.appendIntent(proposal())),
      { name: 'AuditStoreError', code: 'writer_busy' },
    );
    await fs.rm(path.join(directory, '.writer.lock'), { recursive: true });
    await store.withWriter(async (writer) => writer.appendIntent(proposal()));
  });
});

test('failed intent storage blocks the protected operation; failed outcome storage remains visible', async () => {
  await withAuditDirectory(async ({ directory }) => {
    let auditFileOpens = 0;
    let failOnOpen = 1;
    const injectedFileSystem = {
      mkdir: (...args) => fs.mkdir(...args),
      lstat: (...args) => fs.lstat(...args),
      open: async (filePath, ...args) => {
        if (filePath.endsWith('.jsonl') && ++auditFileOpens === failOnOpen) {
          const error = new Error('private filesystem detail');
          error.code = 'EACCES';
          throw error;
        }
        return fs.open(filePath, ...args);
      },
      chmod: (...args) => fs.chmod(...args),
      unlink: (...args) => fs.unlink(...args),
      rmdir: (...args) => fs.rmdir(...args),
    };
    const store = makeStore(directory, { fileSystem: injectedFileSystem });
    let protectedOperationCalls = 0;
    await assert.rejects(
      store.withWriter(async (writer) => {
        await writer.appendIntent(proposal());
        protectedOperationCalls += 1;
      }),
      (error) => {
        assert.ok(error instanceof AuditStoreError);
        assert.equal(error.code, 'io_failed');
        assert.equal(error.message.includes('private filesystem detail'), false);
        return true;
      },
    );
    assert.equal(protectedOperationCalls, 0);

    const failedFlushFileSystem = {
      ...injectedFileSystem,
      open: async (filePath, ...args) => {
        const handle = await fs.open(filePath, ...args);
        return new Proxy(handle, {
          get(target, property) {
            if (property === 'sync' && filePath.endsWith('.jsonl')) {
              return async () => {
                const error = new Error('fabricated private flush detail');
                error.code = 'EIO';
                throw error;
              };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
          },
        });
      },
    };
    const flushStore = makeStore(directory, { fileSystem: failedFlushFileSystem });
    await assert.rejects(
      flushStore.withWriter(async (writer) => {
        await writer.appendIntent(proposal());
        protectedOperationCalls += 1;
      }),
      (error) => {
        assert.ok(error instanceof AuditStoreError);
        assert.equal(error.code, 'io_failed');
        assert.equal(error.message.includes('fabricated private flush detail'), false);
        return true;
      },
    );
    assert.equal(protectedOperationCalls, 0);

    failOnOpen = auditFileOpens + 2;
    let simulatedEtsyResult = 'not-reached';
    await assert.rejects(
      store.withWriter(async (writer) => {
        const receipt = await writer.appendIntent(proposal());
        simulatedEtsyResult = 'verified';
        await writer.appendOutcome(receipt, 'verified');
      }),
      { name: 'AuditStoreError', code: 'io_failed' },
    );
    assert.equal(simulatedEtsyResult, 'verified');
    await store.withWriter(async (writer) => writer.appendIntent(proposal()));
  });
});
