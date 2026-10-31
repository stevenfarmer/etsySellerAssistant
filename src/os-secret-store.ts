import type { AsyncEntry } from '@napi-rs/keyring';
import { isSecretKey, SecretStoreError, type SecretKey, type SecretStore } from './secret-store.js';

const SERVICE_NAME = 'etsySellerAssistant';
const MAX_SECRET_LENGTH = 16_384;

type Entry = Pick<AsyncEntry, 'getPassword' | 'setPassword' | 'deletePassword'>;
export type AsyncEntryFactory = (service: string, account: string) => Entry | Promise<Entry>;

export interface OsSecretStoreOptions {
  /** Injected only for deterministic tests; production service/account values remain fixed. */
  readonly backendFactory?: AsyncEntryFactory;
  /** Platform override is intended for tests and still permits only macOS or Windows. */
  readonly platform?: NodeJS.Platform;
}

function assertSecretKey(key: unknown): asserts key is SecretKey {
  if (!isSecretKey(key)) throw new SecretStoreError('invalid_key');
}

function assertSecretValue(value: unknown): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim().length === 0 ||
    value.length > MAX_SECRET_LENGTH ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    throw new SecretStoreError('invalid_value');
  }
}

function secretError(error: unknown): SecretStoreError {
  if (error instanceof SecretStoreError) return error;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { readonly code?: unknown }).code
      : undefined;
  if (code === 'EACCES' || code === 'EPERM' || code === 'ERR_ACCESS_DENIED') {
    return new SecretStoreError('access_denied');
  }
  return new SecretStoreError('operation_failed');
}

async function loadNativeEntryFactory(): Promise<AsyncEntryFactory> {
  try {
    const { AsyncEntry } = await import('@napi-rs/keyring');
    return (service, account) => new AsyncEntry(service, account);
  } catch {
    throw new SecretStoreError('unavailable');
  }
}

/**
 * macOS Keychain and Windows Credential Manager backed secret store.
 * The native package is loaded lazily and never loaded on unsupported platforms.
 */
export function createOsSecretStore(options: OsSecretStoreOptions = {}): SecretStore {
  const platform = options.platform ?? process.platform;
  let nativeFactoryPromise: Promise<AsyncEntryFactory> | undefined;
  const entries = new Map<SecretKey, Promise<Entry>>();

  const getEntry = async (key: SecretKey): Promise<Entry> => {
    if (platform !== 'darwin' && platform !== 'win32') {
      throw new SecretStoreError('unavailable');
    }
    let entry = entries.get(key);
    if (entry === undefined) {
      entry = (async () => {
        let factory = options.backendFactory;
        if (factory === undefined) {
          nativeFactoryPromise ??= loadNativeEntryFactory();
          factory = await nativeFactoryPromise;
        }
        try {
          return await factory(SERVICE_NAME, key);
        } catch {
          throw new SecretStoreError('operation_failed');
        }
      })();
      entries.set(key, entry);
      entry.catch(() => entries.delete(key));
    }
    return entry;
  };

  return {
    async get(key: SecretKey): Promise<string | undefined> {
      assertSecretKey(key);
      const entry = await getEntry(key);
      try {
        const value = await entry.getPassword();
        if (value === null) return undefined;
        if (typeof value !== 'string') throw new SecretStoreError('operation_failed');
        return value;
      } catch (error) {
        throw secretError(error);
      }
    },

    async set(key: SecretKey, value: string): Promise<void> {
      assertSecretKey(key);
      assertSecretValue(value);
      const entry = await getEntry(key);
      try {
        await entry.setPassword(value);
      } catch (error) {
        throw secretError(error);
      }
    },

    async delete(key: SecretKey): Promise<boolean> {
      assertSecretKey(key);
      const entry = await getEntry(key);
      let deleted: boolean;
      try {
        deleted = await entry.deletePassword();
      } catch (error) {
        throw secretError(error);
      }
      try {
        const remaining = await entry.getPassword();
        if (remaining !== null) throw new SecretStoreError('operation_failed');
      } catch (error) {
        throw secretError(error);
      }
      return deleted;
    },
  };
}
