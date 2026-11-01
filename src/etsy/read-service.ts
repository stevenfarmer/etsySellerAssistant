import { EtsyReadClient, type ListingSummary } from './read-client.js';
import type { LocalConfigStore } from '../local/config.js';
import type { SecretStore } from '../secret-store.js';
import type { RefreshLockLease } from '../local/refresh-lock.js';

export type PublicListing = Omit<ListingSummary, 'shopId'>;

export type SessionConnectionStatus =
  | { readonly etsyAccess: 'not_checked' }
  | {
      readonly etsyAccess: 'verified_this_session';
      readonly connection: {
        readonly ownerId: number;
        readonly shopId: number;
        readonly lastVerifiedAt: string;
      };
    };

export interface ReadServiceOptions {
  readonly config: LocalConfigStore;
  readonly store: SecretStore;
  readonly fetch: typeof fetch;
  readonly getAccessToken: (ownerId: number, lease: RefreshLockLease) => Promise<string>;
  readonly withLock: <T>(work: (lease: RefreshLockLease) => Promise<T>) => Promise<T>;
}

/** One configured shop, fixed read operations, and no caller-provided Etsy endpoint. */
export function createReadService(options: ReadServiceOptions) {
  let cached:
    | {
        readonly shopId: number;
        readonly ownerId: number;
        readonly token: string;
        readonly key: string;
        readonly secret: string;
        readonly client: EtsyReadClient;
      }
    | undefined;
  const client = async (lease: RefreshLockLease) => {
    const config = await options.config.read();
    if (!config) throw new Error('not_configured');
    const [key, secret, refresh] = await Promise.all([
      options.store.get('appKeystring'),
      options.store.get('appSharedSecret'),
      options.store.get('refreshToken'),
    ]);
    const prefix = typeof refresh === 'string' ? /^([1-9][0-9]*)\./.exec(refresh)?.[1] : undefined;
    const ownerId = Number(prefix);
    if (!key || !secret || !Number.isSafeInteger(ownerId) || ownerId <= 0)
      throw new Error('not_configured');
    const token = await options.getAccessToken(ownerId, lease);
    if (
      !cached ||
      cached.shopId !== config.expectedShopId ||
      cached.ownerId !== ownerId ||
      cached.token !== token ||
      cached.key !== key ||
      cached.secret !== secret
    ) {
      cached = {
        shopId: config.expectedShopId,
        ownerId,
        token,
        key,
        secret,
        client: new EtsyReadClient({
          fetch: options.fetch,
          expectedShopId: config.expectedShopId,
          ownerId,
          grant: { accessToken: token, scopes: ['listings_r'] },
          apiKeystring: key,
          apiSharedSecret: secret,
        }),
      };
    }
    const identity = await cached.client.verifyConfiguredShop();
    return { client: cached.client, identity };
  };
  const omitShopId = (listing: ListingSummary): PublicListing => ({
    listingId: listing.listingId,
    title: listing.title,
    description: listing.description,
    tags: listing.tags,
    categoryId: listing.categoryId,
    price: listing.price,
    quantity: listing.quantity,
    state: listing.state,
    url: listing.url,
  });
  let sequence = 0;
  let status: SessionConnectionStatus = { etsyAccess: 'not_checked' };
  const read = async <T>(work: (client: EtsyReadClient) => Promise<T>): Promise<T> => {
    const request = ++sequence;
    status = { etsyAccess: 'not_checked' };
    // Publish only after the full operation, including lock release, succeeds.
    const completed = await options.withLock(async (lease) => {
      const verified = await client(lease);
      const result = await work(verified.client);
      return {
        result,
        connection: {
          ownerId: verified.identity.ownerId,
          shopId: verified.identity.shopId,
          lastVerifiedAt: new Date().toISOString(),
        },
      };
    });
    // A later pending/failed request must not be overwritten by an older completion.
    if (request === sequence) {
      status = { etsyAccess: 'verified_this_session', connection: completed.connection };
    }
    return completed.result;
  };
  return {
    getConnectionStatus(): SessionConnectionStatus {
      return status.etsyAccess === 'verified_this_session'
        ? { etsyAccess: status.etsyAccess, connection: { ...status.connection } }
        : { etsyAccess: 'not_checked' };
    },
    async listActiveListings(input: { readonly pageSize?: number; readonly offset?: number }) {
      return read(async (client) => {
        const result = await client.listActiveListings({ ...input, maxPages: 1 });
        return { listings: result.listings.map(omitShopId), nextOffset: result.nextOffset };
      });
    },
    async getListing(listingId: number): Promise<PublicListing> {
      return read(async (client) => omitShopId(await client.getListing(listingId)));
    },
  };
}
