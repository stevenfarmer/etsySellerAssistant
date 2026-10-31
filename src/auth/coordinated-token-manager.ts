import type { SecretStore } from '../secret-store.js';
import type { TokenGrant } from './token-client.js';
import { resolve } from 'node:path';
import {
  acquireRefreshLock,
  createRefreshStateStore,
  isRefreshStateFresh,
  RefreshCoordinationError,
  type RefreshLockLease,
} from '../local/refresh-lock.js';

export interface CoordinatedTokenOptions {
  readonly directory: string;
  readonly ownerId: number;
  readonly store: SecretStore;
  readonly refresh: (refreshToken: string) => Promise<TokenGrant>;
  readonly now?: () => number;
  readonly lease?: RefreshLockLease;
}

function validToken(token: unknown, ownerId: number): token is string {
  if (typeof token !== 'string' || token.length > 8192) return false;
  return new RegExp(`^${ownerId}\\.[A-Za-z0-9._~-]+$`).test(token);
}

/** Serialize access-token refreshes between processes using the same protected local directory. */
export async function getCoordinatedAccessToken(options: CoordinatedTokenOptions): Promise<string> {
  if (!Number.isSafeInteger(options.ownerId) || options.ownerId <= 0) {
    throw new RefreshCoordinationError('invalid_input');
  }
  const now = options.now ?? Date.now;
  const lease =
    options.lease ??
    (await acquireRefreshLock({ directory: options.directory, waitTimeoutMs: 10_000 }));
  try {
    if (lease.directory !== resolve(options.directory))
      throw new RefreshCoordinationError('ownership_lost');
    await lease.assertOwned();
    const stateStore = createRefreshStateStore({ directory: options.directory });
    const state = await stateStore.read(lease);
    if (state?.status === 'refreshing') throw new RefreshCoordinationError('recovery_required');
    const [accessToken, refreshToken] = await Promise.all([
      options.store.get('accessToken'),
      options.store.get('refreshToken'),
    ]);
    if (!validToken(refreshToken, options.ownerId))
      throw new RefreshCoordinationError('invalid_state');
    // A partial initial token write must be recovered deliberately, not treated
    // as a normal expired connection eligible for refresh.
    if (!validToken(accessToken, options.ownerId))
      throw new RefreshCoordinationError('invalid_state');
    if (isRefreshStateFresh(state, now(), 60_000)) {
      return accessToken;
    }
    await stateStore.markRefreshing(lease);
    let grant: TokenGrant;
    try {
      grant = await options.refresh(refreshToken);
    } catch {
      throw new RefreshCoordinationError('recovery_required');
    }
    const expiresAt = now() + grant.expiresIn * 1000;
    if (
      !validToken(grant.accessToken, options.ownerId) ||
      !validToken(grant.refreshToken, options.ownerId) ||
      !Array.isArray(grant.scope) ||
      grant.scope.length !== 1 ||
      grant.scope[0] !== 'listings_r' ||
      !Number.isSafeInteger(grant.expiresIn) ||
      grant.expiresIn <= 0 ||
      !Number.isSafeInteger(expiresAt)
    )
      throw new RefreshCoordinationError('invalid_state');
    await options.store.set('refreshToken', grant.refreshToken);
    await options.store.set('accessToken', grant.accessToken);
    await stateStore.markReady(lease, expiresAt);
    return grant.accessToken;
  } catch (error) {
    if (error instanceof RefreshCoordinationError) throw error;
    throw new RefreshCoordinationError('io_failed');
  } finally {
    if (options.lease === undefined) await lease.release();
  }
}
