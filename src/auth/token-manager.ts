import { refreshAuthorization, TokenGrantError, type TokenGrant } from './token-client.js';
import { SecretStoreError, type SecretStore } from '../secret-store.js';

const REQUIRED_SCOPES = ['listings_r'] as const;
const DEFAULT_EXPIRY_SKEW_MS = 60_000;

export type RefreshTransport = (clientId: string, refreshToken: string) => Promise<TokenGrant>;
export type TokenFetch = (url: string, init: RequestInit) => Promise<Response>;

export type TokenManagerErrorCode =
  | 'not_connected'
  | 'invalid_grant'
  | 'invalid_scope'
  | 'invalid_expiry'
  | 'invalid_identity'
  | 'invalid_configuration'
  | 'storage_failed'
  | 'refresh_failed';

export class TokenManagerError extends Error {
  readonly code: TokenManagerErrorCode;

  constructor(code: TokenManagerErrorCode) {
    super(`Token manager operation failed (${code}).`);
    this.name = 'TokenManagerError';
    this.code = code;
  }
}

export interface TokenManagerOptions {
  readonly store: SecretStore;
  readonly clientId: string;
  readonly expectedOwnerId: number;
  readonly transport: RefreshTransport;
  readonly now?: () => number;
  readonly expirySkewMs?: number;
}

export interface TokenManager {
  /** Store an already validated authorization-code grant; expiry stays in memory only. */
  acceptGrant(grant: TokenGrant): Promise<void>;
  /** Return a fresh access token, refreshing once when expired or its expiry is unknown. */
  getAccessToken(): Promise<string>;
}

/** Adapts the dedicated Etsy OAuth token client to the manager's transport contract. */
export function createEtsyRefreshTransport(tokenFetch: TokenFetch): RefreshTransport {
  return (clientId, refreshToken) => refreshAuthorization(clientId, refreshToken, tokenFetch);
}

function tokenOwnerId(token: unknown): number | undefined {
  if (typeof token !== 'string' || token.length > 8192) return undefined;
  if (
    [...token].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)
  ) {
    return undefined;
  }
  const prefix = /^([1-9][0-9]*)\.(.+)$/.exec(token)?.[1];
  if (prefix === undefined) return undefined;
  const ownerId = Number(prefix);
  return Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : undefined;
}

interface SharedManagerState {
  readonly clientId: string;
  readonly expectedOwnerId: number;
  readonly transport: RefreshTransport;
  readonly now: () => number;
  readonly expirySkewMs: number;
  accessExpiresAt: number | undefined;
  refreshInFlight: Promise<string> | undefined;
  acceptingGrant: boolean;
  generation: number;
}

const statesByStore = new WeakMap<SecretStore, SharedManagerState>();

function validateGrant(grant: TokenGrant, expectedOwnerId: number): void {
  if (
    typeof grant !== 'object' ||
    grant === null ||
    typeof grant.accessToken !== 'string' ||
    grant.accessToken.length === 0 ||
    typeof grant.refreshToken !== 'string' ||
    grant.refreshToken.length === 0
  ) {
    throw new TokenManagerError('invalid_grant');
  }
  if (
    tokenOwnerId(grant.accessToken) !== expectedOwnerId ||
    tokenOwnerId(grant.refreshToken) !== expectedOwnerId
  ) {
    throw new TokenManagerError('invalid_identity');
  }
  if (
    !Array.isArray(grant.scope) ||
    grant.scope.length !== REQUIRED_SCOPES.length ||
    grant.scope.some((scope, index) => scope !== REQUIRED_SCOPES[index])
  ) {
    throw new TokenManagerError('invalid_scope');
  }
  if (!Number.isSafeInteger(grant.expiresIn) || grant.expiresIn <= 0) {
    throw new TokenManagerError('invalid_expiry');
  }
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const now = options.now ?? Date.now;
  const expirySkewMs = options.expirySkewMs ?? DEFAULT_EXPIRY_SKEW_MS;
  if (
    typeof options.store !== 'object' ||
    options.store === null ||
    typeof options.clientId !== 'string' ||
    options.clientId.length === 0 ||
    !Number.isSafeInteger(options.expectedOwnerId) ||
    options.expectedOwnerId <= 0 ||
    typeof options.transport !== 'function' ||
    typeof now !== 'function' ||
    !Number.isSafeInteger(expirySkewMs) ||
    expirySkewMs < 0
  ) {
    throw new TokenManagerError('invalid_configuration');
  }

  let state = statesByStore.get(options.store);
  if (state === undefined) {
    state = {
      clientId: options.clientId,
      expectedOwnerId: options.expectedOwnerId,
      transport: options.transport,
      now,
      expirySkewMs,
      accessExpiresAt: undefined,
      refreshInFlight: undefined,
      acceptingGrant: false,
      generation: 0,
    };
    statesByStore.set(options.store, state);
  } else if (
    state.clientId !== options.clientId ||
    state.expectedOwnerId !== options.expectedOwnerId ||
    state.transport !== options.transport ||
    state.now !== now ||
    state.expirySkewMs !== expirySkewMs
  ) {
    throw new TokenManagerError('invalid_configuration');
  }

  const readSecret = async (key: 'accessToken' | 'refreshToken'): Promise<string | undefined> => {
    try {
      return await options.store.get(key);
    } catch (error) {
      if (error instanceof SecretStoreError) throw error;
      throw new TokenManagerError('storage_failed');
    }
  };

  const writeSecret = async (key: 'accessToken' | 'refreshToken', value: string): Promise<void> => {
    try {
      await options.store.set(key, value);
    } catch (error) {
      if (error instanceof SecretStoreError) throw error;
      throw new TokenManagerError('storage_failed');
    }
  };

  const persistGrant = async (grant: TokenGrant): Promise<void> => {
    validateGrant(grant, options.expectedOwnerId);
    const nowValue = now();
    const expiresAt = nowValue + grant.expiresIn * 1000;
    if (!Number.isSafeInteger(nowValue) || !Number.isSafeInteger(expiresAt)) {
      throw new TokenManagerError('invalid_expiry');
    }

    // Etsy may rotate refresh tokens. Persist the replacement first so a later
    // access-token write failure cannot leave the old refresh token as the only copy.
    // A partial write must never leave a previously cached expiry usable.
    state.accessExpiresAt = undefined;
    await writeSecret('refreshToken', grant.refreshToken);
    await writeSecret('accessToken', grant.accessToken);
    state.accessExpiresAt = expiresAt;
  };

  const refresh = async (): Promise<string> => {
    const refreshToken = await readSecret('refreshToken');
    if (refreshToken === undefined) throw new TokenManagerError('not_connected');
    if (tokenOwnerId(refreshToken) !== options.expectedOwnerId) {
      throw new TokenManagerError('invalid_identity');
    }

    let grant: TokenGrant;
    try {
      grant = await options.transport(options.clientId, refreshToken);
    } catch (error) {
      if (error instanceof TokenGrantError && error.code === 'invalid_scope') {
        throw new TokenManagerError('invalid_scope');
      }
      throw new TokenManagerError('refresh_failed');
    }
    await persistGrant(grant);
    return grant.accessToken;
  };

  return {
    async acceptGrant(grant: TokenGrant): Promise<void> {
      if (state.acceptingGrant || state.refreshInFlight !== undefined) {
        throw new TokenManagerError('invalid_grant');
      }
      state.acceptingGrant = true;
      state.generation += 1;
      try {
        await persistGrant(grant);
      } finally {
        state.acceptingGrant = false;
      }
    },

    async getAccessToken(): Promise<string> {
      if (state.acceptingGrant) throw new TokenManagerError('invalid_grant');
      const currentTime = now();
      if (
        state.accessExpiresAt !== undefined &&
        state.accessExpiresAt - expirySkewMs > currentTime
      ) {
        const generation = state.generation;
        const accessToken = await readSecret('accessToken');
        if (state.acceptingGrant) throw new TokenManagerError('invalid_grant');
        if (generation !== state.generation) return this.getAccessToken();
        if (accessToken !== undefined) {
          if (tokenOwnerId(accessToken) !== options.expectedOwnerId) {
            throw new TokenManagerError('invalid_identity');
          }
          return accessToken;
        }
      }

      if (state.refreshInFlight !== undefined) return state.refreshInFlight;
      const pending = refresh();
      state.refreshInFlight = pending;
      try {
        return await pending;
      } finally {
        if (state.refreshInFlight === pending) state.refreshInFlight = undefined;
      }
    },
  };
}
