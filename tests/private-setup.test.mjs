import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import test from 'node:test';
import { PRIVATE_SETUP_PROMPT } from '../dist/src/guidance/private-setup-prompt.js';
import { registerPrivateSetupTools } from '../dist/src/mcp/private-setup-tools.js';
import { createPrivatePlaybookWriter } from '../dist/src/local/private-playbook-writer.js';
import { PRIVATE_PLAYBOOK_FILENAME, PlaybookError } from '../dist/src/local/private-playbook.js';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-private-setup-'));
  const repositoryDirectory = path.join(root, 'checkout');
  const directory = path.join(root, 'private-guidance');
  await fs.mkdir(repositoryDirectory);
  try {
    await run({ root, repositoryDirectory, directory });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function registeredTools(writer) {
  const tools = new Map();
  registerPrivateSetupTools(
    {
      registerTool(name, definition, handler) {
        tools.set(name, { definition, handler });
      },
    },
    writer,
  );
  return tools;
}

test('setup prompt explains disclosure, tailored interview, research boundaries and explicit save/activation steps', () => {
  assert.match(PRIVATE_SETUP_PROMPT, /Before asking any questions/);
  assert.match(PRIVATE_SETUP_PROMPT, /generic non-identifying queries/);
  assert.match(PRIVATE_SETUP_PROMPT, /asking prices from completed-sale evidence/);
  assert.match(PRIVATE_SETUP_PROMPT, /separately ask in chat/);
  const tools = registeredTools({ async create() {} });
  assert.equal(tools.has('get_private_guidance_setup'), true);
  assert.equal(tools.has('save_private_guidance'), true);
});

test('fixed writer creates private file once and preserves it on a second attempt', async () => {
  await fixture(async ({ repositoryDirectory, directory }) => {
    const writer = createPrivatePlaybookWriter({ repositoryDirectory, directory });
    const text = '# Owner-approved fabricated guidance\n\nOnly a test fixture.\n';
    await writer.create(text);
    const filename = path.join(directory, PRIVATE_PLAYBOOK_FILENAME);
    assert.equal(await fs.readFile(filename, 'utf8'), text);
    if (process.platform !== 'win32') {
      assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
      assert.equal((await fs.stat(filename)).mode & 0o777, 0o600);
    }
    await assert.rejects(writer.create('Replacement must not overwrite.'), (error) => {
      assert.ok(error instanceof PlaybookError);
      assert.equal(error.code, 'already_exists');
      return true;
    });
    assert.equal(await fs.readFile(filename, 'utf8'), text);
  });
});

test('fixed writer rejects unsafe content and any destination inside the repository', async () => {
  await fixture(async ({ repositoryDirectory, directory }) => {
    const writer = createPrivatePlaybookWriter({ repositoryDirectory, directory });
    await assert.rejects(writer.create(' \n\t'), { code: 'invalid_content' });
    await assert.rejects(writer.create(`x${'a'.repeat(65_536)}`), { code: 'invalid_content' });
    const insideRepo = createPrivatePlaybookWriter({
      repositoryDirectory,
      directory: path.join(repositoryDirectory, 'private'),
    });
    await assert.rejects(insideRepo.create('Fabricated.'), { code: 'unsafe_path' });
  });
});

test('save tool waits for exact host confirmation and writes only after acceptance', async () => {
  await fixture(async ({ repositoryDirectory, directory }) => {
    const writer = createPrivatePlaybookWriter({ repositoryDirectory, directory });
    const tools = registeredTools(writer);
    const save = tools.get('save_private_guidance').handler;
    const text = '# Fabricated owner-reviewed draft\n';
    let confirmation;
    const denied = await save(
      { content: text },
      {
        mcpReq: {
          async elicitInput(input) {
            confirmation = input;
            return { action: 'decline' };
          },
        },
      },
    );
    assert.equal(denied.isError, true);
    assert.match(confirmation.message, /# Fabricated owner-reviewed draft/);
    await assert.rejects(fs.stat(path.join(directory, PRIVATE_PLAYBOOK_FILENAME)), {
      code: 'ENOENT',
    });

    const accepted = await save(
      { content: text },
      {
        mcpReq: {
          async elicitInput(input) {
            confirmation = input;
            return { action: 'accept' };
          },
        },
      },
    );
    assert.equal(accepted.isError, undefined);
    assert.equal(await fs.readFile(path.join(directory, PRIVATE_PLAYBOOK_FILENAME), 'utf8'), text);
    assert.match(confirmation.message, /Etsy is unchanged and private guidance stays off/);
    assert.equal(JSON.stringify(accepted).includes(text), false);
  });
});

test('save tool does not write when confirmation is unavailable and sanitizes failures', async () => {
  let createCalls = 0;
  const tools = registeredTools({
    async create() {
      createCalls += 1;
      throw new PlaybookError('unsafe_path');
    },
  });
  const save = tools.get('save_private_guidance').handler;
  const unavailable = await save(
    { content: 'Fabricated.' },
    {
      mcpReq: {
        async elicitInput() {
          throw new Error('provider detail');
        },
      },
    },
  );
  assert.equal(unavailable.isError, true);
  assert.match(unavailable.content[0].text, /confirmation could not be opened/i);
  assert.equal(JSON.stringify(unavailable).includes('provider detail'), false);
  assert.equal(createCalls, 0);
  const unsafe = await save(
    { content: 'Fabricated.' },
    {
      mcpReq: {
        async elicitInput() {
          return { action: 'accept' };
        },
      },
    },
  );
  assert.equal(unsafe.isError, true);
  assert.match(unsafe.content[0].text, /not safe to use/);
  assert.equal(JSON.stringify(unsafe).includes('Fabricated.'), false);
  assert.equal(createCalls, 1);
});
