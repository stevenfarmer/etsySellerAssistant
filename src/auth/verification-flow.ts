import type { CallbackReceiver } from './callback-server.js';
import type { OAuthAttempt, ValidatedCallback } from './oauth.js';
import type { TokenGrant } from './token-client.js';
import type { SecretStore } from '../secret-store.js';

const REQUIRED_SCOPE = 'listings_r';

export type VerificationFailureCode =
  | 'invalid_input'
  | 'receiver_failed'
  | 'browser_failed'
  | 'callback_failed'
  | 'consent_denied'
  | 'exchange_failed'
  | 'invalid_scope'
  | 'invalid_identity'
  | 'shop_verification_failed'
  | 'storage_failed'
  | 'cleanup_failed';

export type VerificationOutcome =
  | { readonly status: 'passed' }
  | { readonly status: 'failed'; readonly reason: VerificationFailureCode };

export interface VerificationFlowOptions {
  readonly attempt: OAuthAttempt;
  readonly expectedShopId: number;
  readonly receiverFactory: (attempt: OAuthAttempt) => Promise<CallbackReceiver>;
  readonly openBrowser: (localStartUrl: string) => Promise<void>;
  readonly exchange: (code: string, verifier: string) => Promise<TokenGrant>;
  readonly store: SecretStore;
  readonly verifyShop: (input: {
    readonly expectedShopId: number;
    readonly ownerId: number;
    readonly grant: TokenGrant;
  }) => Promise<void>;
}

function getTokenOwnerId(accessToken: unknown): number | undefined {
  if (typeof accessToken !== 'string') return undefined;
  const prefix = /^([1-9][0-9]*)\./.exec(accessToken)?.[1];
  if (prefix === undefined) return undefined;
  const ownerId = Number(prefix);
  return Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : undefined;
}

function hasRequiredGrant(grant: unknown): grant is TokenGrant {
  return (
    typeof grant === 'object' &&
    grant !== null &&
    'accessToken' in grant &&
    typeof grant.accessToken === 'string' &&
    grant.accessToken.length > 0 &&
    'refreshToken' in grant &&
    typeof grant.refreshToken === 'string' &&
    grant.refreshToken.length > 0 &&
    'expiresIn' in grant &&
    typeof grant.expiresIn === 'number' &&
    Number.isSafeInteger(grant.expiresIn) &&
    grant.expiresIn > 0 &&
    'scope' in grant &&
    Array.isArray(grant.scope) &&
    grant.scope.length === 1 &&
    grant.scope[0] === REQUIRED_SCOPE
  );
}

function isAuthorizedCallback(
  value: unknown,
): value is Extract<ValidatedCallback, { kind: 'authorized' }> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'authorized' &&
    'code' in value &&
    typeof value.code === 'string' &&
    value.code.length > 0
  );
}

/** Runs an offline-testable, bounded OAuth verification using only injected side effects. */
export async function runVerificationFlow(
  options: VerificationFlowOptions,
): Promise<VerificationOutcome> {
  if (!Number.isSafeInteger(options.expectedShopId) || options.expectedShopId <= 0) {
    return { status: 'failed', reason: 'invalid_input' };
  }

  let receiver: CallbackReceiver | undefined;
  let outcome: VerificationOutcome;
  try {
    outcome = await (async (): Promise<VerificationOutcome> => {
      try {
        receiver = await options.receiverFactory(options.attempt);
      } catch {
        return { status: 'failed', reason: 'receiver_failed' };
      }

      // Handle a receiver rejection immediately, including while the browser opener is pending.
      const callbackOutcome = receiver.result.then(
        (callback) => ({ ok: true as const, callback }),
        () => ({ ok: false as const }),
      );

      try {
        await options.openBrowser(receiver.browserStartUrl);
      } catch {
        return { status: 'failed', reason: 'browser_failed' };
      }

      const received = await callbackOutcome;
      if (!received.ok) return { status: 'failed', reason: 'callback_failed' };
      if (
        typeof received.callback === 'object' &&
        received.callback !== null &&
        'kind' in received.callback &&
        received.callback.kind === 'denied'
      ) {
        return { status: 'failed', reason: 'consent_denied' };
      }
      if (!isAuthorizedCallback(received.callback)) {
        return { status: 'failed', reason: 'callback_failed' };
      }

      let exchangedGrant: unknown;
      try {
        exchangedGrant = await options.exchange(
          received.callback.code,
          options.attempt.codeVerifier,
        );
      } catch {
        return { status: 'failed', reason: 'exchange_failed' };
      }
      if (!hasRequiredGrant(exchangedGrant)) {
        return { status: 'failed', reason: 'invalid_scope' };
      }

      const ownerId = getTokenOwnerId(exchangedGrant.accessToken);
      if (ownerId === undefined || getTokenOwnerId(exchangedGrant.refreshToken) !== ownerId) {
        return { status: 'failed', reason: 'invalid_identity' };
      }
      try {
        await options.verifyShop({
          expectedShopId: options.expectedShopId,
          ownerId,
          grant: exchangedGrant,
        });
      } catch {
        return { status: 'failed', reason: 'shop_verification_failed' };
      }

      try {
        await options.store.set('refreshToken', exchangedGrant.refreshToken);
        await options.store.set('accessToken', exchangedGrant.accessToken);
      } catch {
        return { status: 'failed', reason: 'storage_failed' };
      }
      return { status: 'passed' };
    })();
  } catch {
    outcome = { status: 'failed', reason: 'callback_failed' };
  } finally {
    if (receiver !== undefined) {
      try {
        await receiver.close();
      } catch {
        outcome = { status: 'failed', reason: 'cleanup_failed' };
      }
    }
  }
  return outcome;
}
