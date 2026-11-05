import { mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { EDIT_SCOPES } from '../auth/oauth.js';
import { getCoordinatedAccessToken } from '../auth/coordinated-token-manager.js';
import { refreshAuthorization } from '../auth/token-client.js';
import { createLocalAuditStore } from '../local/audit-store.js';
import { createLocalConfigStore, resolveLocalConfigDirectory } from '../local/config.js';
import { createOsSecretStore } from '../os-secret-store.js';
import type { SecretStore } from '../secret-store.js';
import { EtsyWriteClient } from './write-client.js';
import type { ReadOnlyListingService } from '../mcp/read-tools.js';
import { createListingApplyService } from '../edits/apply-service.js';
import type { LocalConfigStore } from '../local/config.js';

function ownerFromToken(token: unknown): number | undefined {
  if (typeof token !== 'string') return undefined;
  const value = /^([1-9][0-9]*)\./.exec(token)?.[1];
  if (value === undefined) return undefined;
  const ownerId = Number(value);
  return Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : undefined;
}

export function createLocalListingApplyService(
  fetchImpl: typeof fetch,
  readService: ReadOnlyListingService,
  overrides: {
    readonly config?: LocalConfigStore;
    readonly store?: SecretStore;
    readonly directory?: string;
  } = {},
) {
  const config = overrides.config ?? createLocalConfigStore();
  const store = overrides.store ?? createOsSecretStore();
  const directory = overrides.directory ?? resolveLocalConfigDirectory();
  const editTokenDirectory = path.join(directory, 'edit-token-state');

  return createListingApplyService({
    getAuditStore: async () => {
      const settings = await config.read();
      if (!settings?.auditDirectory) throw new Error('audit_not_configured');
      return createLocalAuditStore({ directory: settings.auditDirectory });
    },
    getWriteClient: async () => {
      const settings = await config.read();
      if (!settings) throw new Error('not_configured');
      const [clientId, appSharedSecret, refreshToken] = await Promise.all([
        store.get('appKeystring'),
        store.get('appSharedSecret'),
        store.get('editRefreshToken'),
      ]);
      const ownerId = ownerFromToken(refreshToken);
      if (!clientId || !appSharedSecret || !refreshToken || !ownerId)
        throw new Error('edit_authorization_required');

      await mkdir(editTokenDirectory, { recursive: true, mode: 0o700 });
      const accessToken = await getCoordinatedAccessToken({
        directory: editTokenDirectory,
        ownerId,
        store,
        profile: 'edit',
        refresh: (token) => refreshAuthorization(clientId, token, fetchImpl, EDIT_SCOPES),
      });
      return new EtsyWriteClient({
        fetch: fetchImpl,
        expectedShopId: settings.expectedShopId,
        ownerId,
        accessToken,
        scopes: EDIT_SCOPES,
        apiKeystring: clientId,
        apiSharedSecret: appSharedSecret,
      });
    },
    getSnapshot: async (listingId) => {
      const listing = await readService.getListing(listingId);
      const status = readService.getConnectionStatus?.();
      return {
        snapshot: listing,
        connection: status ?? { etsyAccess: 'not_checked' as const },
      };
    },
  });
}
