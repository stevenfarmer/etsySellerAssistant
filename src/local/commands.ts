import { configureLocalConnection } from './setup.js';
import { lookupLocalShop } from './lookup.js';
import type { LocalConfigStore } from './config.js';
import type { SecretStore } from '../secret-store.js';

export interface LocalCommandsOptions {
  readonly configStore: LocalConfigStore;
  readonly secretStore: SecretStore;
  readonly readHiddenInput: (prompt: string) => Promise<string>;
  readonly connect: () => Promise<{ readonly status: 'connected' | 'failed' }>;
  readonly lookupFetch?: (url: string, init: RequestInit) => Promise<Response>;
}

export type CommandResult =
  | { readonly status: 'configured' | 'connected' }
  | { readonly status: 'failed'; readonly reason: string };

/** A new connection must not inherit expiry information from an earlier token pair. */
export async function isInitialTokenStateEmpty(
  readState: () => Promise<unknown>,
): Promise<boolean> {
  return (await readState()) === undefined;
}

/** Local-only command dispatcher. Inputs and side effects are injectable for offline tests. */
export async function runLocalCommand(
  args: readonly string[],
  options: LocalCommandsOptions,
): Promise<CommandResult> {
  if (args.length !== 1 || !['setup', 'connect', 'guided'].includes(args[0] ?? '')) {
    return { status: 'failed', reason: 'invalid_command' };
  }
  if (args[0] === 'connect') {
    try {
      const outcome = await options.connect();
      return outcome.status === 'connected'
        ? { status: 'connected' }
        : { status: 'failed', reason: 'connection_failed' };
    } catch {
      return { status: 'failed', reason: 'connection_failed' };
    }
  }
  if (args[0] === 'guided') {
    if (!options.lookupFetch) return { status: 'failed', reason: 'lookup_unavailable' };
    try {
      if ((await options.configStore.read()) !== undefined)
        return { status: 'failed', reason: 'already_configured' };
      for (const key of [
        'appKeystring',
        'appSharedSecret',
        'accessToken',
        'refreshToken',
      ] as const) {
        if ((await options.secretStore.get(key)) !== undefined)
          return { status: 'failed', reason: 'existing_credentials' };
      }
    } catch {
      return { status: 'failed', reason: 'state_check_failed' };
    }
    const entries: string[] = [];
    const lookup = await lookupLocalShop({
      fetch: options.lookupFetch,
      readHiddenInput: async (prompt) => {
        const value = await options.readHiddenInput(prompt);
        entries.push(value);
        return value;
      },
    });
    if (lookup.status !== 'found') return { status: 'failed', reason: lookup.reason };
    let index = 1;
    const setup = await configureLocalConnection({
      expectedShopId: lookup.shopId,
      configStore: options.configStore,
      secretStore: options.secretStore,
      readHiddenInput: async () => {
        const value = entries[index++];
        if (value === undefined) throw new Error('Missing local input.');
        return value;
      },
    });
    return setup.status === 'configured'
      ? { status: 'configured' }
      : { status: 'failed', reason: setup.reason };
  }
  let identity: string;
  try {
    identity = await options.readHiddenInput('Expected numeric shop ID: ');
  } catch {
    return { status: 'failed', reason: 'input_failed' };
  }
  if (!/^[1-9][0-9]*$/.test(identity) || !Number.isSafeInteger(Number(identity))) {
    return { status: 'failed', reason: 'invalid_shop_id' };
  }
  const setup = await configureLocalConnection({
    expectedShopId: Number(identity),
    configStore: options.configStore,
    secretStore: options.secretStore,
    readHiddenInput: options.readHiddenInput,
  });
  return setup.status === 'configured'
    ? { status: 'configured' }
    : { status: 'failed', reason: setup.reason };
}
