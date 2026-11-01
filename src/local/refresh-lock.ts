import { constants as fsConstants } from 'node:fs';
import * as defaultFs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import * as defaultPath from 'node:path';
import { randomBytes } from 'node:crypto';

const LOCK_DIRECTORY_NAME = 'refresh.lock';
const OWNER_FILENAME = 'owner.json';
const STATE_FILENAME = 'token-state.json';
const POSIX_DIRECTORY_MODE = 0o700;
const POSIX_FILE_MODE = 0o600;
const MAX_METADATA_BYTES = 2048;
const OWNER_VERSION = 1;
const STATE_VERSION = 1;

export type RefreshCoordinationErrorCode =
  | 'invalid_input'
  | 'busy'
  | 'timeout'
  | 'recovery_required'
  | 'ownership_lost'
  | 'invalid_state'
  | 'unsafe_path'
  | 'io_failed';

export class RefreshCoordinationError extends Error {
  readonly code: RefreshCoordinationErrorCode;

  constructor(code: RefreshCoordinationErrorCode) {
    super(`Refresh coordination failed (${code}).`);
    this.name = 'RefreshCoordinationError';
    this.code = code;
  }
}

interface FileInfo {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface RefreshCoordinationFileSystem {
  mkdir(
    path: string,
    options?: { recursive?: boolean; mode?: number },
  ): Promise<string | undefined>;
  chmod(path: string, mode: number): Promise<void>;
  lstat(path: string): Promise<FileInfo>;
  open(path: string, flags: string | number, mode?: number): Promise<FileHandle>;
  rename(oldPath: string, newPath: string): Promise<void>;
  rm(path: string, options: { recursive: true; force: true }): Promise<void>;
}

export interface RefreshLockOptions {
  /** Must be a trusted, per-user local application directory, not a synced/network folder. */
  readonly directory: string;
  readonly waitTimeoutMs?: number;
  readonly retryIntervalMs?: number;
  readonly platform?: NodeJS.Platform;
  readonly path?: Pick<typeof defaultPath, 'isAbsolute' | 'join' | 'resolve'>;
  readonly fileSystem?: RefreshCoordinationFileSystem;
  readonly now?: () => number;
}

interface LockOwner {
  readonly version: 1;
  readonly pid: number;
  readonly nonce: string;
  readonly createdAt: number;
}

export interface RefreshLockLease {
  readonly directory: string;
  assertOwned(): Promise<void>;
  release(): Promise<void>;
}

export type RefreshState =
  | { readonly status: 'refreshing'; readonly expiresAtMs: null }
  | { readonly status: 'ready'; readonly expiresAtMs: number };

export interface RefreshStateStore {
  read(lease: RefreshLockLease): Promise<RefreshState | undefined>;
  markRefreshing(lease: RefreshLockLease): Promise<void>;
  markReady(lease: RefreshLockLease, expiresAtMs: number): Promise<void>;
  clear(lease: RefreshLockLease): Promise<void>;
}

function safeCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { readonly code?: unknown }).code
    : undefined;
}

function isMissing(error: unknown): boolean {
  return safeCode(error) === 'ENOENT';
}

function asIoError(error: unknown): RefreshCoordinationError {
  if (error instanceof RefreshCoordinationError) return error;
  return new RefreshCoordinationError('io_failed');
}

function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseOwner(serialized: string): LockOwner {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new RefreshCoordinationError('recovery_required');
  }
  if (
    !exactRecord(value, ['version', 'pid', 'nonce', 'createdAt']) ||
    value.version !== OWNER_VERSION ||
    !Number.isSafeInteger(value.pid) ||
    (value.pid as number) <= 0 ||
    typeof value.nonce !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.nonce) ||
    !Number.isSafeInteger(value.createdAt) ||
    (value.createdAt as number) <= 0
  ) {
    throw new RefreshCoordinationError('recovery_required');
  }
  return value as unknown as LockOwner;
}

function parseState(serialized: string): RefreshState {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new RefreshCoordinationError('invalid_state');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RefreshCoordinationError('invalid_state');
  }
  const record = value as Record<string, unknown>;
  if (record.version !== STATE_VERSION) throw new RefreshCoordinationError('invalid_state');
  if (
    exactRecord(value, ['version', 'status', 'expiresAtMs']) &&
    record.status === 'refreshing' &&
    record.expiresAtMs === null
  ) {
    return { status: 'refreshing', expiresAtMs: null };
  }
  if (
    exactRecord(value, ['version', 'status', 'expiresAtMs']) &&
    record.status === 'ready' &&
    Number.isSafeInteger(record.expiresAtMs) &&
    (record.expiresAtMs as number) > 0
  ) {
    return { status: 'ready', expiresAtMs: record.expiresAtMs as number };
  }
  throw new RefreshCoordinationError('invalid_state');
}

async function ensureDirectory(
  directory: string,
  platform: NodeJS.Platform,
  fileSystem: RefreshCoordinationFileSystem,
): Promise<void> {
  let info: FileInfo;
  try {
    info = await fileSystem.lstat(directory);
  } catch {
    throw new RefreshCoordinationError('unsafe_path');
  }
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new RefreshCoordinationError('unsafe_path');
  }
  if (platform !== 'win32') {
    try {
      await fileSystem.chmod(directory, POSIX_DIRECTORY_MODE);
    } catch {
      throw new RefreshCoordinationError('io_failed');
    }
  }
}

async function readSmallFile(
  fileSystem: RefreshCoordinationFileSystem,
  path: string,
  missingCode: 'missing' | 'error',
  malformedCode: 'invalid_state' | 'recovery_required' = 'invalid_state',
): Promise<string | undefined> {
  let info: FileInfo;
  try {
    info = await fileSystem.lstat(path);
  } catch (error) {
    if (missingCode === 'missing' && isMissing(error)) return undefined;
    throw asIoError(error);
  }
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new RefreshCoordinationError('unsafe_path');
  }
  let handle: FileHandle;
  try {
    handle = await fileSystem.open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  } catch (error) {
    if (missingCode === 'missing' && isMissing(error)) return undefined;
    throw asIoError(error);
  }
  try {
    if ((await handle.stat()).size > MAX_METADATA_BYTES) {
      throw new RefreshCoordinationError(malformedCode);
    }
    return await handle.readFile('utf8');
  } catch (error) {
    throw asIoError(error);
  } finally {
    try {
      await handle.close();
    } catch {
      // Preserve the primary result with a sanitized error.
    }
  }
}

async function removeTree(fileSystem: RefreshCoordinationFileSystem, path: string): Promise<void> {
  try {
    await fileSystem.rm(path, { recursive: true, force: true });
  } catch {
    throw new RefreshCoordinationError('io_failed');
  }
}

async function readLockOwner(
  fileSystem: RefreshCoordinationFileSystem,
  lockDirectory: string,
  pathApi: Pick<typeof defaultPath, 'join'>,
): Promise<LockOwner> {
  let lockInfo: FileInfo;
  try {
    lockInfo = await fileSystem.lstat(lockDirectory);
  } catch (error) {
    if (isMissing(error)) throw new RefreshCoordinationError('busy');
    throw asIoError(error);
  }
  if (!lockInfo.isDirectory() || lockInfo.isSymbolicLink()) {
    throw new RefreshCoordinationError('unsafe_path');
  }
  const serialized = await readSmallFile(
    fileSystem,
    pathApi.join(lockDirectory, OWNER_FILENAME),
    'missing',
    'recovery_required',
  );
  if (serialized === undefined) throw new RefreshCoordinationError('recovery_required');
  return parseOwner(serialized);
}

async function createClaim(
  directory: string,
  lockDirectory: string,
  nonce: string,
  owner: LockOwner,
  fileSystem: RefreshCoordinationFileSystem,
  platform: NodeJS.Platform,
  pathApi: Pick<typeof defaultPath, 'join'>,
): Promise<RefreshLockLease> {
  const ownerPath = pathApi.join(lockDirectory, OWNER_FILENAME);
  try {
    // mkdir on the fixed path is the atomic claim. Do not claim via rename:
    // POSIX may replace an existing empty destination directory.
    await fileSystem.mkdir(lockDirectory, { mode: POSIX_DIRECTORY_MODE });
  } catch (error) {
    if (safeCode(error) === 'EEXIST') {
      try {
        await readLockOwner(fileSystem, lockDirectory, pathApi);
        throw new RefreshCoordinationError('busy');
      } catch (lockError) {
        if (lockError instanceof RefreshCoordinationError) throw lockError;
        throw asIoError(lockError);
      }
    }
    throw asIoError(error);
  }

  try {
    if (platform !== 'win32') await fileSystem.chmod(lockDirectory, POSIX_DIRECTORY_MODE);
    const ownerFile = await fileSystem.open(ownerPath, 'wx', POSIX_FILE_MODE);
    try {
      await ownerFile.writeFile(`${JSON.stringify(owner)}\n`, 'utf8');
      await ownerFile.sync();
    } finally {
      await ownerFile.close();
    }
    if (platform !== 'win32') await fileSystem.chmod(ownerPath, POSIX_FILE_MODE);
  } catch {
    // We own the directory, but may not know whether owner metadata reached
    // disk. Preserve it for explicit manual recovery; never delete on failure.
    throw new RefreshCoordinationError('recovery_required');
  }

  let released = false;
  return {
    directory,
    async assertOwned(): Promise<void> {
      if (released) throw new RefreshCoordinationError('ownership_lost');
      let existing: LockOwner;
      try {
        existing = await readLockOwner(fileSystem, lockDirectory, pathApi);
      } catch {
        throw new RefreshCoordinationError('ownership_lost');
      }
      if (existing.nonce !== nonce || existing.pid !== owner.pid) {
        throw new RefreshCoordinationError('ownership_lost');
      }
    },
    async release(): Promise<void> {
      if (released) return;
      let existing: LockOwner;
      try {
        existing = await readLockOwner(fileSystem, lockDirectory, pathApi);
      } catch {
        throw new RefreshCoordinationError('ownership_lost');
      }
      if (existing.nonce !== nonce || existing.pid !== owner.pid) {
        throw new RefreshCoordinationError('ownership_lost');
      }
      const tombstone = pathApi.join(directory, `.refresh-released-${nonce}`);
      try {
        await fileSystem.rename(lockDirectory, tombstone);
      } catch {
        throw new RefreshCoordinationError('ownership_lost');
      }
      released = true;
      await removeTree(fileSystem, tombstone);
    },
  };
}

export async function acquireRefreshLock(options: RefreshLockOptions): Promise<RefreshLockLease> {
  const pathApi = options.path ?? defaultPath;
  const fileSystem = options.fileSystem ?? defaultFs;
  const platform = options.platform ?? process.platform;
  const now = options.now ?? Date.now;
  const waitTimeoutMs = options.waitTimeoutMs ?? 0;
  const retryIntervalMs = options.retryIntervalMs ?? 50;
  if (
    typeof options.directory !== 'string' ||
    !pathApi.isAbsolute(options.directory) ||
    !Number.isSafeInteger(waitTimeoutMs) ||
    waitTimeoutMs < 0 ||
    !Number.isSafeInteger(retryIntervalMs) ||
    retryIntervalMs < 1 ||
    typeof now !== 'function'
  ) {
    throw new RefreshCoordinationError('invalid_input');
  }
  const directory = pathApi.resolve(options.directory);
  await ensureDirectory(directory, platform, fileSystem);
  const lockDirectory = pathApi.join(directory, LOCK_DIRECTORY_NAME);
  const deadline = now() + waitTimeoutMs;
  while (true) {
    const nonce = randomBytes(32).toString('hex');
    const owner: LockOwner = {
      version: OWNER_VERSION,
      pid: process.pid,
      nonce,
      createdAt: now(),
    };
    try {
      return await createClaim(
        directory,
        lockDirectory,
        nonce,
        owner,
        fileSystem,
        platform,
        pathApi,
      );
    } catch (error) {
      if (
        !(error instanceof RefreshCoordinationError) ||
        (error.code !== 'busy' && error.code !== 'recovery_required')
      )
        throw error;
      if (now() >= deadline) {
        if (error.code === 'recovery_required') throw error;
        throw new RefreshCoordinationError(waitTimeoutMs === 0 ? 'busy' : 'timeout');
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(retryIntervalMs, deadline - now())),
      );
    }
  }
}

export interface RefreshStateStoreOptions {
  readonly directory: string;
  readonly platform?: NodeJS.Platform;
  readonly path?: Pick<typeof defaultPath, 'isAbsolute' | 'join' | 'resolve'>;
  readonly fileSystem?: RefreshCoordinationFileSystem;
}

export function createRefreshStateStore(options: RefreshStateStoreOptions): RefreshStateStore {
  const pathApi = options.path ?? defaultPath;
  const fileSystem = options.fileSystem ?? defaultFs;
  const platform = options.platform ?? process.platform;
  if (!pathApi.isAbsolute(options.directory)) throw new RefreshCoordinationError('invalid_input');
  const directory = pathApi.resolve(options.directory);
  const statePath = pathApi.join(directory, STATE_FILENAME);
  const isWindows = platform === 'win32';

  const writeState = async (lease: RefreshLockLease, state: RefreshState): Promise<void> => {
    if (lease.directory !== directory) throw new RefreshCoordinationError('ownership_lost');
    await lease.assertOwned();
    const temporaryPath = pathApi.join(
      directory,
      `.token-state-${randomBytes(16).toString('hex')}.tmp`,
    );
    let handle: FileHandle | undefined;
    try {
      const info = await fileSystem.lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) {
        throw new RefreshCoordinationError('unsafe_path');
      }
      try {
        const existing = await fileSystem.lstat(statePath);
        if (!existing.isFile() || existing.isSymbolicLink()) {
          throw new RefreshCoordinationError('unsafe_path');
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      handle = await fileSystem.open(temporaryPath, 'wx', POSIX_FILE_MODE);
      const serialized = JSON.stringify({
        version: STATE_VERSION,
        status: state.status,
        expiresAtMs: state.expiresAtMs,
      });
      await handle.writeFile(`${serialized}\n`, 'utf8');
      await handle.sync();
      await handle.close();
      handle = undefined;
      if (!isWindows) await fileSystem.chmod(temporaryPath, POSIX_FILE_MODE);
      await lease.assertOwned();
      await fileSystem.rename(temporaryPath, statePath);
    } catch (error) {
      throw asIoError(error);
    } finally {
      if (handle !== undefined) {
        try {
          await handle.close();
        } catch {
          // Preserve the primary result.
        }
      }
      try {
        await fileSystem.rm(temporaryPath, { recursive: true, force: true });
      } catch {
        // The temp path has either been renamed or is unavailable.
      }
    }
  };

  return {
    async clear(lease): Promise<void> {
      if (lease.directory !== directory) throw new RefreshCoordinationError('ownership_lost');
      await lease.assertOwned();
      try {
        const info = await fileSystem.lstat(statePath);
        if (!info.isFile() || info.isSymbolicLink())
          throw new RefreshCoordinationError('unsafe_path');
        await fileSystem.rm(statePath, { recursive: true, force: true });
      } catch (error) {
        if (!isMissing(error)) throw asIoError(error);
      }
    },
    async read(lease): Promise<RefreshState | undefined> {
      if (lease.directory !== directory) throw new RefreshCoordinationError('ownership_lost');
      await lease.assertOwned();
      await ensureDirectory(directory, platform, fileSystem);
      const serialized = await readSmallFile(fileSystem, statePath, 'missing');
      return serialized === undefined ? undefined : parseState(serialized);
    },
    async markRefreshing(lease): Promise<void> {
      const current = await this.read(lease);
      if (current?.status === 'refreshing') {
        throw new RefreshCoordinationError('recovery_required');
      }
      await writeState(lease, { status: 'refreshing', expiresAtMs: null });
    },
    async markReady(lease, expiresAtMs): Promise<void> {
      if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= 0) {
        throw new RefreshCoordinationError('invalid_state');
      }
      const current = await this.read(lease);
      if (current?.status !== 'refreshing') throw new RefreshCoordinationError('invalid_state');
      await writeState(lease, { status: 'ready', expiresAtMs });
    },
  };
}

export function isRefreshStateFresh(
  state: RefreshState | undefined,
  nowMs: number,
  expirySkewMs: number,
): boolean {
  return (
    Number.isSafeInteger(nowMs) &&
    Number.isSafeInteger(expirySkewMs) &&
    expirySkewMs >= 0 &&
    state?.status === 'ready' &&
    state.expiresAtMs - expirySkewMs > nowMs
  );
}

/** Always release an owned lease; cleanup must not replace an operation failure. */
export async function withRefreshLease<T>(
  lease: RefreshLockLease,
  work: () => Promise<T>,
): Promise<T> {
  let result: T;
  try {
    result = await work();
  } catch (error) {
    try {
      await lease.release();
    } catch {
      // The primary error already reports failure; retain its typed recovery diagnosis.
    }
    throw error;
  }
  try {
    await lease.release();
  } catch (error) {
    throw asIoError(error);
  }
  return result;
}
