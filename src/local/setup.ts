import type { LocalConfigStore } from './config.js';
import type { SecretStore } from '../secret-store.js';

export type LocalSetupFailureCode =
  | 'invalid_shop_id'
  | 'already_configured'
  | 'existing_credentials'
  | 'state_check_failed'
  | 'input_failed'
  | 'invalid_secret'
  | 'secret_store_failed'
  | 'partial_secret_store_failed'
  | 'config_store_failed';

export type LocalSetupResult =
  | { readonly status: 'configured' }
  | { readonly status: 'failed'; readonly reason: LocalSetupFailureCode };

export interface LocalSetupOptions {
  /** A hidden terminal reader adapter; secrets are never accepted as arguments to this flow. */
  readonly readHiddenInput: (prompt: string) => Promise<string>;
  readonly configStore: LocalConfigStore;
  readonly secretStore: SecretStore;
  /** Non-secret expected shop identity entered through the local setup flow. */
  readonly expectedShopId: number;
}

const KEYSTRING_PROMPT = 'Etsy API keystring: ';
const SHARED_SECRET_PROMPT = 'Etsy app shared secret: ';
const MAX_SECRET_LENGTH = 4096;

function isValidSecret(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_SECRET_LENGTH &&
    value.trim().length > 0 &&
    !hasControlCharacters(value)
  );
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 32 || (codePoint >= 127 && codePoint <= 159)) return true;
  }
  return false;
}

/** Collects and stores initial local credentials through injected, testable side effects. */
export async function configureLocalConnection(
  options: LocalSetupOptions,
): Promise<LocalSetupResult> {
  if (!Number.isSafeInteger(options.expectedShopId) || options.expectedShopId <= 0) {
    return { status: 'failed', reason: 'invalid_shop_id' };
  }

  try {
    if ((await options.configStore.read()) !== undefined) {
      return { status: 'failed', reason: 'already_configured' };
    }
    const storedSecrets = await Promise.all([
      options.secretStore.get('appKeystring'),
      options.secretStore.get('appSharedSecret'),
      options.secretStore.get('accessToken'),
      options.secretStore.get('refreshToken'),
    ]);
    if (storedSecrets.some((secret) => secret !== undefined)) {
      return { status: 'failed', reason: 'existing_credentials' };
    }
  } catch {
    return { status: 'failed', reason: 'state_check_failed' };
  }

  let keystring: string;
  let sharedSecret: string;
  try {
    keystring = await options.readHiddenInput(KEYSTRING_PROMPT);
  } catch {
    return { status: 'failed', reason: 'input_failed' };
  }
  if (!isValidSecret(keystring)) {
    return { status: 'failed', reason: 'invalid_secret' };
  }

  try {
    sharedSecret = await options.readHiddenInput(SHARED_SECRET_PROMPT);
  } catch {
    return { status: 'failed', reason: 'input_failed' };
  }
  if (!isValidSecret(sharedSecret)) {
    return { status: 'failed', reason: 'invalid_secret' };
  }

  try {
    await options.secretStore.set('appKeystring', keystring);
  } catch {
    return { status: 'failed', reason: 'secret_store_failed' };
  }

  try {
    await options.secretStore.set('appSharedSecret', sharedSecret);
  } catch {
    // This initial setup may leave one new secret behind; do not delete or roll back automatically.
    return { status: 'failed', reason: 'partial_secret_store_failed' };
  }

  try {
    await options.configStore.write(options.expectedShopId);
  } catch {
    // Credentials remain in the protected store; configuration is not cleared or rewritten.
    return { status: 'failed', reason: 'config_store_failed' };
  }

  return { status: 'configured' };
}
