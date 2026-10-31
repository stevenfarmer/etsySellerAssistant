import { getCoordinatedAccessToken } from '../auth/coordinated-token-manager.js';
import { refreshAuthorization } from '../auth/token-client.js';
import { createLocalConfigStore, resolveLocalConfigDirectory } from '../local/config.js';
import { createOsSecretStore } from '../os-secret-store.js';
import { acquireRefreshLock } from '../local/refresh-lock.js';
import { createReadService } from './read-service.js';
import type { LocalConfigStore } from '../local/config.js';
import type { SecretStore } from '../secret-store.js';

/** Construct the local service without reading credentials or contacting Etsy. */
export function createLocalReadService(
  fetchImpl: typeof fetch,
  overrides: {
    readonly config?: LocalConfigStore;
    readonly store?: SecretStore;
    readonly directory?: string;
  } = {},
) {
  const config = overrides.config ?? createLocalConfigStore();
  const store = overrides.store ?? createOsSecretStore();
  const directory = overrides.directory ?? resolveLocalConfigDirectory();
  return createReadService({
    config,
    store,
    fetch: fetchImpl,
    withLock: async (work) => {
      const lease = await acquireRefreshLock({ directory, waitTimeoutMs: 10_000 });
      try {
        return await work(lease);
      } finally {
        await lease.release();
      }
    },
    getAccessToken: async (ownerId, lease) => {
      const clientId = await store.get('appKeystring');
      if (!clientId) throw new Error('not_configured');
      return getCoordinatedAccessToken({
        directory,
        ownerId,
        store,
        lease,
        refresh: (token) => refreshAuthorization(clientId, token, fetchImpl),
      });
    },
  });
}
