const SHOP_SEARCH_ENDPOINT = 'https://openapi.etsy.com/v3/application/shops';
const SHOP_NAME = /^[A-Za-z0-9]{4,30}$/;

/** Extract only a shop name; never request the user-supplied URL. */
export function shopNameFromInput(input: string): string | undefined {
  const text = input.trim();
  if (SHOP_NAME.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text.includes('://') ? text : `https://${text}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
  const host = url.hostname.toLowerCase();
  if (host === 'etsy.com' || host === 'www.etsy.com') {
    const name = /^\/shop\/([A-Za-z0-9]{4,30})\/?$/.exec(url.pathname)?.[1];
    return name;
  }
  const subdomain = /^([a-z0-9]{4,30})\.etsy\.com$/.exec(host)?.[1];
  if (subdomain && url.pathname === '/') return subdomain;
  return undefined;
}

export type LookupResult =
  | { readonly status: 'found'; readonly shopId: number }
  | {
      readonly status: 'failed';
      readonly reason: 'cancelled' | 'invalid_input' | 'lookup_failed' | 'no_unique_match';
    };

/** Find the exact locally entered shop name without logging names, credentials, or responses. */
export async function lookupLocalShop(options: {
  readonly readHiddenInput: (prompt: string) => Promise<string>;
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
}): Promise<LookupResult> {
  let input: string;
  let key: string;
  let secret: string;
  let confirmation: string;
  try {
    input = await options.readHiddenInput(
      'Etsy shop URL or name (hidden; paste then press Return): ',
    );
    key = await options.readHiddenInput('Etsy app keystring: ');
    secret = await options.readHiddenInput('Etsy app shared secret: ');
    confirmation = await options.readHiddenInput(
      'One read-only Etsy shop search will be made. Type LOOKUP to continue: ',
    );
  } catch {
    return { status: 'failed', reason: 'cancelled' };
  }
  if (confirmation !== 'LOOKUP') return { status: 'failed', reason: 'cancelled' };
  const name = shopNameFromInput(input);
  if (
    name === undefined ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(key) ||
    !/^[A-Za-z0-9_-]{1,256}$/.test(secret)
  ) {
    return { status: 'failed', reason: 'invalid_input' };
  }
  const url = new URL(SHOP_SEARCH_ENDPOINT);
  url.searchParams.set('shop_name', name);
  url.searchParams.set('limit', '25');
  let value: unknown;
  try {
    const response = await options.fetch(url.toString(), {
      method: 'GET',
      headers: { 'x-api-key': `${key}:${secret}`, accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { status: 'failed', reason: 'lookup_failed' };
    value = await response.json();
  } catch {
    return { status: 'failed', reason: 'lookup_failed' };
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    !('results' in value) ||
    !Array.isArray(value.results) ||
    value.results.length > 25
  ) {
    return { status: 'failed', reason: 'lookup_failed' };
  }
  const matches = value.results.filter((shop: unknown) => {
    if (typeof shop !== 'object' || shop === null || !('shop_name' in shop) || !('shop_id' in shop))
      return false;
    return (
      typeof shop.shop_name === 'string' &&
      shop.shop_name.toLowerCase() === name.toLowerCase() &&
      typeof shop.shop_id === 'number' &&
      Number.isSafeInteger(shop.shop_id) &&
      shop.shop_id > 0
    );
  });
  if (matches.length !== 1) return { status: 'failed', reason: 'no_unique_match' };
  return { status: 'found', shopId: matches[0].shop_id as number };
}
