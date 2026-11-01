import { randomUUID } from 'node:crypto';
import { createOsSecretStore } from '../../dist/src/os-secret-store.js';
import { SECRET_KEYS } from '../../dist/src/secret-store.js';

/** Remap every native operation to one newly generated test-only service. */
export function createIsolatedDrillStore(entryFactory, platform) {
  const namespace = `etsySellerAssistant-recovery-drill-${randomUUID()}`;
  const store = createOsSecretStore({
    platform,
    backendFactory: (_productionService, account) => {
      if (!SECRET_KEYS.includes(account)) throw new Error('Invalid drill account.');
      return entryFactory(namespace, account);
    },
  });
  return { namespace, store };
}
