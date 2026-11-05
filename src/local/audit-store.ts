import { constants as fsConstants } from 'node:fs';
import * as defaultFs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import * as defaultPath from 'node:path';
import type { ListingEditProposal } from '../edits/proposal-service.js';

export type AuditOutcome = 'verified' | 'reconciled' | 'rejected' | 'uncertain';
export type AuditErrorCategory =
  'etsy_rejected' | 'transport_failed' | 'verification_failed' | 'read_failed' | 'audit_failed';

export type AuditErrorCode =
  | 'invalid_path'
  | 'invalid_record'
  | 'unsafe_path'
  | 'writer_busy'
  | 'corrupt_log'
  | 'io_failed'
  | 'lock_release_failed';

export class AuditStoreError extends Error {
  constructor(readonly code: AuditErrorCode) {
    super(`Local audit operation failed (${code}).`);
    this.name = 'AuditStoreError';
  }
}

export interface AuditFileSystem {
  mkdir(path: string, options: { recursive?: boolean; mode?: number }): Promise<string | undefined>;
  lstat(path: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
    nlink: number;
    dev: number;
    ino: number;
  }>;
  open(path: string, flags: string | number, mode?: number): Promise<FileHandle>;
  chmod(path: string, mode: number): Promise<void>;
  unlink(path: string): Promise<void>;
  rmdir(path: string): Promise<void>;
}

export interface AuditStoreOptions {
  readonly directory: string;
  readonly path?: Pick<typeof defaultPath, 'isAbsolute' | 'join' | 'basename'>;
  readonly fileSystem?: AuditFileSystem;
  readonly now?: () => Date;
  readonly createId?: () => string;
  readonly platform?: NodeJS.Platform;
}

export interface AuditReceipt {
  readonly recordId: string;
  readonly month: string;
  readonly proposalId: string;
}

export interface AuditWriter {
  appendIntent(proposal: ListingEditProposal): Promise<AuditReceipt>;
  appendOutcome(
    receipt: AuditReceipt,
    outcome: AuditOutcome,
    errorCategory?: AuditErrorCategory,
  ): Promise<void>;
}

export interface LocalAuditStore {
  withWriter<T>(operation: (writer: AuditWriter) => Promise<T>): Promise<T>;
}

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0;
const FIELDS = ['title', 'description', 'tags'] as const;
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

function asIoError(error: unknown): AuditStoreError {
  if (error instanceof AuditStoreError) return error;
  return new AuditStoreError('io_failed');
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function validateProposal(proposal: ListingEditProposal): void {
  if (
    !proposal ||
    typeof proposal !== 'object' ||
    !ID_PATTERN.test(proposal.proposalId) ||
    !isPositiveSafeInteger(proposal.listingId) ||
    !isPositiveSafeInteger(proposal.ownerId) ||
    !isPositiveSafeInteger(proposal.shopId) ||
    !Number.isSafeInteger(proposal.lastModifiedTimestamp) ||
    proposal.lastModifiedTimestamp < 0
  ) {
    throw new AuditStoreError('invalid_record');
  }
  const before = proposal.before as Record<string, unknown>;
  const after = proposal.after as Record<string, unknown>;
  const fields = Object.keys(after);
  if (
    fields.length === 0 ||
    fields.some((field) => !FIELDS.includes(field as (typeof FIELDS)[number])) ||
    fields.length !== Object.keys(before).length ||
    fields.some((field) => !Object.hasOwn(before, field))
  ) {
    throw new AuditStoreError('invalid_record');
  }
  for (const field of fields) {
    const value = after[field];
    const oldValue = before[field];
    if (field === 'tags') {
      for (const tags of [value, oldValue]) {
        if (
          !Array.isArray(tags) ||
          tags.length > 26 ||
          !tags.every((tag) => typeof tag === 'string' && tag.length <= 80)
        ) {
          throw new AuditStoreError('invalid_record');
        }
      }
    } else if (
      typeof value !== 'string' ||
      typeof oldValue !== 'string' ||
      value.length > (field === 'title' ? 560 : 32_768) ||
      oldValue.length > (field === 'title' ? 560 : 32_768)
    ) {
      throw new AuditStoreError('invalid_record');
    }
  }
}

function monthFor(date: Date): string {
  if (Number.isNaN(date.getTime())) throw new AuditStoreError('io_failed');
  return date.toISOString().slice(0, 7);
}

function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function stableFields(proposal: ListingEditProposal): readonly string[] {
  return FIELDS.filter((field) => Object.hasOwn(proposal.after, field));
}

export function createLocalAuditStore(options: AuditStoreOptions): LocalAuditStore {
  const pathApi = options.path ?? defaultPath;
  const fs = options.fileSystem ?? defaultFs;
  const directory = options.directory;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? randomUUID;
  const platform = options.platform ?? process.platform;
  const isWindows = platform === 'win32';
  if (
    typeof directory !== 'string' ||
    !pathApi.isAbsolute(directory) ||
    pathApi.basename(directory.replace(/[\\/]+$/, '')) !== 'auditTrail' ||
    !directory
      .replace(/\\/g, '/')
      .replace(/\/+$/, '')
      .endsWith('/github/etsySellerAssistant/auditTrail')
  ) {
    throw new AuditStoreError('invalid_path');
  }

  const ensureDirectory = async (): Promise<void> => {
    try {
      try {
        await fs.mkdir(directory, { mode: DIRECTORY_MODE });
      } catch (error) {
        if (!isExists(error)) throw error;
      }
      const info = await fs.lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new AuditStoreError('unsafe_path');
      if (!isWindows) await fs.chmod(directory, DIRECTORY_MODE);
    } catch (error) {
      throw asIoError(error);
    }
  };

  const acquire = async (): Promise<string> => {
    await ensureDirectory();
    const lockDirectory = pathApi.join(directory, '.writer.lock');
    try {
      await fs.mkdir(lockDirectory, { mode: DIRECTORY_MODE });
      if (!isWindows) await fs.chmod(lockDirectory, DIRECTORY_MODE);
    } catch (error) {
      if (isExists(error)) {
        try {
          const info = await fs.lstat(lockDirectory);
          if (!info.isDirectory() || info.isSymbolicLink())
            throw new AuditStoreError('unsafe_path');
        } catch (inspectError) {
          if (inspectError instanceof AuditStoreError) throw inspectError;
          throw asIoError(inspectError);
        }
        throw new AuditStoreError('writer_busy');
      }
      throw asIoError(error);
    }
    const owner = createId();
    const ownerFile = pathApi.join(lockDirectory, 'owner');
    let handle: FileHandle | undefined;
    try {
      handle = await fs.open(ownerFile, 'wx', FILE_MODE);
      if (!isWindows) await handle.chmod(FILE_MODE);
      await handle.writeFile(owner, 'utf8');
      await handle.sync();
      if (!isWindows) {
        const lockHandle = await fs.open(lockDirectory, fsConstants.O_RDONLY);
        try {
          await lockHandle.sync();
        } finally {
          await lockHandle.close();
        }
        const directoryHandle = await fs.open(directory, fsConstants.O_RDONLY);
        try {
          await directoryHandle.sync();
        } finally {
          await directoryHandle.close();
        }
      }
      return owner;
    } catch (error) {
      try {
        await handle?.close();
        await fs.rmdir(lockDirectory);
      } catch {
        // Leave an incomplete lock in place; recovery must be deliberate.
      }
      throw asIoError(error);
    } finally {
      if (handle !== undefined) {
        try {
          await handle.close();
        } catch {
          // Preserve the primary sanitized error.
        }
      }
    }
  };

  const release = async (owner: string): Promise<void> => {
    const lockDirectory = pathApi.join(directory, '.writer.lock');
    const ownerFile = pathApi.join(lockDirectory, 'owner');
    let handle: FileHandle | undefined;
    try {
      const lockInfo = await fs.lstat(lockDirectory);
      if (!lockInfo.isDirectory() || lockInfo.isSymbolicLink()) {
        throw new AuditStoreError('unsafe_path');
      }
      handle = await fs.open(ownerFile, fsConstants.O_RDONLY | O_NOFOLLOW);
      const ownerInfo = await handle.stat();
      if (
        !ownerInfo.isFile() ||
        ownerInfo.nlink !== 1 ||
        (await handle.readFile('utf8')) !== owner
      ) {
        throw new AuditStoreError('unsafe_path');
      }
      await handle.close();
      handle = undefined;
      await fs.unlink(ownerFile);
      await fs.rmdir(lockDirectory);
    } catch (error) {
      throw error instanceof AuditStoreError ? error : new AuditStoreError('lock_release_failed');
    } finally {
      await handle?.close().catch(() => undefined);
    }
  };

  const append = async (month: string, record: Record<string, unknown>): Promise<void> => {
    const filePath = pathApi.join(directory, `${month}.jsonl`);
    const serialized = `${JSON.stringify(record)}\n`;
    let handle: FileHandle | undefined;
    let pathInfo: Awaited<ReturnType<AuditFileSystem['lstat']>> | undefined;
    try {
      let existed = true;
      try {
        pathInfo = await fs.lstat(filePath);
        if (!pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.nlink !== 1) {
          throw new AuditStoreError('unsafe_path');
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
        existed = false;
      }
      const flags =
        fsConstants.O_RDWR |
        fsConstants.O_APPEND |
        O_NOFOLLOW |
        (existed ? 0 : fsConstants.O_CREAT | fsConstants.O_EXCL);
      handle = await fs.open(filePath, flags, FILE_MODE);
      const info = await handle.stat();
      if (
        !info.isFile() ||
        info.nlink !== 1 ||
        (pathInfo !== undefined && (info.dev !== pathInfo.dev || info.ino !== pathInfo.ino))
      ) {
        throw new AuditStoreError('unsafe_path');
      }
      if (!isWindows) await handle.chmod(FILE_MODE);
      if (info.size > 0) {
        const content = await handle.readFile('utf8');
        if (!content.endsWith('\n')) throw new AuditStoreError('corrupt_log');
        for (const line of content.slice(0, -1).split('\n')) {
          try {
            JSON.parse(line);
          } catch {
            throw new AuditStoreError('corrupt_log');
          }
        }
      }
      await handle.writeFile(serialized, 'utf8');
      await handle.sync();
      if (!existed && !isWindows) {
        const directoryHandle = await fs.open(directory, fsConstants.O_RDONLY);
        try {
          await directoryHandle.sync();
        } finally {
          await directoryHandle.close();
        }
      }
    } catch (error) {
      throw asIoError(error);
    } finally {
      await handle?.close().catch(() => undefined);
    }
  };

  return {
    async withWriter<T>(operation: (writer: AuditWriter) => Promise<T>): Promise<T> {
      const owner = await acquire();
      let result: T | undefined;
      let operationError: unknown;
      try {
        const writer: AuditWriter = {
          async appendIntent(proposal): Promise<AuditReceipt> {
            validateProposal(proposal);
            const time = now();
            const month = monthFor(time);
            const recordId = createId();
            const record = {
              schemaVersion: 1,
              recordType: 'intent',
              recordId,
              occurredAt: time.toISOString(),
              actor: 'local-owner',
              proposalId: proposal.proposalId,
              proposalDigest: createHash('sha256').update(JSON.stringify(proposal)).digest('hex'),
              ownerId: proposal.ownerId,
              shopId: proposal.shopId,
              listingId: proposal.listingId,
              changedFields: stableFields(proposal),
              before: proposal.before,
              after: proposal.after,
              outcome: 'pending',
            };
            await append(month, record);
            return Object.freeze({ recordId, month, proposalId: proposal.proposalId });
          },

          async appendOutcome(receipt, outcome, errorCategory): Promise<void> {
            if (
              !receipt ||
              !ID_PATTERN.test(receipt.recordId) ||
              !ID_PATTERN.test(receipt.proposalId) ||
              !isMonth(receipt.month) ||
              !['verified', 'reconciled', 'rejected', 'uncertain'].includes(outcome) ||
              (errorCategory !== undefined &&
                ![
                  'etsy_rejected',
                  'transport_failed',
                  'verification_failed',
                  'read_failed',
                  'audit_failed',
                ].includes(errorCategory))
            ) {
              throw new AuditStoreError('invalid_record');
            }
            const time = now();
            await append(receipt.month, {
              schemaVersion: 1,
              recordType: 'outcome',
              recordId: createId(),
              intentRecordId: receipt.recordId,
              occurredAt: time.toISOString(),
              actor: 'local-owner',
              proposalId: receipt.proposalId,
              outcome,
              ...(errorCategory === undefined ? {} : { errorCategory }),
            });
          },
        };
        result = await operation(writer);
      } catch (error) {
        operationError = error;
      }
      try {
        await release(owner);
      } catch (error) {
        if (operationError === undefined) throw error;
      }
      if (operationError !== undefined) throw operationError;
      return result as T;
    },
  };
}
