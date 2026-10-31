import { constants as fsConstants } from 'node:fs';
import { homedir } from 'node:os';
import * as defaultPath from 'node:path';
import * as defaultFs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export interface LocalConfig {
  readonly expectedShopId: number;
}

export type LocalConfigStatus = 'missing' | 'configured' | 'invalid';
export type LocalConfigErrorCode =
  | 'unsupported_platform'
  | 'invalid_path'
  | 'invalid_shop_id'
  | 'invalid_config'
  | 'unsafe_path'
  | 'io_failed';

export class LocalConfigError extends Error {
  readonly code: LocalConfigErrorCode;

  constructor(code: LocalConfigErrorCode) {
    super(`Local configuration operation failed (${code}).`);
    this.name = 'LocalConfigError';
    this.code = code;
  }
}

export interface LocalConfigFileSystem {
  mkdir(path: string, options: { recursive: true; mode: number }): Promise<string | undefined>;
  chmod(path: string, mode: number): Promise<void>;
  lstat(path: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    isSymbolicLink(): boolean;
  }>;
  open(path: string, flags: string | number, mode?: number): Promise<FileHandle>;
  rename(oldPath: string, newPath: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

export interface LocalConfigOptions {
  /** Test or explicit installation override; production defaults remain platform-specific. */
  readonly directory?: string;
  readonly platform?: NodeJS.Platform;
  readonly homeDirectory?: string;
  readonly localAppData?: string;
  readonly path?: Pick<typeof defaultPath, 'join' | 'isAbsolute'>;
  readonly fileSystem?: LocalConfigFileSystem;
}

export interface LocalConfigStore {
  read(): Promise<LocalConfig | undefined>;
  status(): Promise<LocalConfigStatus>;
  write(expectedShopId: number): Promise<void>;
  delete(): Promise<void>;
}

const CONFIG_FILENAME = 'config.json';
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const MAX_CONFIG_BYTES = 1024;
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0;

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value > 0;
}

function parseConfig(serialized: string): LocalConfig {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new LocalConfigError('invalid_config');
  }
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !Object.hasOwn(value, 'expectedShopId') ||
    !isPositiveSafeInteger((value as { readonly expectedShopId?: unknown }).expectedShopId)
  ) {
    throw new LocalConfigError('invalid_config');
  }
  return { expectedShopId: (value as { readonly expectedShopId: number }).expectedShopId };
}

export function resolveLocalConfigDirectory(options: LocalConfigOptions = {}): string {
  if (options.directory !== undefined) {
    const pathApi = options.path ?? defaultPath;
    if (options.directory.length === 0 || !pathApi.isAbsolute(options.directory)) {
      throw new LocalConfigError('invalid_path');
    }
    return options.directory;
  }
  const pathApi = options.path ?? defaultPath;
  const platform = options.platform ?? process.platform;
  if (platform === 'darwin') {
    const home = options.homeDirectory ?? homedir();
    if (home.length === 0 || !pathApi.isAbsolute(home)) throw new LocalConfigError('invalid_path');
    return pathApi.join(home, 'Library', 'Application Support', 'etsySellerAssistant');
  }
  if (platform === 'win32') {
    const appData = options.localAppData ?? process.env.LOCALAPPDATA;
    if (appData === undefined || appData.length === 0 || !pathApi.isAbsolute(appData)) {
      throw new LocalConfigError('invalid_path');
    }
    return pathApi.join(appData, 'etsySellerAssistant');
  }
  throw new LocalConfigError('unsupported_platform');
}

function asIoError(error: unknown): LocalConfigError {
  if (error instanceof LocalConfigError) return error;
  return new LocalConfigError('io_failed');
}

export function createLocalConfigStore(options: LocalConfigOptions = {}): LocalConfigStore {
  const pathApi = options.path ?? defaultPath;
  const fileSystem = options.fileSystem ?? defaultFs;
  const platform = options.platform ?? process.platform;
  const directory = resolveLocalConfigDirectory(options);
  const configPath = pathApi.join(directory, CONFIG_FILENAME);
  const isWindows = platform === 'win32';

  const ensureSafeDirectory = async (create: boolean): Promise<boolean> => {
    if (create) {
      await fileSystem.mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });
    }
    let info;
    try {
      info = await fileSystem.lstat(directory);
    } catch (error) {
      if (!create && isMissing(error)) return false;
      throw asIoError(error);
    }
    if (!info.isDirectory() || info.isSymbolicLink()) throw new LocalConfigError('unsafe_path');
    if (create && !isWindows) await fileSystem.chmod(directory, DIRECTORY_MODE);
    return true;
  };

  const ensureSafeTarget = async (): Promise<void> => {
    try {
      const info = await fileSystem.lstat(configPath);
      if (!info.isFile() || info.isSymbolicLink()) throw new LocalConfigError('unsafe_path');
    } catch (error) {
      if (isMissing(error)) return;
      throw asIoError(error);
    }
  };

  return {
    async delete(): Promise<void> {
      try {
        if (!(await ensureSafeDirectory(false))) return;
        await ensureSafeTarget();
        await fileSystem.unlink(configPath);
      } catch (error) {
        if (!isMissing(error)) throw asIoError(error);
      }
    },
    async read(): Promise<LocalConfig | undefined> {
      try {
        if (!(await ensureSafeDirectory(false))) return undefined;
        await ensureSafeTarget();
        const handle = await fileSystem.open(configPath, fsConstants.O_RDONLY | O_NOFOLLOW);
        try {
          if ((await handle.stat()).size > MAX_CONFIG_BYTES) {
            throw new LocalConfigError('invalid_config');
          }
          return parseConfig(await handle.readFile('utf8'));
        } finally {
          await handle.close();
        }
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw asIoError(error);
      }
    },

    async status(): Promise<LocalConfigStatus> {
      try {
        const config = await this.read();
        return config === undefined ? 'missing' : 'configured';
      } catch (error) {
        if (error instanceof LocalConfigError && error.code === 'invalid_config') return 'invalid';
        throw error;
      }
    },

    async write(expectedShopId: number): Promise<void> {
      if (!isPositiveSafeInteger(expectedShopId)) throw new LocalConfigError('invalid_shop_id');
      const temporaryPath = pathApi.join(directory, `.config.${randomUUID()}.tmp`);
      let handle: FileHandle | undefined;
      try {
        await ensureSafeDirectory(true);
        await ensureSafeTarget();
        handle = await fileSystem.open(temporaryPath, 'wx', FILE_MODE);
        await handle.writeFile(`${JSON.stringify({ expectedShopId }, null, 2)}\n`, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (!isWindows) await fileSystem.chmod(temporaryPath, FILE_MODE);
        await ensureSafeTarget();
        await fileSystem.rename(temporaryPath, configPath);
      } catch (error) {
        throw asIoError(error);
      } finally {
        if (handle !== undefined) {
          try {
            await handle.close();
          } catch {
            // Preserve the sanitized primary result.
          }
        }
        try {
          await fileSystem.unlink(temporaryPath);
        } catch {
          // The temp file is already renamed or absent.
        }
      }
    },
  };
}
