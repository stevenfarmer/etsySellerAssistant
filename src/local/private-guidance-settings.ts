import { constants as fsConstants, type Stats } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { resolveLocalConfigDirectory, type LocalConfigOptions } from './config.js';

export const PRIVATE_GUIDANCE_SETTINGS_FILENAME = 'private-guidance-state.json';
const MAX_SETTINGS_BYTES = 256;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0;

export type PrivateGuidanceSettingsErrorCode =
  'invalid_path' | 'unsafe_path' | 'unsafe_permissions' | 'invalid_settings' | 'io_failed';

export class PrivateGuidanceSettingsError extends Error {
  constructor(readonly code: PrivateGuidanceSettingsErrorCode) {
    super(`Private guidance setting operation failed (${code}).`);
    this.name = 'PrivateGuidanceSettingsError';
  }
}

export interface PrivateGuidanceSettingsStore {
  getEnabled(): Promise<boolean | undefined>;
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
}

export interface PrivateGuidanceSettingsOptions extends Pick<
  LocalConfigOptions,
  'directory' | 'platform' | 'homeDirectory' | 'localAppData'
> {
  readonly repositoryDirectory: string;
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function inside(root: string, location: string): boolean {
  const relative = path.relative(root, location);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

function safeError(error: unknown): PrivateGuidanceSettingsError {
  return error instanceof PrivateGuidanceSettingsError
    ? error
    : new PrivateGuidanceSettingsError('io_failed');
}

function assertOwnedPrivate(info: Stats, isDirectory: boolean): void {
  if (!info.isFile() && !isDirectory) throw new PrivateGuidanceSettingsError('unsafe_path');
  if (isDirectory && !info.isDirectory()) throw new PrivateGuidanceSettingsError('unsafe_path');
  if (info.isSymbolicLink() || (!isDirectory && info.nlink !== 1)) {
    throw new PrivateGuidanceSettingsError('unsafe_path');
  }
  if (
    process.platform !== 'win32' &&
    ((info.mode & (isDirectory ? 0o022 : 0o077)) !== 0 || info.uid !== process.getuid?.())
  ) {
    throw new PrivateGuidanceSettingsError('unsafe_permissions');
  }
}

/** Stores the activation choice separately from guidance text; reads never open that text file. */
export function createPrivateGuidanceSettingsStore(
  options: PrivateGuidanceSettingsOptions,
): PrivateGuidanceSettingsStore {
  for (const value of [
    options.directory ?? resolveLocalConfigDirectory(options),
    options.repositoryDirectory,
  ]) {
    if (typeof value !== 'string' || !path.isAbsolute(value) || value.includes('\0')) {
      throw new PrivateGuidanceSettingsError('invalid_path');
    }
  }
  const directory = path.resolve(options.directory ?? resolveLocalConfigDirectory(options));
  const repository = path.resolve(options.repositoryDirectory);
  if (inside(repository, directory)) throw new PrivateGuidanceSettingsError('unsafe_path');
  const filename = path.join(directory, PRIVATE_GUIDANCE_SETTINGS_FILENAME);

  const validateDirectory = async (create: boolean): Promise<string | undefined> => {
    if (create) await fs.mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });
    let info: Stats;
    try {
      info = await fs.lstat(directory);
    } catch (error) {
      if (!create && isMissing(error)) return undefined;
      throw error;
    }
    assertOwnedPrivate(info, true);
    const [realDirectory, realRepository] = await Promise.all([
      fs.realpath(directory),
      fs.realpath(repository),
    ]);
    if (inside(realRepository, realDirectory))
      throw new PrivateGuidanceSettingsError('unsafe_path');
    for (let current = realDirectory; ; current = path.dirname(current)) {
      try {
        await fs.lstat(path.join(current, '.git'));
        throw new PrivateGuidanceSettingsError('unsafe_path');
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      if (path.dirname(current) === current) break;
    }
    return realDirectory;
  };

  const validateTarget = async (): Promise<Stats | undefined> => {
    let info: Stats;
    try {
      info = await fs.lstat(filename);
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw error;
    }
    assertOwnedPrivate(info, false);
    if (info.size > MAX_SETTINGS_BYTES) throw new PrivateGuidanceSettingsError('invalid_settings');
    return info;
  };

  return {
    async getEnabled(): Promise<boolean | undefined> {
      try {
        const realDirectory = await validateDirectory(false);
        if (realDirectory === undefined) return undefined;
        const before = await validateTarget();
        if (before === undefined) return undefined;
        const handle = await fs.open(filename, fsConstants.O_RDONLY | O_NOFOLLOW);
        try {
          const opened = await handle.stat();
          assertOwnedPrivate(opened, false);
          if (opened.dev !== before.dev || opened.ino !== before.ino) {
            throw new PrivateGuidanceSettingsError('invalid_settings');
          }
          const serialized = await handle.readFile('utf8');
          const after = await handle.stat();
          if (
            after.size !== before.size ||
            after.mtimeMs !== before.mtimeMs ||
            after.ctimeMs !== before.ctimeMs ||
            (await validateDirectory(false)) !== realDirectory
          ) {
            throw new PrivateGuidanceSettingsError('invalid_settings');
          }
          let value: unknown;
          try {
            value = JSON.parse(serialized);
          } catch {
            throw new PrivateGuidanceSettingsError('invalid_settings');
          }
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value) ||
            Object.keys(value).length !== 2 ||
            (value as { schemaVersion?: unknown }).schemaVersion !== 1 ||
            typeof (value as { enabled?: unknown }).enabled !== 'boolean'
          ) {
            throw new PrivateGuidanceSettingsError('invalid_settings');
          }
          return (value as { enabled: boolean }).enabled;
        } finally {
          await handle.close();
        }
      } catch (error) {
        throw safeError(error);
      }
    },

    async isEnabled(): Promise<boolean> {
      return (await this.getEnabled()) === true;
    },

    async setEnabled(enabled: boolean): Promise<void> {
      if (typeof enabled !== 'boolean') throw new PrivateGuidanceSettingsError('invalid_settings');
      let temporary: string | undefined;
      let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
      try {
        const realDirectory = await validateDirectory(true);
        if (realDirectory === undefined) throw new PrivateGuidanceSettingsError('unsafe_path');
        await validateTarget();
        temporary = path.join(realDirectory, `.guidance-state.${randomUUID()}.tmp`);
        handle = await fs.open(
          temporary,
          fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW,
          FILE_MODE,
        );
        await handle.writeFile(`${JSON.stringify({ schemaVersion: 1, enabled })}\n`, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (process.platform !== 'win32') await fs.chmod(temporary, FILE_MODE);
        if ((await validateDirectory(true)) !== realDirectory) {
          throw new PrivateGuidanceSettingsError('unsafe_path');
        }
        await validateTarget();
        await fs.rename(temporary, filename);
        temporary = undefined;
      } catch (error) {
        throw safeError(error);
      } finally {
        if (handle !== undefined) {
          try {
            await handle.close();
          } catch {
            /* retain the primary result */
          }
        }
        if (temporary !== undefined) {
          try {
            await fs.unlink(temporary);
          } catch {
            /* absent or already renamed */
          }
        }
      }
    },
  };
}
