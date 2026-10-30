export interface SetupStatus {
  readonly application: 'etsySellerAssistant';
  readonly version: '0.1.0';
  readonly etsyAccess: 'not_configured';
  readonly readOnly: true;
}

export function getSetupStatus(): SetupStatus {
  return {
    application: 'etsySellerAssistant',
    version: '0.1.0',
    etsyAccess: 'not_configured',
    readOnly: true,
  };
}
