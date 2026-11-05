import { isSupportedScopeSet, REQUIRED_SCOPES } from './oauth.js';

const TOKEN_ENDPOINT = 'https://api.etsy.com/v3/public/oauth/token';
const CALLBACK_URL = 'http://localhost:3003/oauth/redirect';

export interface TokenGrant {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly scope: readonly string[];
}

export class TokenGrantError extends Error {
  constructor(
    readonly code: 'invalid_request' | 'request_failed' | 'invalid_response' | 'invalid_scope',
  ) {
    super(`Etsy token request failed: ${code}`);
    this.name = 'TokenGrantError';
  }
}

type TokenFetch = (url: string, init: RequestInit) => Promise<Response>;

async function requestGrant(
  body: URLSearchParams,
  tokenFetch: TokenFetch,
  expectedScopes: readonly string[],
): Promise<TokenGrant> {
  let response: Response;
  try {
    response = await tokenFetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
    });
  } catch {
    throw new TokenGrantError('request_failed');
  }
  if (!response.ok) throw new TokenGrantError('request_failed');

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new TokenGrantError('invalid_response');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TokenGrantError('invalid_response');
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.access_token !== 'string' ||
    record.access_token.length === 0 ||
    typeof record.refresh_token !== 'string' ||
    record.refresh_token.length === 0 ||
    typeof record.token_type !== 'string' ||
    record.token_type.toLowerCase() !== 'bearer' ||
    typeof record.expires_in !== 'number' ||
    !Number.isSafeInteger(record.expires_in) ||
    record.expires_in <= 0 ||
    typeof record.scope !== 'string'
  ) {
    throw new TokenGrantError('invalid_response');
  }
  const scopes = record.scope.trim().split(/\s+/).filter(Boolean);
  if (
    !isSupportedScopeSet(scopes) ||
    scopes.length !== expectedScopes.length ||
    new Set(scopes).size !== scopes.length ||
    expectedScopes.some((scope) => !scopes.includes(scope))
  ) {
    throw new TokenGrantError('invalid_scope');
  }
  return {
    accessToken: record.access_token,
    refreshToken: record.refresh_token,
    expiresIn: record.expires_in,
    scope: scopes,
  };
}

export async function exchangeAuthorizationCode(
  clientId: string,
  code: string,
  verifier: string,
  tokenFetch: TokenFetch,
  expectedScopes: readonly string[] = REQUIRED_SCOPES,
): Promise<TokenGrant> {
  if (!validInput(clientId) || !validInput(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
    throw new TokenGrantError('invalid_request');
  }
  return requestGrant(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: CALLBACK_URL,
      code,
      code_verifier: verifier,
    }),
    tokenFetch,
    expectedScopes,
  );
}

export async function refreshAuthorization(
  clientId: string,
  refreshToken: string,
  tokenFetch: TokenFetch,
  expectedScopes: readonly string[] = REQUIRED_SCOPES,
): Promise<TokenGrant> {
  if (!validInput(clientId) || !validInput(refreshToken)) {
    throw new TokenGrantError('invalid_request');
  }
  return requestGrant(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    tokenFetch,
    expectedScopes,
  );
}

function validInput(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 8192;
}
