export const SECRET_KEYS = [
  'appKeystring',
  'appSharedSecret',
  'accessToken',
  'refreshToken',
] as const;

export type SecretKey = (typeof SECRET_KEYS)[number];

export type SecretStoreErrorCode =
  'invalid_key' | 'invalid_value' | 'unavailable' | 'access_denied' | 'operation_failed';

export class SecretStoreError extends Error {
  readonly code: SecretStoreErrorCode;

  constructor(code: SecretStoreErrorCode) {
    super(`Secret store operation failed (${code}).`);
    this.name = 'SecretStoreError';
    this.code = code;
  }
}

export interface SecretStore {
  get(key: SecretKey): Promise<string | undefined>;
  set(key: SecretKey, value: string): Promise<void>;
  delete(key: SecretKey): Promise<boolean>;
}

export function isSecretKey(value: unknown): value is SecretKey {
  return typeof value === 'string' && SECRET_KEYS.some((secretKey) => secretKey === value);
}

function assertSecretKey(key: unknown): asserts key is SecretKey {
  if (!isSecretKey(key)) {
    throw new SecretStoreError('invalid_key');
  }
}

function assertSecretValue(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new SecretStoreError('invalid_value');
  }
}

/**
 * Test-only fabricated store. Production code must use a protected OS store.
 */
export class InMemorySecretStore implements SecretStore {
  readonly #values = new Map<SecretKey, string>();

  async get(key: SecretKey): Promise<string | undefined> {
    assertSecretKey(key);
    return this.#values.get(key);
  }

  async set(key: SecretKey, value: string): Promise<void> {
    assertSecretKey(key);
    assertSecretValue(value);
    this.#values.set(key, value);
  }

  async delete(key: SecretKey): Promise<boolean> {
    assertSecretKey(key);
    return this.#values.delete(key);
  }
}
