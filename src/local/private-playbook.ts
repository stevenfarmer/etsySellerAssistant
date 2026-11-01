import { constants, type Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { resolveLocalConfigDirectory, type LocalConfigOptions } from './config.js';

export const PRIVATE_PLAYBOOK_FILENAME = 'playbook.private.md';
export const MAX_PLAYBOOK_BYTES = 64 * 1024;

export type PlaybookErrorCode =
  | 'invalid_path'
  | 'unsafe_path'
  | 'unsafe_permissions'
  | 'too_large'
  | 'invalid_content'
  | 'changed_file'
  | 'io_failed';

export class PlaybookError extends Error {
  constructor(readonly code: PlaybookErrorCode) {
    super(`Private guidance could not be loaded (${code}).`);
    this.name = 'PlaybookError';
  }
}

export interface PlaybookHandle {
  stat(): Promise<Stats>;
  read(
    buffer: Buffer,
    offset: number,
    length: number,
    position: number,
  ): Promise<{ bytesRead: number }>;
  close(): Promise<void>;
}

export interface PlaybookFileSystem {
  lstat(location: string): Promise<Stats>;
  realpath(location: string): Promise<string>;
  open(location: string, flags: number): Promise<PlaybookHandle>;
}

export interface PrivatePlaybookOptions {
  /** Trusted application configuration, never a model-supplied tool argument. */
  readonly directory: string;
  readonly repositoryDirectory: string;
  readonly fileSystem?: PlaybookFileSystem;
}

/** Resolves a location only; never creates directories or reads guidance. */
export function resolvePrivatePlaybookDirectory(
  options: Pick<
    LocalConfigOptions,
    'directory' | 'platform' | 'homeDirectory' | 'localAppData' | 'path'
  > = {},
): string {
  const base = resolveLocalConfigDirectory(options);
  return options.directory === undefined ? (options.path ?? path).join(base, 'guidance') : base;
}

function missing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function safeError(error: unknown): PlaybookError {
  return error instanceof PlaybookError ? error : new PlaybookError('io_failed');
}

function inside(root: string, location: string): boolean {
  const relative = path.relative(root, location);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

function privatePermissions(info: Stats): void {
  if (
    process.platform !== 'win32' &&
    ((info.mode & 0o077) !== 0 || info.uid !== process.getuid?.())
  ) {
    throw new PlaybookError('unsafe_permissions');
  }
}

function regularPrivateFile(info: Stats): void {
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) {
    throw new PlaybookError('unsafe_path');
  }
  privatePermissions(info);
  if (info.size > MAX_PLAYBOOK_BYTES) throw new PlaybookError('too_large');
}

async function readAndClose(handle: PlaybookHandle, read: () => Promise<string>): Promise<string> {
  let value = '';
  let failure: PlaybookError | undefined;
  try {
    value = await read();
  } catch (error) {
    failure = safeError(error);
  }
  try {
    await handle.close();
  } catch {
    failure ??= new PlaybookError('io_failed');
  }
  if (failure !== undefined) throw failure;
  return value;
}

/** An inert, read-only loader. No integration with startup, status, CLI or MCP in chunk 1A. */
export function createPrivatePlaybookReader(options: PrivatePlaybookOptions): {
  read(): Promise<string | undefined>;
} {
  for (const value of [options.directory, options.repositoryDirectory]) {
    if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
      throw new PlaybookError('invalid_path');
    }
  }
  const directory = path.resolve(options.directory);
  const repository = path.resolve(options.repositoryDirectory);
  if (inside(repository, directory)) throw new PlaybookError('unsafe_path');
  const fileSystem = options.fileSystem ?? fs;

  const validateDirectory = async (): Promise<string | undefined> => {
    // Check the repository even when private guidance is absent. Invalid setup must not
    // silently select generic guidance, or permit a later read inside the checkout.
    const realRepository = await fileSystem.realpath(repository);
    let info: Stats;
    try {
      info = await fileSystem.lstat(directory);
    } catch (error) {
      if (missing(error)) return undefined;
      throw error;
    }
    if (!info.isDirectory() || info.isSymbolicLink()) throw new PlaybookError('unsafe_path');
    privatePermissions(info);
    const realDirectory = await fileSystem.realpath(directory);
    if (inside(realRepository, realDirectory)) throw new PlaybookError('unsafe_path');
    // Reject another ordinary checkout or worktree too, not only this installation.
    for (let current = realDirectory; ; current = path.dirname(current)) {
      try {
        await fileSystem.lstat(path.join(current, '.git'));
        throw new PlaybookError('unsafe_path');
      } catch (error) {
        if (!missing(error)) throw error;
      }
      if (path.dirname(current) === current) break;
    }
    return realDirectory;
  };

  return {
    async read(): Promise<string | undefined> {
      try {
        const realDirectory = await validateDirectory();
        if (realDirectory === undefined) return undefined;
        const filename = path.join(realDirectory, PRIVATE_PLAYBOOK_FILENAME);
        let before: Stats;
        try {
          before = await fileSystem.lstat(filename);
        } catch (error) {
          if (missing(error)) return undefined;
          throw error;
        }
        regularPrivateFile(before);
        const handle = await fileSystem.open(
          filename,
          constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
        );
        return await readAndClose(handle, async () => {
          const opened = await handle.stat();
          regularPrivateFile(opened);
          if (opened.dev !== before.dev || opened.ino !== before.ino) {
            throw new PlaybookError('changed_file');
          }
          const buffer = Buffer.alloc(MAX_PLAYBOOK_BYTES + 1);
          let length = 0;
          while (length < buffer.length) {
            const result = await handle.read(buffer, length, buffer.length - length, length);
            if (result.bytesRead === 0) break;
            length += result.bytesRead;
          }
          if (length > MAX_PLAYBOOK_BYTES) throw new PlaybookError('too_large');
          const after = await handle.stat();
          regularPrivateFile(after);
          if (
            length !== opened.size ||
            after.size !== opened.size ||
            after.mtimeMs !== opened.mtimeMs ||
            after.ctimeMs !== opened.ctimeMs ||
            (await validateDirectory()) !== realDirectory
          ) {
            throw new PlaybookError('changed_file');
          }
          let text: string;
          try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length));
          } catch {
            throw new PlaybookError('invalid_content');
          }
          if (
            text.trim().length === 0 ||
            Array.from(text).some((character) => {
              const code = character.codePointAt(0)!;
              return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13);
            })
          ) {
            throw new PlaybookError('invalid_content');
          }
          return text;
        });
      } catch (error) {
        throw safeError(error);
      }
    },
  };
}
