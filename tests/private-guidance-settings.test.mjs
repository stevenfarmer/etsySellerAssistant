import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import process from 'node:process';
import test from 'node:test';
import {
  createPrivateGuidanceSettingsStore,
  PRIVATE_GUIDANCE_SETTINGS_FILENAME,
} from '../dist/src/local/private-guidance-settings.js';

async function fixture(run) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'etsy-guidance-settings-'));
  const repositoryDirectory = path.join(root, 'checkout');
  const settingsDirectory = path.join(root, 'settings');
  await fs.mkdir(repositoryDirectory);
  try {
    await run({ root, repositoryDirectory, settingsDirectory });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('activation defaults off without creating local state', async () => {
  await fixture(async ({ repositoryDirectory, settingsDirectory }) => {
    const settings = createPrivateGuidanceSettingsStore({
      repositoryDirectory,
      directory: settingsDirectory,
    });
    assert.equal(await settings.isEnabled(), false);
    await assert.rejects(fs.stat(settingsDirectory), { code: 'ENOENT' });
  });
});

test('activation preference persists privately without reading or changing guidance text', async () => {
  await fixture(async ({ root, repositoryDirectory, settingsDirectory }) => {
    const settings = createPrivateGuidanceSettingsStore({
      repositoryDirectory,
      directory: settingsDirectory,
    });
    const guidanceDirectory = path.join(root, 'guidance');
    await fs.mkdir(guidanceDirectory, { mode: 0o700 });
    const guidanceFile = path.join(guidanceDirectory, 'playbook.private.md');
    const guidance = 'Fabricated private test text.';
    await fs.writeFile(guidanceFile, guidance, { mode: 0o600 });

    await settings.setEnabled(true);
    assert.equal(await settings.isEnabled(), true);
    assert.equal(await fs.readFile(guidanceFile, 'utf8'), guidance);
    if (process.platform !== 'win32') {
      assert.equal(
        (await fs.stat(path.join(settingsDirectory, PRIVATE_GUIDANCE_SETTINGS_FILENAME))).mode &
          0o777,
        0o600,
      );
    }

    await settings.setEnabled(false);
    assert.equal(await settings.isEnabled(), false);
    assert.equal(await fs.readFile(guidanceFile, 'utf8'), guidance);
  });
});

test('activation refuses repository paths and malformed state', async () => {
  await fixture(async ({ repositoryDirectory, settingsDirectory }) => {
    assert.throws(
      () =>
        createPrivateGuidanceSettingsStore({
          repositoryDirectory,
          directory: path.join(repositoryDirectory, 'state'),
        }),
      { code: 'unsafe_path' },
    );
    const settings = createPrivateGuidanceSettingsStore({
      repositoryDirectory,
      directory: settingsDirectory,
    });
    await fs.mkdir(settingsDirectory, { mode: 0o700 });
    await fs.writeFile(
      path.join(settingsDirectory, PRIVATE_GUIDANCE_SETTINGS_FILENAME),
      '{"enabled":true}\n',
      { mode: 0o600 },
    );
    await assert.rejects(settings.isEnabled(), { code: 'invalid_settings' });
  });
});
