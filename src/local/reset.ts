import type { SecretStore } from '../secret-store.js';

/** Explicitly remove this machine's app credentials, tokens, and settings. */
export async function resetLocalSetup(options: {
  readonly confirmation: string;
  readonly secretStore: SecretStore;
  readonly deleteConfig: () => Promise<void>;
  readonly clearTokenState: () => Promise<void>;
}): Promise<'reset' | 'cancelled' | 'failed'> {
  if (options.confirmation !== 'RESET') return 'cancelled';
  try {
    for (const key of ['accessToken', 'refreshToken', 'appKeystring', 'appSharedSecret'] as const) {
      await options.secretStore.delete(key);
    }
    await options.clearTokenState();
    await options.deleteConfig();
    return 'reset';
  } catch {
    return 'failed';
  }
}
