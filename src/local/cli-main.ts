import { mkdir } from 'node:fs/promises';
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
    !['guided', 'setup', 'connect', 'lookup', 'reset'].includes(args[0] ?? '')
  ) {
    process.stderr.write(
      'Usage: local guided | local lookup | local setup | local connect | local reset\n',
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
  const directory = resolveLocalConfigDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lease = await acquireRefreshLock({ directory });
  let output = '';
  await withRefreshLease(lease, async () => {
    const configStore = createLocalConfigStore();
    const secretStore = createOsSecretStore();
    if (args[0] === 'reset') {
      const confirmation = await hidden(
        'Remove this Mac’s local app credentials, tokens, and shop setting? Type RESET to continue: ',
      );
      const result = await resetLocalSetup({
        confirmation,
        secretStore,
        deleteConfig: () => configStore.delete(),
        clearTokenState: () => createRefreshStateStore({ directory }).clear(lease),
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
            createRefreshStateStore({ directory }).read(lease),
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
          receiverFactory: startCallbackReceiver,
          openBrowser: async (url) => {
            if (url !== LOCAL_START_URL) throw new Error('Invalid local authorization URL.');
            await openLocalAuthorization();
          },
          tokenFetch: (url, init) => globalThis.fetch(url, init),
          shopFetch: globalThis.fetch,
        });
      },
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
