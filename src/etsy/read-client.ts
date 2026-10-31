const API_ROOT = 'https://openapi.etsy.com/v3/application';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PAGE_SIZE = 100;
const MAX_PAGES = 5;
const MAX_OFFSET = Number.MAX_SAFE_INTEGER - MAX_PAGE_SIZE * MAX_PAGES;
const ALLOWED_STATES = new Set(['active', 'inactive', 'sold_out', 'draft', 'expired']);

export interface ReadGrant {
  readonly accessToken: string;
  readonly scopes: readonly string[];
}

export interface EtsyReadClientOptions {
  readonly fetch: typeof fetch;
  readonly expectedShopId: number;
  readonly ownerId: number;
  readonly grant: ReadGrant;
  readonly apiKeystring: string;
  readonly apiSharedSecret: string;
}

export interface ShopIdentity {
  readonly shopId: number;
  readonly ownerId: number;
}

export interface ListingPrice {
  readonly amount: number;
  readonly divisor: number;
  readonly currencyCode: string;
}

export interface ListingSummary {
  readonly listingId: number;
  readonly shopId: number;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly categoryId: number | null;
  readonly price: ListingPrice;
  readonly quantity: number;
  readonly state: string;
  readonly url: string;
}

export type EtsyReadErrorCode =
  | 'invalid_configuration'
  | 'invalid_input'
  | 'request_failed'
  | 'invalid_response'
  | 'identity_mismatch'
  | 'listing_not_owned';

export class EtsyReadError extends Error {
  readonly code: EtsyReadErrorCode;

  constructor(code: EtsyReadErrorCode) {
    super(`Etsy read failed (${code}).`);
    this.name = 'EtsyReadError';
    this.code = code;
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function sanitizedEtsyListingUrl(value: unknown, listingId: number): string | undefined {
  if (!requiredString(value)) return undefined;
  try {
    const url = new URL(value);
    const valid =
      url.protocol === 'https:' &&
      url.hostname === 'www.etsy.com' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      new RegExp(`^/listing/${listingId}(?:/|$)`).test(url.pathname);
    return valid ? `${url.origin}${url.pathname}` : undefined;
  } catch {
    return undefined;
  }
}

function validateConfiguration(options: EtsyReadClientOptions): void {
  if (
    !isRecord(options) ||
    typeof options.fetch !== 'function' ||
    !isPositiveSafeInteger(options.expectedShopId) ||
    !isPositiveSafeInteger(options.ownerId) ||
    !isRecord(options.grant) ||
    !requiredString(options.grant.accessToken) ||
    !Array.isArray(options.grant.scopes) ||
    options.grant.scopes.length !== 1 ||
    options.grant.scopes[0] !== 'listings_r' ||
    !requiredString(options.apiKeystring) ||
    !requiredString(options.apiSharedSecret) ||
    /[\r\n]/.test(options.grant.accessToken) ||
    /[\r\n]/.test(options.apiKeystring) ||
    /[\r\n]/.test(options.apiSharedSecret)
  ) {
    throw new EtsyReadError('invalid_configuration');
  }
  const tokenOwnerPrefix = /^([1-9][0-9]*)\./.exec(options.grant.accessToken)?.[1];
  const tokenOwnerId = tokenOwnerPrefix === undefined ? Number.NaN : Number(tokenOwnerPrefix);
  if (!Number.isSafeInteger(tokenOwnerId) || tokenOwnerId <= 0) {
    throw new EtsyReadError('invalid_configuration');
  }
  if (tokenOwnerId !== options.ownerId) {
    throw new EtsyReadError('identity_mismatch');
  }
}

function parseShop(value: unknown, expectedOwnerId: number): ShopIdentity {
  if (!isRecord(value) || !isPositiveSafeInteger(value.shop_id)) {
    throw new EtsyReadError('invalid_response');
  }
  if (!isPositiveSafeInteger(value.user_id)) {
    throw new EtsyReadError('invalid_response');
  }
  if (value.user_id !== expectedOwnerId) {
    throw new EtsyReadError('identity_mismatch');
  }
  return { shopId: value.shop_id, ownerId: value.user_id };
}

function parsePrice(value: unknown): ListingPrice {
  if (
    !isRecord(value) ||
    typeof value.amount !== 'number' ||
    !Number.isSafeInteger(value.amount) ||
    value.amount < 0 ||
    typeof value.divisor !== 'number' ||
    !Number.isSafeInteger(value.divisor) ||
    value.divisor <= 0 ||
    !requiredString(value.currency_code)
  ) {
    throw new EtsyReadError('invalid_response');
  }
  return {
    amount: value.amount,
    divisor: value.divisor,
    currencyCode: value.currency_code,
  };
}

function parseListing(
  value: unknown,
  expectedShopId: number,
  expectedOwnerId: number,
  requireActive: boolean,
  requestedListingId?: number,
): ListingSummary {
  const safeUrl =
    isRecord(value) && isPositiveSafeInteger(value.listing_id)
      ? sanitizedEtsyListingUrl(value.url, value.listing_id)
      : undefined;
  if (
    !isRecord(value) ||
    !isPositiveSafeInteger(value.listing_id) ||
    !isPositiveSafeInteger(value.shop_id) ||
    !isPositiveSafeInteger(value.user_id) ||
    !requiredString(value.title) ||
    typeof value.description !== 'string' ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === 'string') ||
    (value.taxonomy_id !== undefined &&
      value.taxonomy_id !== null &&
      !isPositiveSafeInteger(value.taxonomy_id)) ||
    typeof value.quantity !== 'number' ||
    !Number.isSafeInteger(value.quantity) ||
    value.quantity < 0 ||
    typeof value.state !== 'string' ||
    !ALLOWED_STATES.has(value.state) ||
    safeUrl === undefined
  ) {
    throw new EtsyReadError('invalid_response');
  }
  if (value.shop_id !== expectedShopId || value.user_id !== expectedOwnerId) {
    throw new EtsyReadError('identity_mismatch');
  }
  if (requestedListingId !== undefined && value.listing_id !== requestedListingId) {
    throw new EtsyReadError('identity_mismatch');
  }
  if (requireActive && value.state !== 'active') {
    throw new EtsyReadError('invalid_response');
  }
  return {
    listingId: value.listing_id,
    shopId: value.shop_id,
    title: value.title,
    description: value.description,
    tags: value.tags,
    categoryId: typeof value.taxonomy_id === 'number' ? value.taxonomy_id : null,
    price: parsePrice(value.price),
    quantity: value.quantity,
    state: value.state,
    url: safeUrl,
  };
}

function parseListingPage(value: unknown): { count: number; results: unknown[] } {
  if (
    !isRecord(value) ||
    typeof value.count !== 'number' ||
    !Number.isSafeInteger(value.count) ||
    value.count < 0 ||
    !Array.isArray(value.results)
  ) {
    throw new EtsyReadError('invalid_response');
  }
  return { count: value.count, results: value.results };
}

/** Read-only Etsy API client. `fetch` is mandatory; no global network default is used. */
export class EtsyReadClient {
  readonly #fetch: typeof fetch;
  readonly #expectedShopId: number;
  readonly #ownerId: number;
  readonly #accessToken: string;
  readonly #appKeyHeader: string;
  readonly #knownListingIds = new Set<number>();
  #configuredShopVerified = false;

  constructor(options: EtsyReadClientOptions) {
    validateConfiguration(options);
    this.#fetch = options.fetch;
    this.#expectedShopId = options.expectedShopId;
    this.#ownerId = options.ownerId;
    this.#accessToken = options.grant.accessToken;
    this.#appKeyHeader = `${options.apiKeystring}:${options.apiSharedSecret}`;
  }

  async verifyConfiguredShop(): Promise<ShopIdentity> {
    this.#configuredShopVerified = false;
    const payload = await this.#get(`/users/${this.#ownerId}/shops`);
    const shop = parseShop(payload, this.#ownerId);
    if (shop.shopId !== this.#expectedShopId) {
      throw new EtsyReadError('identity_mismatch');
    }
    this.#configuredShopVerified = true;
    return shop;
  }

  async listActiveListings(
    options: {
      readonly pageSize?: number;
      readonly maxPages?: number;
      readonly offset?: number;
    } = {},
  ): Promise<{ readonly listings: readonly ListingSummary[]; readonly nextOffset: number | null }> {
    const pageSize = options.pageSize ?? 25;
    const maxPages = options.maxPages ?? 1;
    const startOffset = options.offset ?? 0;
    if (
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PAGE_SIZE ||
      !Number.isSafeInteger(maxPages) ||
      maxPages < 1 ||
      maxPages > MAX_PAGES ||
      !Number.isSafeInteger(startOffset) ||
      startOffset < 0 ||
      startOffset > MAX_OFFSET
    ) {
      throw new EtsyReadError('invalid_input');
    }
    await this.#ensureConfiguredShop();

    const found: ListingSummary[] = [];
    const foundIds = new Set<number>();
    let offset = startOffset;
    let totalCount: number | undefined;
    let nextOffset: number | null = null;
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      const path = `/shops/${this.#expectedShopId}/listings?state=active&limit=${pageSize}&offset=${offset}`;
      const page = parseListingPage(await this.#get(path));
      if (
        page.results.length > pageSize ||
        (totalCount !== undefined && page.count !== totalCount) ||
        offset + page.results.length > page.count
      ) {
        throw new EtsyReadError('invalid_response');
      }
      totalCount = page.count;
      for (const item of page.results) {
        const listing = parseListing(item, this.#expectedShopId, this.#ownerId, true);
        if (foundIds.has(listing.listingId)) {
          throw new EtsyReadError('invalid_response');
        }
        foundIds.add(listing.listingId);
        found.push(listing);
      }
      if (page.results.length === 0) {
        if (offset < page.count) throw new EtsyReadError('invalid_response');
        nextOffset = null;
        break;
      }
      offset += page.results.length;
      if (offset >= page.count) {
        nextOffset = null;
        break;
      }
      nextOffset = offset;
    }

    for (const listingId of foundIds) this.#knownListingIds.add(listingId);
    return { listings: found, nextOffset };
  }

  async getListing(listingId: number): Promise<ListingSummary> {
    if (!isPositiveSafeInteger(listingId)) {
      throw new EtsyReadError('invalid_input');
    }
    await this.#ensureConfiguredShop();
    if (!this.#knownListingIds.has(listingId)) {
      throw new EtsyReadError('listing_not_owned');
    }
    const value = await this.#get(`/listings/${listingId}`);
    return parseListing(value, this.#expectedShopId, this.#ownerId, false, listingId);
  }

  async #ensureConfiguredShop(): Promise<void> {
    if (!this.#configuredShopVerified) await this.verifyConfiguredShop();
  }

  async #get(path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await this.#fetch(`${API_ROOT}${path}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.#appKeyHeader,
          authorization: `Bearer ${this.#accessToken}`,
          accept: 'application/json',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        redirect: 'error',
      });
    } catch {
      throw new EtsyReadError('request_failed');
    }
    if (!response.ok) throw new EtsyReadError('request_failed');
    try {
      return await response.json();
    } catch {
      throw new EtsyReadError('invalid_response');
    }
  }
}
