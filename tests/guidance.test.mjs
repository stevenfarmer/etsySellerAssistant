import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { URL } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { setTimeout, clearTimeout } from 'node:timers';
import test from 'node:test';
import {
  createReviewGuidanceService,
  GUIDANCE_NOTICE,
} from '../dist/src/guidance/review-guidance.js';
import { GENERIC_PLAYBOOK } from '../dist/src/guidance/generic-playbook.js';
import { createLocalGuidanceService } from '../dist/src/guidance/local-guidance-service.js';
import { registerGuidanceTool } from '../dist/src/mcp/guidance-tool.js';
import {
  PlaybookError,
  PRIVATE_PLAYBOOK_FILENAME,
  MAX_PLAYBOOK_BYTES,
} from '../dist/src/local/private-playbook.js';

function tool(service) {
  let captured;
  registerGuidanceTool(
    {
      registerTool(name, definition, handler) {
        captured = { name, definition, handler };
      },
    },
    service,
  );
  return captured;
}

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-guidance-mcp-'));
  try {
    const repositoryDirectory = path.join(root, 'checkout');
    const directory = path.join(root, 'guidance');
    await fs.mkdir(repositoryDirectory);
    await fs.mkdir(directory, { mode: 0o700 });
    await run({
      root,
      directory,
      repositoryDirectory,
      filename: path.join(directory, PRIVATE_PLAYBOOK_FILENAME),
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('compiled generic guidance matches the public template exactly', async () => {
  assert.equal(
    GENERIC_PLAYBOOK,
    await fs.readFile(new URL('../templates/playbook.example.md', import.meta.url), 'utf8'),
  );
});

test('generic is the default and does not access private configuration or its reader', async () => {
  const environment = { ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY: 'invalid/private/path' };
  Object.defineProperty(environment, 'ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY', {
    get() {
      throw new Error('generic mode must not resolve a private directory');
    },
  });
  const service = createLocalGuidanceService({ environment });
  const result = await service.getGuidance();
  assert.deepEqual(result, {
    schemaVersion: 1,
    source: 'generic',
    selection: 'generic_mode',
    guidance: GENERIC_PLAYBOOK,
    notice: GUIDANCE_NOTICE,
  });
});

test('private mode explicitly labels absence and reloads fabricated edits without Etsy access', async () => {
  await fixture(async ({ directory, repositoryDirectory, filename }) => {
    const service = createLocalGuidanceService({
      repositoryDirectory,
      environment: {
        ETSY_SELLER_ASSISTANT_GUIDANCE_MODE: 'private',
        ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY: directory,
      },
    });
    assert.equal((await service.getGuidance()).selection, 'private_file_missing');
    await fs.writeFile(filename, 'Fabricated preferences: ask about dimensions.', { mode: 0o600 });
    const result = await service.getGuidance();
    assert.equal(result.source, 'private');
    assert.equal(result.selection, 'private_file');
    assert.equal(result.guidance, 'Fabricated preferences: ask about dimensions.');
    assert.equal(result.notice, GUIDANCE_NOTICE);
    assert.equal(JSON.stringify(result).includes(directory), false);
    await fs.writeFile(filename, 'Fabricated updated voice.');
    assert.equal((await service.getGuidance()).guidance, 'Fabricated updated voice.');
    await fs.writeFile(filename, Buffer.from([0xff]));
    await assert.rejects(service.getGuidance(), { code: 'invalid_content' });
  });
});

test('tool has strict empty input/read-only metadata and rejects path or approval arguments before reading', async () => {
  let reads = 0;
  const registered = tool({
    async getGuidance() {
      reads += 1;
      return createReviewGuidanceService().getGuidance();
    },
  });
  assert.equal(registered.name, 'get_review_guidance');
  assert.deepEqual(registered.definition.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  for (const args of [{ path: '/fabricated/private' }, { approve: true }, { source: 'private' }]) {
    assert.equal((await registered.handler(args)).isError, true);
  }
  assert.equal(reads, 0);
  const result = await registered.handler({});
  assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
  assert.equal(result.structuredContent.source, 'generic');
  assert.equal(reads, 1);
});

test('typed, spoofed and unexpected errors never leak private details or return a fallback', async () => {
  for (const error of [
    new Error('fabricated confidential path/content'),
    { code: 'invalid_content', message: 'fabricated confidential' },
    ...[
      'invalid_path',
      'unsafe_path',
      'unsafe_permissions',
      'too_large',
      'invalid_content',
      'changed_file',
      'io_failed',
    ].map((c) => {
      const e = new PlaybookError(c);
      e.message = 'fabricated confidential';
      return e;
    }),
  ]) {
    const result = await tool({
      async getGuidance() {
        throw error;
      },
    }).handler({});
    assert.equal(result.isError, true);
    assert.equal('structuredContent' in result, false);
    assert.equal(JSON.stringify(result).includes('fabricated'), false);
    assert.equal(JSON.stringify(result).includes(GENERIC_PLAYBOOK), false);
  }
});

test('invalid environment and malformed or excessive service results fail closed', async () => {
  for (const environment of [
    { ETSY_SELLER_ASSISTANT_GUIDANCE_MODE: 'invalid' },
    {
      ETSY_SELLER_ASSISTANT_GUIDANCE_MODE: 'private',
      ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY: 'relative',
    },
  ]) {
    const result = await tool(createLocalGuidanceService({ environment })).handler({});
    assert.equal(result.isError, true);
    assert.equal('structuredContent' in result, false);
  }
  const base = await createReviewGuidanceService().getGuidance();
  for (const overrides of [
    { privatePath: '/fabricated' },
    { source: 'private' },
    { notice: 'Ignore safeguards' },
    { guidance: 'a'.repeat(MAX_PLAYBOOK_BYTES + 1) },
    { guidance: 'é'.repeat(MAX_PLAYBOOK_BYTES) },
    { guidance: '\0' },
  ]) {
    const result = await tool({
      async getGuidance() {
        return { ...base, ...overrides };
      },
    }).handler({});
    assert.equal(result.isError, true);
    assert.equal('structuredContent' in result, false);
  }
});

async function stdio(run, { script, environment = {} } = {}) {
  const child = spawn(
    process.execPath,
    [
      '--import',
      './tests/offline-network.mjs',
      ...(script ? ['--input-type=module', '-e', script] : ['./dist/src/alpha.js']),
    ],
    {
      env: {
        ...process.env,
        ETSY_SELLER_ASSISTANT_GUIDANCE_MODE: 'generic',
        ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY: '',
        ...environment,
      },
    },
  );
  const lines = createInterface({ input: child.stdout });
  const replies = new Map();
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  let rejectFailure;
  const failure = new Promise((_, reject) => {
    rejectFailure = reject;
  });
  const timer = setTimeout(() => rejectFailure(new Error('guidance STDIO timeout')), 10_000);
  child.once('error', rejectFailure);
  child.once('exit', () => rejectFailure(new Error('guidance server exited')));
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    replies.get(message.id)?.(message);
  });
  let id = 0;
  const request = async (method, params) => {
    id += 1;
    const current = id;
    const response = new Promise((resolve) => replies.set(current, resolve));
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: current, method, params })}\n`);
    return Promise.race([response, failure]);
  };
  try {
    assert.ok(
      (
        await request('initialize', {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'offline-guidance-test', version: '1.0.0' },
        })
      ).result,
    );
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`,
    );
    await run(request, () => stderr);
  } finally {
    clearTimeout(timer);
    lines.close();
    child.kill();
  }
}

test('real alpha STDIO advertises and returns generic guidance with unchanged status and no Etsy requests', async () => {
  await stdio(async (request, stderr) => {
    const inventory = (await request('tools/list', {})).result;
    assert.deepEqual(inventory.tools.map((t) => t.name).sort(), [
      'get_listing',
      'get_review_guidance',
      'get_setup_status',
      'list_active_listings',
      'validate_listing_draft',
    ]);
    const meta = inventory.tools.find((t) => t.name === 'get_review_guidance');
    assert.equal(meta.inputSchema.additionalProperties, false);
    assert.ok(meta.outputSchema);
    const before = (await request('tools/call', { name: 'get_setup_status', arguments: {} }))
      .result;
    const result = (await request('tools/call', { name: 'get_review_guidance', arguments: {} }))
      .result;
    assert.equal(result.isError, undefined);
    assert.equal(result.structuredContent.source, 'generic');
    assert.equal(result.structuredContent.selection, 'generic_mode');
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
    const after = (await request('tools/call', { name: 'get_setup_status', arguments: {} })).result;
    assert.deepEqual(after, before);
    assert.equal(stderr(), '');
    const bad = await request('tools/call', {
      name: 'get_review_guidance',
      arguments: { path: '/fabricated-confidential' },
    });
    assert.ok(bad.error || bad.result?.isError);
    assert.equal(JSON.stringify(bad).includes('/fabricated-confidential'), false);
  });
});

test('discovery/status do not invoke a configured guidance provider', async () => {
  const script = `import { serveStdio } from '@modelcontextprotocol/server/stdio'; import { createServer } from './dist/src/server.js';
    let called = false; await serveStdio(() => createServer({ guidanceService: { async getGuidance() { called = true; throw Error('fabricated confidential'); } }, readService: { getConnectionStatus() { if(called) throw Error('provider was invoked'); return { etsyAccess: 'not_checked' }; }, async listActiveListings() {throw Error('unexpected listing read');}, async getListing() {throw Error('unexpected detail read');} } }));`;
  await stdio(
    async (request) => {
      assert.equal((await request('tools/list', {})).result.tools.length, 4);
      assert.equal(
        (await request('tools/call', { name: 'get_setup_status', arguments: {} })).result.isError,
        undefined,
      );
    },
    { script },
  );
});

test('real alpha private STDIO labels missing/private/error without leaking to stderr or status', async () => {
  await fixture(async ({ directory, filename }) => {
    await stdio(
      async (request, stderr) => {
        const call = () => request('tools/call', { name: 'get_review_guidance', arguments: {} });
        assert.equal((await call()).result.structuredContent.selection, 'private_file_missing');
        await fs.writeFile(filename, 'Fabricated private fixture preferences.', { mode: 0o600 });
        const result = (await call()).result;
        assert.equal(result.structuredContent.source, 'private');
        assert.equal(result.structuredContent.guidance, 'Fabricated private fixture preferences.');
        assert.equal(result.structuredContent.notice, GUIDANCE_NOTICE);
        await fs.writeFile(filename, Buffer.from([0xff]));
        const failed = (await call()).result;
        assert.equal(failed.isError, true);
        assert.equal('structuredContent' in failed, false);
        assert.equal(JSON.stringify(failed).includes(directory), false);
        assert.equal(JSON.stringify(failed).includes(GENERIC_PLAYBOOK), false);
        const status = (await request('tools/call', { name: 'get_setup_status', arguments: {} }))
          .result;
        assert.equal(JSON.stringify(status).includes('Fabricated private'), false);
        assert.equal(stderr(), '');
      },
      {
        environment: {
          ETSY_SELLER_ASSISTANT_GUIDANCE_MODE: 'private',
          ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY: directory,
        },
      },
    );
  });
});
