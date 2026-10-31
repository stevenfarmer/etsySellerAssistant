import type { LocalConfig, LocalConfigStore } from './config.js';
import { createOAuthAttempt } from '../auth/oauth.js';
import type { CallbackReceiver } from '../auth/callback-server.js';
import { exchangeAuthorizationCode } from '../auth/token-client.js';
import type { TokenGrant } from '../auth/token-client.js';
import {
  runVerificationFlow,
  type VerificationFailureCode,
  type VerificationOutcome,
} from '../auth/verification-flow.js';
import { EtsyReadClient } from '../etsy/read-client.js';
import type { SecretStore } from '../secret-store.js';

export type LocalConnectFailureCode =
  | 'not_configured'
  | 'already_connected'
  | 'missing_credentials'
  | 'invalid_credentials'
  | 'store_failed'
  | 'configuration_failed'
  | VerificationFailureCode;

export type LocalConnectResult =
  | { readonly status: 'connected' }
  | { readonly status: 'failed'; readonly reason: LocalConnectFailureCode };

export interface LocalConnectOptions {
  readonly configStore: LocalConfigStore;
  readonly secretStore: SecretStore;
  readonly receiverFactory: (
    attempt: ReturnType<typeof createOAuthAttempt>,
  ) => Promise<CallbackReceiver>;
  readonly openBrowser: (localStartUrl: string) => Promise<void>;
  readonly tokenFetch: (url: string, init: RequestInit) => Promise<Response>;
  readonly shopFetch: typeof fetch;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isValidStoredCredential(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.trim().length === 0) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 32 || (codePoint >= 127 && codePoint <= 159)) return false;
  }
  return true;
}

/** Coordinates one bounded local OAuth exchange and configured-shop identity read. */
export async function connectLocal(options: LocalConnectOptions): Promise<LocalConnectResult> {
  let configuration: LocalConfig | undefined;
  try {
    configuration = await options.configStore.read();
  } catch {
    return { status: 'failed', reason: 'configuration_failed' };
  }
  if (configuration === undefined || !isPositiveSafeInteger(configuration.expectedShopId)) {
    return { status: 'failed', reason: 'not_configured' };
  }

  let appKeystring: string | undefined;
  let appSharedSecret: string | undefined;
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  try {
    [appKeystring, appSharedSecret, accessToken, refreshToken] = await Promise.all([
      options.secretStore.get('appKeystring'),
      options.secretStore.get('appSharedSecret'),
      options.secretStore.get('accessToken'),
      options.secretStore.get('refreshToken'),
    ]);
  } catch {
    return { status: 'failed', reason: 'store_failed' };
  }
  if (accessToken !== undefined || refreshToken !== undefined) {
    return { status: 'failed', reason: 'already_connected' };
  }
  if (appKeystring === undefined || appSharedSecret === undefined) {
    return { status: 'failed', reason: 'missing_credentials' };
  }
  if (!isValidStoredCredential(appKeystring) || !isValidStoredCredential(appSharedSecret)) {
    return { status: 'failed', reason: 'invalid_credentials' };
  }
  const validatedAppKeystring = appKeystring;
  const validatedAppSharedSecret = appSharedSecret;

  let attempt: ReturnType<typeof createOAuthAttempt>;
  try {
    attempt = createOAuthAttempt({ clientId: validatedAppKeystring, scopes: ['listings_r'] });
  } catch {
    return { status: 'failed', reason: 'invalid_credentials' };
  }

  const verification: VerificationOutcome = await runVerificationFlow({
    attempt,
    expectedShopId: configuration.expectedShopId,
    receiverFactory: options.receiverFactory,
    openBrowser: options.openBrowser,
    exchange: (code, verifier) =>
      exchangeAuthorizationCode(validatedAppKeystring, code, verifier, options.tokenFetch),
    store: options.secretStore,
    verifyShop: async ({
      expectedShopId,
      ownerId,
      grant,
    }: {
      readonly expectedShopId: number;
      readonly ownerId: number;
      readonly grant: TokenGrant;
    }): Promise<void> => {
      const client = new EtsyReadClient({
        fetch: options.shopFetch,
        expectedShopId,
        ownerId,
        grant: { accessToken: grant.accessToken, scopes: grant.scope },
        apiKeystring: validatedAppKeystring,
        apiSharedSecret: validatedAppSharedSecret,
      });
      await client.verifyConfiguredShop();
    },
  });

  if (verification.status === 'failed') {
    return { status: 'failed', reason: verification.reason };
  }
  return { status: 'connected' };
}
