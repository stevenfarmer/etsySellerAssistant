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
  assert.match(PRIVATE_SETUP_PROMPT, /Save this exact document\?/);
  assert.match(PRIVATE_SETUP_PROMPT, /ownerConfirmed:true/);
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

test('save tool requires an owner-confirmation assertion before creating the private file', async () => {
  await fixture(async ({ repositoryDirectory, directory }) => {
    const writer = createPrivatePlaybookWriter({ repositoryDirectory, directory });
    const save = registeredTools(writer).get('save_private_guidance').handler;
    const text = '# Fabricated owner-reviewed draft\n';

    const missing = await save({ content: text });
    assert.equal(missing.isError, true);
    assert.match(missing.content[0].text, /explicit Save choice/i);
    const declined = await save({ content: text, ownerConfirmed: false });
    assert.equal(declined.isError, true);
    assert.match(declined.content[0].text, /explicit Save choice/i);
    await assert.rejects(fs.stat(path.join(directory, PRIVATE_PLAYBOOK_FILENAME)), {
      code: 'ENOENT',
    });

    const saved = await save({ content: text, ownerConfirmed: true });
    assert.equal(saved.isError, undefined);
    assert.equal(await fs.readFile(path.join(directory, PRIVATE_PLAYBOOK_FILENAME), 'utf8'), text);
    assert.match(saved.content[0].text, /remains off/);
    assert.equal(JSON.stringify(saved).includes(text), false);
    await assert.rejects(writer.create('Replacement must not overwrite.'), {
      code: 'already_exists',
    });
    assert.equal(await fs.readFile(path.join(directory, PRIVATE_PLAYBOOK_FILENAME), 'utf8'), text);
  });
});

test('save tool sanitizes private-storage failures after owner confirmation', async () => {
  let createCalls = 0;
  const save = registeredTools({
    async create() {
      createCalls += 1;
      throw new PlaybookError('unsafe_path');
    },
  }).get('save_private_guidance').handler;
  const result = await save({ content: 'Fabricated.', ownerConfirmed: true });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /not safe to use/);
  assert.equal(JSON.stringify(result).includes('Fabricated.'), false);
  assert.equal(createCalls, 1);
});
