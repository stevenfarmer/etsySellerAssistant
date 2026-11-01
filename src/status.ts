import type { SessionConnectionStatus } from './etsy/read-service.js';

export interface SetupStatus {
  readonly application: 'etsySellerAssistant';
  readonly version: '0.1.0-alpha.2';
  readonly etsyAccess: 'not_configured';
  readonly readOnly: true;
}

export function getSetupStatus(): SetupStatus {
  return {
    application: 'etsySellerAssistant',
    version: '0.1.0-alpha.2',
    etsyAccess: 'not_configured',
    readOnly: true,
  };
}

/** Session evidence only: never read local settings, credentials or Etsy here. */
export function getReadSetupStatus(
  status: SessionConnectionStatus = { etsyAccess: 'not_checked' },
) {
  const base = { ...getSetupStatus(), etsyAccess: status.etsyAccess };
  if (status.etsyAccess !== 'verified_this_session') return base;
  return {
    ...base,
    connection: {
      ownerId: status.connection.ownerId,
      shopId: status.connection.shopId,
      lastVerifiedAt: status.connection.lastVerifiedAt,
    },
  };
}
