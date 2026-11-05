import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import process from 'node:process';
import { startCallbackReceiver } from '../auth/callback-server.js';
import { createOsSecretStore } from '../os-secret-store.js';
import { LOCAL_START_URL, openLocalAuthorization } from './browser.js';
import { isInitialTokenStateEmpty, runLocalCommand } from './commands.js';
import { createLocalConfigStore, resolveLocalConfigDirectory } from './config.js';
import { connectLocal } from './connect.js';
import { readHiddenInput } from './hidden-input.js';
import { lookupLocalShop } from './lookup.js';
import { acquireRefreshLock, createRefreshStateStore, withRefreshLease } from './refresh-lock.js';
import { resetLocalSetup } from './reset.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (
    args.length !== 1 ||
    ![
      'guided',
      'setup',
      'connect',
      'enable-edits',
      'disable-edits',
      'lookup',
      'reset',
      'set-audit-directory',
    ].includes(args[0] ?? '')
  ) {
    process.stderr.write(
      'Usage: local guided | local lookup | local setup | local connect | local enable-edits | local disable-edits | local reset | local set-audit-directory\n',
    );
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    process.stderr.write('An interactive local terminal is required.\n');
    process.exitCode = 1;
    return;
  }
  const hidden = (prompt: string): Promise<string> =>
    readHiddenInput({ input: process.stdin, output: process.stderr, prompt });
  if (args[0] === 'lookup') {
    const lookup = await lookupLocalShop({ readHiddenInput: hidden, fetch: globalThis.fetch });
    if (lookup.status === 'found') {
      process.stdout.write(`Shop ID (local only): ${lookup.shopId}\n`);
    } else {
      process.stderr.write(`Shop lookup failed (${lookup.reason}).\n`);
      process.exitCode = 1;
    }
    return;
  }
  if (args[0] === 'set-audit-directory') {
    const result = await runLocalCommand(args, {
      configStore: createLocalConfigStore(),
      secretStore: createOsSecretStore(),
      readHiddenInput: hidden,
      connect: async () => ({ status: 'failed' }),
    });
    if (result.status === 'failed') {
      process.stderr.write(`Local operation failed (${result.reason}).\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write('Local audit folder configured.\n');
    }
    return;
  }
  const directory = resolveLocalConfigDirectory();
  const profile = args[0] === 'enable-edits' || args[0] === 'disable-edits' ? 'edit' : 'read';
  const stateDirectory = profile === 'edit' ? path.join(directory, 'edit-token-state') : directory;
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const lease = await acquireRefreshLock({ directory: stateDirectory });
  let output = '';
  await withRefreshLease(lease, async () => {
    const configStore = createLocalConfigStore();
    const secretStore = createOsSecretStore();
    if (args[0] === 'reset') {
      const confirmation = await hidden(
        'Remove this Mac’s local app credentials, read/edit tokens, audit setting, and shop setting? Stop all local server instances first. Type RESET to continue: ',
      );
      const result = await resetLocalSetup({
        confirmation,
        secretStore,
        deleteConfig: () => configStore.delete(),
        clearTokenState: async () => {
          await createRefreshStateStore({ directory }).clear(lease);
          const editDirectory = path.join(directory, 'edit-token-state');
          await mkdir(editDirectory, { recursive: true, mode: 0o700 });
          const editLease = await acquireRefreshLock({ directory: editDirectory });
          await withRefreshLease(editLease, () =>
            createRefreshStateStore({ directory: editDirectory }).clear(editLease),
          );
        },
      });
      output = `Local reset ${result}.\n`;
      if (result !== 'reset') process.exitCode = 1;
      return;
    }
    const result = await runLocalCommand(args, {
      configStore,
      secretStore,
      readHiddenInput: hidden,
      lookupFetch: globalThis.fetch,
      connect: async () => {
        // An old state file may describe a different token pair. Require deliberate
        // recovery instead of trusting it for a new authorization grant.
        if (
          !(await isInitialTokenStateEmpty(() =>
            createRefreshStateStore({ directory: stateDirectory }).read(lease),
          ))
        ) {
          return { status: 'failed' };
        }
        const confirmation = await hidden(
          'This opens Etsy for listings_r consent and one shop identity check. Type CONNECT to continue: ',
        );
        if (confirmation !== 'CONNECT') return { status: 'failed' };
        return connectLocal({
          configStore,
          secretStore,
          profile,
          receiverFactory: startCallbackReceiver,
          openBrowser: async (url) => {
            if (url !== LOCAL_START_URL) throw new Error('Invalid local authorization URL.');
            await openLocalAuthorization();
          },
          tokenFetch: (url, init) => globalThis.fetch(url, init),
          shopFetch: globalThis.fetch,
        });
      },
      authorizeEdits:
        profile === 'edit'
          ? async () => {
              if (
                !(await isInitialTokenStateEmpty(() =>
                  createRefreshStateStore({ directory: stateDirectory }).read(lease),
                ))
              ) {
                return { status: 'failed' as const };
              }
              const confirmation = await hidden(
                'This opens Etsy to request separate listings_r and listings_w consent. Your read-only grant is kept unchanged. Type ENABLE EDITING to continue: ',
              );
              if (confirmation !== 'ENABLE EDITING') return { status: 'failed' as const };
              return connectLocal({
                configStore,
                secretStore,
                profile: 'edit',
                receiverFactory: startCallbackReceiver,
                openBrowser: async (url) => {
                  if (url !== LOCAL_START_URL) throw new Error('Invalid local authorization URL.');
                  await openLocalAuthorization();
                },
                tokenFetch: (url, init) => globalThis.fetch(url, init),
                shopFetch: globalThis.fetch,
              });
            }
          : undefined,
      clearEditTokenState:
        args[0] === 'disable-edits'
          ? async () => createRefreshStateStore({ directory: stateDirectory }).clear(lease)
          : undefined,
    });
    if (result.status === 'failed') {
      process.stderr.write(`Local operation failed (${result.reason}).\n`);
      process.exitCode = 1;
    } else {
      output = `Local operation ${result.status}.\n`;
    }
  });
  if (output) process.stdout.write(output);
}

void main().catch(() => {
  process.stderr.write('Local operation failed. Check local setup and retry.\n');
  process.exitCode = 1;
});
