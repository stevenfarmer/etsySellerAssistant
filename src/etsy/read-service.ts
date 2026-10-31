import { EtsyReadClient, type ListingSummary } from './read-client.js';
import type { LocalConfigStore } from '../local/config.js';
import type { SecretStore } from '../secret-store.js';
import type { RefreshLockLease } from '../local/refresh-lock.js';

export type PublicListing = Omit<ListingSummary, 'shopId'>;

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
  const client = async (lease: RefreshLockLease): Promise<EtsyReadClient> => {
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
    await cached.client.verifyConfiguredShop();
    return cached.client;
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
  return {
    async listActiveListings(input: { readonly pageSize?: number; readonly offset?: number }) {
      return options.withLock(async (lease) => {
        const result = await (await client(lease)).listActiveListings({ ...input, maxPages: 1 });
        return { listings: result.listings.map(omitShopId), nextOffset: result.nextOffset };
      });
    },
    async getListing(listingId: number): Promise<PublicListing> {
      return options.withLock(async (lease) =>
        omitShopId(await (await client(lease)).getListing(listingId)),
      );
    },
  };
}
