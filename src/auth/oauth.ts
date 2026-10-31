import { createHash, randomBytes } from 'node:crypto';

export const ETSY_AUTHORIZATION_ENDPOINT = 'https://www.etsy.com/oauth/connect';
export const LOCAL_REDIRECT_URI = 'http://localhost:3003/oauth/redirect';
export const REQUIRED_SCOPES = ['listings_r'] as const;

export type OAuthErrorCode =
  | 'invalid_input'
  | 'callback_invalid'
  | 'state_mismatch'
  | 'authorization_denied'
  | 'authorization_failed'
  | 'attempt_consumed';

export class OAuthError extends Error {
  readonly code: OAuthErrorCode;

  constructor(code: OAuthErrorCode) {
    super(code);
    this.name = 'OAuthError';
    this.code = code;
  }
}

export interface OAuthAttempt {
  readonly authorizationUrl: string;
  readonly redirectUri: string;
  /** Must be kept in process memory and passed only to the token exchange layer. */
  readonly codeVerifier: string;
  readonly state: string;
  consume(): void;
  isConsumed(): boolean;
}

export interface OAuthAttemptOptions {
  readonly clientId: string;
  readonly redirectUri?: string;
  readonly scopes?: readonly string[];
}

const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

function validateRedirectUri(redirectUri: string): void {
  if (redirectUri !== LOCAL_REDIRECT_URI) {
    throw new OAuthError('invalid_input');
  }
}

export function createOAuthAttempt(options: OAuthAttemptOptions): OAuthAttempt {
  const redirectUri = options.redirectUri ?? LOCAL_REDIRECT_URI;
  const scopes = options.scopes ?? REQUIRED_SCOPES;
  if (!options.clientId || /[\s&#]/.test(options.clientId)) {
    throw new OAuthError('invalid_input');
  }
  validateRedirectUri(redirectUri);
  if (
    scopes.length !== REQUIRED_SCOPES.length ||
    scopes.some((scope, index) => scope !== REQUIRED_SCOPES[index]) ||
    new Set(scopes).size !== scopes.length
  ) {
    throw new OAuthError('invalid_input');
  }

  const codeVerifier = randomBytes(32).toString('base64url');
  const state = randomBytes(32).toString('base64url');
  if (!VERIFIER_PATTERN.test(codeVerifier) || !STATE_PATTERN.test(state)) {
    throw new OAuthError('invalid_input');
  }
  const codeChallenge = createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
  const url = new URL(ETSY_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', options.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  let consumed = false;
  return {
    authorizationUrl: url.toString(),
    redirectUri,
    codeVerifier,
    state,
    consume() {
      if (consumed) throw new OAuthError('attempt_consumed');
      consumed = true;
    },
    isConsumed: () => consumed,
  };
}

export type ValidatedCallback =
  | { readonly kind: 'authorized'; readonly code: string }
  | { readonly kind: 'denied'; readonly error: string };

function exactlyOne(
  params: URLSearchParams,
  name: string,
  required: boolean,
  attempt: OAuthAttempt,
): string | undefined {
  const all = params.getAll(name);
  if (all.length > 1 || (required && all.length !== 1)) {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }
  return all[0];
}

/** Validate an absolute-form or origin-form request target without exposing raw query data in errors. */
export function validateCallbackTarget(
  requestTarget: string,
  hostHeader: string | undefined,
  attempt: OAuthAttempt,
): ValidatedCallback {
  if (attempt.isConsumed()) throw new OAuthError('attempt_consumed');
  if (requestTarget.length > 4096 || hostHeader?.toLowerCase() !== 'localhost:3003') {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }
  const queryStart = requestTarget.indexOf('?');
  const rawPath = queryStart < 0 ? requestTarget : requestTarget.slice(0, queryStart);
  if (!requestTarget.startsWith('/') || rawPath !== '/oauth/redirect' || queryStart < 0) {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }

  let url: URL;
  try {
    url = new URL(requestTarget, LOCAL_REDIRECT_URI);
  } catch {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }
  if (
    url.origin !== new URL(LOCAL_REDIRECT_URI).origin ||
    url.pathname !== '/oauth/redirect' ||
    url.hash !== '' ||
    url.search === ''
  ) {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }

  const params = url.searchParams;
  const allowedParameters = new Set([
    'state',
    'code',
    'error',
    'error_description',
    'error_uri',
    'iss',
  ]);
  if (params.size > 8 || [...params.keys()].some((name) => !allowedParameters.has(name))) {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }
  const state = exactlyOne(params, 'state', true, attempt);
  if (state !== attempt.state) {
    attempt.consume();
    throw new OAuthError('state_mismatch');
  }

  const issuer = exactlyOne(params, 'iss', false, attempt);
  if (issuer !== undefined && issuer !== 'https://openapi.etsy.com') {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }

  const code = exactlyOne(params, 'code', false, attempt);
  const error = exactlyOne(params, 'error', false, attempt);
  const description = exactlyOne(params, 'error_description', false, attempt);
  const errorUri = exactlyOne(params, 'error_uri', false, attempt);
  if (code !== undefined && error !== undefined) {
    attempt.consume();
    throw new OAuthError('callback_invalid');
  }
  if (code !== undefined) {
    if (
      code.length < 1 ||
      code.length > 2048 ||
      [...code].some((character) => character.charCodeAt(0) <= 32) ||
      description !== undefined ||
      errorUri !== undefined
    ) {
      attempt.consume();
      throw new OAuthError('callback_invalid');
    }
    attempt.consume();
    return { kind: 'authorized', code };
  }
  if (error !== undefined) {
    if (
      !/^[A-Za-z0-9._-]{1,128}$/.test(error) ||
      (description !== undefined && description.length > 512) ||
      (errorUri !== undefined && errorUri.length > 2048)
    ) {
      attempt.consume();
      throw new OAuthError('callback_invalid');
    }
    attempt.consume();
    if (error === 'access_denied') return { kind: 'denied', error };
    throw new OAuthError('authorization_failed');
  }
  attempt.consume();
  throw new OAuthError('callback_invalid');
}
