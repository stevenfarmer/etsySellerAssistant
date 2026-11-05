import { EDIT_SCOPES, isSupportedScopeSet } from '../auth/oauth.js';
import type { ListingEditChanges } from '../edits/proposal-service.js';

const API_ROOT = 'https://openapi.etsy.com/v3/application';
const REQUEST_TIMEOUT_MS = 15_000;

export interface EtsyWriteClientOptions {
  readonly fetch: typeof fetch;
  readonly expectedShopId: number;
  readonly ownerId: number;
  readonly accessToken: string;
  readonly scopes: readonly string[];
  readonly apiKeystring: string;
  readonly apiSharedSecret: string;
}

export type EtsyWriteErrorCode =
  | 'invalid_configuration'
  | 'invalid_input'
  | 'request_failed'
  | 'request_timeout'
  | 'service_unavailable'
  | 'rejected';

export class EtsyWriteError extends Error {
  constructor(
    readonly code: EtsyWriteErrorCode,
    readonly mayHaveApplied: boolean,
  ) {
    super(`Etsy listing update failed (${code}).`);
    this.name = 'EtsyWriteError';
  }
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validateOptions(options: EtsyWriteClientOptions): void {
  const tokenOwner = /^([1-9][0-9]*)\./.exec(options.accessToken)?.[1];
  if (
    typeof options.fetch !== 'function' ||
    !positiveSafeInteger(options.expectedShopId) ||
    !positiveSafeInteger(options.ownerId) ||
    typeof options.accessToken !== 'string' ||
    tokenOwner === undefined ||
    Number(tokenOwner) !== options.ownerId ||
    !Array.isArray(options.scopes) ||
    !isSupportedScopeSet(options.scopes) ||
    options.scopes.length !== EDIT_SCOPES.length ||
    options.scopes.some((scope, index) => scope !== EDIT_SCOPES[index]) ||
    typeof options.apiKeystring !== 'string' ||
    options.apiKeystring.length === 0 ||
    typeof options.apiSharedSecret !== 'string' ||
    options.apiSharedSecret.length === 0 ||
    [options.accessToken, options.apiKeystring, options.apiSharedSecret].some((value) =>
      /[\r\n]/.test(value),
    )
  ) {
    throw new EtsyWriteError('invalid_configuration', false);
  }
}

function validateChanges(changes: ListingEditChanges): void {
  if (
    typeof changes !== 'object' ||
    changes === null ||
    Array.isArray(changes) ||
    Object.keys(changes).length === 0 ||
    Object.keys(changes).some((key) => !['title', 'description', 'tags'].includes(key))
  ) {
    throw new EtsyWriteError('invalid_input', false);
  }
  if (
    ('title' in changes && typeof changes.title !== 'string') ||
    ('description' in changes && typeof changes.description !== 'string') ||
    ('tags' in changes &&
      (!Array.isArray(changes.tags) ||
        changes.tags.length < 1 ||
        changes.tags.length > 13 ||
        !changes.tags.every(
          (tag) => typeof tag === 'string' && tag.length > 0 && tag.length <= 20,
        )))
  ) {
    throw new EtsyWriteError('invalid_input', false);
  }
}

/** Fixed Etsy listing text adapter. It sends one PATCH and never retries. */
export class EtsyWriteClient {
  readonly #fetch: typeof fetch;
  readonly #shopId: number;
  readonly #ownerId: number;
  readonly #accessToken: string;
  readonly #apiKeyHeader: string;

  constructor(options: EtsyWriteClientOptions) {
    validateOptions(options);
    this.#fetch = options.fetch;
    this.#shopId = options.expectedShopId;
    this.#ownerId = options.ownerId;
    this.#accessToken = options.accessToken;
    this.#apiKeyHeader = `${options.apiKeystring}:${options.apiSharedSecret}`;
  }

  async updateListing(listingId: number, changes: ListingEditChanges): Promise<void> {
    if (!positiveSafeInteger(listingId)) throw new EtsyWriteError('invalid_input', false);
    validateChanges(changes);
    const body = new URLSearchParams();
    if (changes.title !== undefined) body.set('title', changes.title);
    if (changes.description !== undefined) body.set('description', changes.description);
    // Etsy documents tags as a comma-separated array in this form-encoded endpoint.
    if (changes.tags !== undefined) body.set('tags', changes.tags.join(','));

    let response: Response;
    try {
      response = await this.#fetch(`${API_ROOT}/shops/${this.#shopId}/listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'x-api-key': this.#apiKeyHeader,
          authorization: `Bearer ${this.#accessToken}`,
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'error',
      });
    } catch (error) {
      const timeout =
        error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new EtsyWriteError(timeout ? 'request_timeout' : 'request_failed', true);
    }
    if (response.ok) return;
    if (response.status === 408) throw new EtsyWriteError('request_timeout', true);
    if (response.status >= 500) throw new EtsyWriteError('service_unavailable', true);
    if (response.status === 429) throw new EtsyWriteError('rejected', false);
    throw new EtsyWriteError('rejected', false);
  }

  get identity(): { readonly ownerId: number; readonly shopId: number } {
    return { ownerId: this.#ownerId, shopId: this.#shopId };
  }
}
