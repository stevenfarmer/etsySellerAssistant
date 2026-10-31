import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { OAuthAttempt, ValidatedCallback } from './oauth.js';
import { validateCallbackTarget } from './oauth.js';

export type CallbackServerErrorCode =
  'bind_conflict' | 'bind_failed' | 'timeout' | 'cancelled' | 'callback_invalid';

export class CallbackServerError extends Error {
  readonly code: CallbackServerErrorCode;

  constructor(code: CallbackServerErrorCode) {
    super(code);
    this.name = 'CallbackServerError';
    this.code = code;
  }
}

export interface CallbackReceiverOptions {
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

export interface CallbackReceiver {
  /** Fixed loopback URL; the authorization URL is delivered by the local redirect response. */
  readonly browserStartUrl: string;
  readonly result: Promise<ValidatedCallback>;
  close(): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const PORT = 3003;
const BROWSER_START_URL = `http://localhost:${PORT}/oauth/start`;
const INVALID_REQUEST_CLOSE_MS = 1_000;
const SERVER_CLOSE_GRACE_MS = 1_000;

function isLoopback(address: string | undefined): boolean {
  if (address === '::1' || address === '127.0.0.1') return true;
  return address?.toLowerCase().startsWith('::ffff:127.') ?? false;
}

function listen(server: Server, host: '127.0.0.1' | '::1'): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ host, port: PORT, ...(host === '::1' ? { ipv6Only: true } : {}) });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const closeTimer: { current?: NodeJS.Timeout } = {};
    const complete = (): void => {
      if (settled) return;
      settled = true;
      if (closeTimer.current !== undefined) clearTimeout(closeTimer.current);
      resolve();
    };

    if (!server.listening) {
      server.closeAllConnections();
      complete();
      return;
    }

    closeTimer.current = setTimeout(() => {
      server.closeAllConnections();
      complete();
    }, SERVER_CLOSE_GRACE_MS);
    closeTimer.current.unref();
    server.close(complete);
  });
}

function endAndCloseRequest(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: string,
  headers: Record<string, string> = {},
): void {
  const socket = req.socket;
  res.shouldKeepAlive = false;
  const destroyTimer = setTimeout(() => socket.destroy(), INVALID_REQUEST_CLOSE_MS);
  destroyTimer.unref();
  socket.once('close', () => clearTimeout(destroyTimer));
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    Connection: 'close',
    ...headers,
  });
  res.end(body, () => {
    if (!socket.destroyed) socket.end();
  });
}

/** Starts a loopback receiver and one-use local browser redirect; it does not open a browser or exchange tokens. */
export async function startCallbackReceiver(
  attempt: OAuthAttempt,
  options: CallbackReceiverOptions = {},
): Promise<CallbackReceiver> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10 * 60_000) {
    throw new CallbackServerError('bind_failed');
  }
  if (options.signal?.aborted) throw new CallbackServerError('cancelled');

  const servers: Server[] = [];
  let settled = false;
  let closePromise: Promise<void> | undefined;
  let started = false;
  let browserStartUsed = false;
  let cancelledDuringBind = false;
  const timer: { current?: NodeJS.Timeout } = {};
  let resolveResult!: (value: ValidatedCallback) => void;
  let rejectResult!: (reason: Error) => void;
  const result = new Promise<ValidatedCallback>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const finish = (callback: () => void): Promise<void> => {
    if (settled) return closePromise ?? Promise.resolve();
    settled = true;
    if (timer.current !== undefined) clearTimeout(timer.current);
    options.signal?.removeEventListener('abort', onAbort);
    closePromise = Promise.all(servers.map(closeServer)).then(() => callback());
    return closePromise;
  };

  const handleRequest = (req: IncomingMessage, res: ServerResponse): void => {
    if (!started) {
      endAndCloseRequest(req, res, 503, 'Connection flow is starting.');
      return;
    }
    const hasBody =
      (req.headers['content-length'] !== undefined && req.headers['content-length'] !== '0') ||
      req.headers['transfer-encoding'] !== undefined;
    if (
      req.method !== 'GET' ||
      req.url === undefined ||
      req.url.length > 4096 ||
      hasBody ||
      !isLoopback(req.socket.remoteAddress)
    ) {
      endAndCloseRequest(req, res, 400, 'Invalid callback.');
      finish(() => rejectResult(new CallbackServerError('callback_invalid')));
      return;
    }
    if (req.url === '/oauth/start') {
      if (req.headers.host?.toLowerCase() !== `localhost:${PORT}`) {
        endAndCloseRequest(req, res, 400, 'Invalid callback.');
        finish(() => rejectResult(new CallbackServerError('callback_invalid')));
        return;
      }
      if (browserStartUsed) {
        endAndCloseRequest(req, res, 410, 'Authorization launch already used.');
        return;
      }
      browserStartUsed = true;
      endAndCloseRequest(req, res, 302, '', { Location: attempt.authorizationUrl });
      return;
    }
    try {
      const validated = validateCallbackTarget(req.url, req.headers.host, attempt);
      endAndCloseRequest(
        req,
        res,
        200,
        'Authorization response received. You may close this window.',
      );
      finish(() => resolveResult(validated));
    } catch {
      endAndCloseRequest(
        req,
        res,
        400,
        'Authorization response could not be validated. Restart the connection flow.',
      );
      finish(() => rejectResult(new CallbackServerError('callback_invalid')));
    }
  };

  const onAbort = (): void => {
    if (!started) {
      cancelledDuringBind = true;
      return;
    }
    finish(() => rejectResult(new CallbackServerError('cancelled')));
  };
  options.signal?.addEventListener('abort', onAbort, { once: true });

  const ipv4 = createServer(handleRequest);
  servers.push(ipv4);
  try {
    await listen(ipv4, '127.0.0.1');
  } catch (error) {
    servers.splice(servers.indexOf(ipv4), 1);
    if (timer.current !== undefined) clearTimeout(timer.current);
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError(
      (error as NodeJS.ErrnoException).code === 'EADDRINUSE' ? 'bind_conflict' : 'bind_failed',
    );
  }
  if (settled || cancelledDuringBind || options.signal?.aborted) {
    await closeServer(ipv4);
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError('cancelled');
  }

  const ipv6 = createServer(handleRequest);
  servers.push(ipv6);
  try {
    await listen(ipv6, '::1');
  } catch (error) {
    servers.splice(servers.indexOf(ipv6), 1);
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') {
      await closeServer(ipv4);
      if (timer.current !== undefined) clearTimeout(timer.current);
      options.signal?.removeEventListener('abort', onAbort);
      throw new CallbackServerError('bind_conflict');
    }
    // Some supported Windows/macOS installations do not have IPv6 loopback enabled.
    if (code !== 'EAFNOSUPPORT' && code !== 'EADDRNOTAVAIL' && code !== 'ENODEV') {
      await closeServer(ipv4);
      if (timer.current !== undefined) clearTimeout(timer.current);
      options.signal?.removeEventListener('abort', onAbort);
      throw new CallbackServerError('bind_failed');
    }
  }
  if (settled || cancelledDuringBind || options.signal?.aborted) {
    await Promise.all(servers.map(closeServer));
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError('cancelled');
  }

  if (!servers.some((server) => server.listening)) {
    if (timer.current !== undefined) clearTimeout(timer.current);
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError('bind_failed');
  }
  // Assert the servers stayed on literal loopback addresses and the registered fixed port.
  if (
    servers.some((server) => {
      const address = server.address() as AddressInfo | null;
      return (
        !address ||
        address.port !== PORT ||
        (address.address !== '127.0.0.1' && address.address !== '::1')
      );
    })
  ) {
    await Promise.all(servers.map(closeServer));
    if (timer.current !== undefined) clearTimeout(timer.current);
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError('bind_failed');
  }

  if (cancelledDuringBind || options.signal?.aborted) {
    await Promise.all(servers.map(closeServer));
    options.signal?.removeEventListener('abort', onAbort);
    throw new CallbackServerError('cancelled');
  }
  started = true;
  timer.current = setTimeout(
    () => finish(() => rejectResult(new CallbackServerError('timeout'))),
    timeoutMs,
  );
  timer.current.unref();

  return {
    browserStartUrl: BROWSER_START_URL,
    result,
    close: async () => finish(() => rejectResult(new CallbackServerError('cancelled'))),
  };
}
