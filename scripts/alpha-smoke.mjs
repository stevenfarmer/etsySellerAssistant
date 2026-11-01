import { spawn } from 'node:child_process';
import process from 'node:process';
import { createInterface } from 'node:readline';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath, URL } from 'node:url';

// A first read can wait for the lock plus one 15s refresh and two 15s GETs.
// Allow a margin so the smoke test does not terminate a valid refresh mid-flight.
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 180_000;
const ALPHA_ENTRY = fileURLToPath(new URL('../dist/src/alpha.js', import.meta.url));

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseToolPayload(result) {
  if (!isRecord(result) || result.isError === true || !Array.isArray(result.content)) {
    throw new Error('smoke_failed');
  }
  const textContent = result.content.filter(
    (item) => isRecord(item) && item.type === 'text' && typeof item.text === 'string',
  );
  if (textContent.length !== 1) throw new Error('smoke_failed');
  let value;
  try {
    value = JSON.parse(textContent[0].text);
  } catch {
    throw new Error('smoke_failed');
  }
  return value;
}

function parseListingPage(result) {
  const value = parseToolPayload(result);
  if (
    !isRecord(value) ||
    !Array.isArray(value.listings) ||
    value.listings.length > 1 ||
    !value.listings.every(isRecord) ||
    !(value.nextOffset === null || (Number.isSafeInteger(value.nextOffset) && value.nextOffset > 0))
  ) {
    throw new Error('smoke_failed');
  }
  return value.listings;
}

function validateListingResult(result) {
  return parseListingPage(result).length;
}

const DETAIL_FIELDS = [
  'categoryId',
  'description',
  'listingId',
  'price',
  'quantity',
  'state',
  'tags',
  'title',
  'url',
];
const PRICE_FIELDS = ['amount', 'currencyCode', 'divisor'];
const LISTING_STATES = new Set(['active', 'inactive', 'sold_out', 'draft', 'expired']);

function validateDetailResult(result, expectedListingId) {
  const detail = parseToolPayload(result);
  if (
    !isRecord(detail) ||
    detail.listingId !== expectedListingId ||
    Object.keys(detail).length !== DETAIL_FIELDS.length ||
    Object.keys(detail).some((key) => !DETAIL_FIELDS.includes(key)) ||
    !Number.isSafeInteger(detail.listingId) ||
    detail.listingId <= 0 ||
    typeof detail.title !== 'string' ||
    typeof detail.description !== 'string' ||
    !Array.isArray(detail.tags) ||
    !detail.tags.every((tag) => typeof tag === 'string') ||
    !(
      detail.categoryId === null ||
      (Number.isSafeInteger(detail.categoryId) && detail.categoryId > 0)
    ) ||
    !isRecord(detail.price) ||
    Object.keys(detail.price).length !== 3 ||
    Object.keys(detail.price).some((key) => !PRICE_FIELDS.includes(key)) ||
    !Number.isSafeInteger(detail.price.amount) ||
    detail.price.amount < 0 ||
    !Number.isSafeInteger(detail.price.divisor) ||
    detail.price.divisor <= 0 ||
    typeof detail.price.currencyCode !== 'string' ||
    detail.price.currencyCode.length === 0 ||
    !Number.isSafeInteger(detail.quantity) ||
    detail.quantity < 0 ||
    typeof detail.state !== 'string' ||
    !LISTING_STATES.has(detail.state) ||
    typeof detail.url !== 'string'
  ) {
    throw new Error('smoke_failed');
  }
}

export function createStdioTransport(spawnProcess = spawn) {
  const child = spawnProcess(process.execPath, [ALPHA_ENTRY], {
    stdio: ['pipe', 'pipe', 'ignore'],
    windowsHide: true,
  });
  const lines = createInterface({ input: child.stdout });
  const pending = new Map();
  let nextId = 1;
  let closed = false;

  lines.on('line', (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      rejectPending();
      return;
    }
    if (!isRecord(message) || !Number.isSafeInteger(message.id)) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (isRecord(message.error)) waiter.reject(new Error('smoke_failed'));
    else waiter.resolve(message.result);
  });
  child.once('error', rejectPending);
  child.once('exit', rejectPending);

  function rejectPending() {
    for (const waiter of pending.values()) waiter.reject(new Error('smoke_failed'));
    pending.clear();
  }

  return {
    request(method, params, timeoutMs) {
      if (closed) return Promise.reject(new Error('smoke_failed'));
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error('smoke_failed'));
        }, timeoutMs);
        pending.set(id, {
          resolve(value) {
            clearTimeout(timeout);
            resolve(value);
          },
          reject(error) {
            clearTimeout(timeout);
            reject(error);
          },
        });
        try {
          child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
        } catch {
          pending.delete(id);
          clearTimeout(timeout);
          reject(new Error('smoke_failed'));
        }
      });
    },
    notify(method, params) {
      if (closed) throw new Error('smoke_failed');
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
    },
    async close() {
      if (closed) return;
      closed = true;
      lines.close();
      rejectPending();
      if (child.exitCode === null && child.signalCode === null) child.kill();
    },
  };
}

/** Runs a bounded MCP smoke check. Inject transportFactory for offline tests. */
export async function runAlphaSmoke(options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const detailMode = options.detail === true;
  const transportFactory = options.transportFactory ?? (() => createStdioTransport());
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    return { status: 'failed' };
  }

  let transport;
  let timer;
  try {
    transport = await transportFactory();
    const timeoutFailure = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('smoke_failed')), timeoutMs);
    });
    const run = async () => {
      const initialized = await transport.request(
        'initialize',
        {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'alpha-smoke', version: '1.0.0' },
        },
        timeoutMs,
      );
      if (!isRecord(initialized) || !isRecord(initialized.serverInfo)) {
        throw new Error('smoke_failed');
      }
      transport.notify('notifications/initialized', {});
      const inventory = await transport.request('tools/list', {}, timeoutMs);
      if (!isRecord(inventory) || !Array.isArray(inventory.tools)) {
        throw new Error('smoke_failed');
      }
      const names = inventory.tools
        .filter((tool) => isRecord(tool) && typeof tool.name === 'string')
        .map((tool) => tool.name);
      const expectedNames = ['get_listing', 'get_setup_status', 'list_active_listings'];
      if (
        names.length !== inventory.tools.length ||
        new Set(names).size !== names.length ||
        names.some((name) => ![...expectedNames, 'get_review_guidance'].includes(name)) ||
        expectedNames.some((name) => !names.includes(name)) ||
        inventory.tools.some(
          (tool) =>
            !isRecord(tool) ||
            ((tool.name === 'list_active_listings' ||
              tool.name === 'get_listing' ||
              tool.name === 'get_review_guidance') &&
              (!isRecord(tool.annotations) ||
                tool.annotations.readOnlyHint !== true ||
                tool.annotations.destructiveHint !== false)),
        )
      ) {
        throw new Error('smoke_failed');
      }
      const result = await transport.request(
        'tools/call',
        { name: 'list_active_listings', arguments: { pageSize: 1, offset: 0 } },
        timeoutMs,
      );
      const listings = parseListingPage(result);
      const listingCount = validateListingResult(result);
      if (detailMode) {
        if (listingCount !== 1) throw new Error('smoke_failed');
        const listed = listings[0];
        if (!isRecord(listed) || !Number.isSafeInteger(listed.listingId) || listed.listingId <= 0) {
          throw new Error('smoke_failed');
        }
        const detail = await transport.request(
          'tools/call',
          { name: 'get_listing', arguments: { listingId: listed.listingId } },
          timeoutMs,
        );
        validateDetailResult(detail, listed.listingId);
      }
      return listingCount;
    };
    const listingCount = await Promise.race([run(), timeoutFailure]);
    return { status: 'passed', listingCount };
  } catch {
    return { status: 'failed' };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    try {
      await transport?.close();
    } catch {
      // Cleanup failures never include or reveal process output.
    }
  }
}

export function formatAlphaSmokeResult(result) {
  return result?.status === 'passed' && (result.listingCount === 0 || result.listingCount === 1)
    ? `Alpha smoke passed (listings: ${result.listingCount}).\n`
    : 'Alpha smoke failed.\n';
}

export function parseAlphaSmokeArgs(args) {
  if (
    !Array.isArray(args) ||
    args.some((argument) => argument !== '--detail') ||
    args.filter((argument) => argument === '--detail').length > 1
  ) {
    return undefined;
  }
  return { detail: args.includes('--detail') };
}

async function main(args = process.argv.slice(2)) {
  const parsed = parseAlphaSmokeArgs(args);
  if (parsed === undefined) {
    process.stderr.write(formatAlphaSmokeResult({ status: 'failed' }));
    process.exitCode = 1;
    return;
  }
  const result = await runAlphaSmoke(parsed);
  if (result.status === 'passed') {
    process.stdout.write(formatAlphaSmokeResult(result));
    return;
  }
  process.stderr.write(formatAlphaSmokeResult(result));
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().catch(() => {
    process.stderr.write(formatAlphaSmokeResult({ status: 'failed' }));
    process.exitCode = 1;
  });
}
