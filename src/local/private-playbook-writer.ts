import { constants as fsConstants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { resolveLocalConfigDirectory, type LocalConfigOptions } from './config.js';
import {
  MAX_PLAYBOOK_BYTES,
  PRIVATE_PLAYBOOK_FILENAME,
  PlaybookError,
  createPrivatePlaybookReader,
} from './private-playbook.js';

const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;
const O_NOFOLLOW = fsConstants.O_NOFOLLOW ?? 0;

export interface PrivatePlaybookWriterOptions extends Pick<LocalConfigOptions, 'directory'> {
  readonly repositoryDirectory: string;
}

export interface PrivatePlaybookWriter {
  create(content: string): Promise<void>;
  readForUpdate(): Promise<{ content: string; revision: string } | undefined>;
  replace(content: string, expectedRevision: string): Promise<string>;
}

function validateContent(content: string): void {
  if (
    typeof content !== 'string' ||
    content.trim().length === 0 ||
    Buffer.byteLength(content, 'utf8') > MAX_PLAYBOOK_BYTES ||
    Array.from(content).some((character) => {
      const code = character.codePointAt(0)!;
      return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13);
    })
  ) {
    throw new PlaybookError('invalid_content');
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

function inside(root: string, location: string): boolean {
  const relative = path.relative(root, location);
  return (
    relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`))
  );
}

function safeError(error: unknown): PlaybookError {
  return error instanceof PlaybookError ? error : new PlaybookError('io_failed');
}

function revision(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Fixed-path, create-only writer. It never accepts a model-selected path or overwrites a file. */
export function createPrivatePlaybookWriter(
  options: PrivatePlaybookWriterOptions,
): PrivatePlaybookWriter {
  const resolveDirectory = (): string => {
    if (!path.isAbsolute(options.repositoryDirectory)) throw new PlaybookError('invalid_path');
    const configured =
      options.directory === undefined
        ? path.join(resolveLocalConfigDirectory(), 'guidance')
        : options.directory;
    if (!path.isAbsolute(configured)) throw new PlaybookError('invalid_path');
    return configured;
  };

  const reader = () =>
    createPrivatePlaybookReader({
      directory: resolveDirectory(),
      repositoryDirectory: options.repositoryDirectory,
    });

  const validateLocation = async (directory: string): Promise<string> => {
    const suppliedDirectory = await fs.lstat(directory);
    if (!suppliedDirectory.isDirectory() || suppliedDirectory.isSymbolicLink()) {
      throw new PlaybookError('unsafe_path');
    }
    const realDirectory = await fs.realpath(directory);
    const realRepository = await fs.realpath(options.repositoryDirectory);
    if (inside(realRepository, realDirectory)) {
      throw new PlaybookError('unsafe_path');
    }
    let ancestor = realDirectory;
    while (true) {
      try {
        await fs.lstat(path.join(ancestor, '.git'));
        throw new PlaybookError('unsafe_path');
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      const parent = path.dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
    const info = await fs.lstat(realDirectory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new PlaybookError('unsafe_path');
    if (
      process.platform !== 'win32' &&
      ((info.mode & 0o077) !== 0 || info.uid !== process.getuid?.())
    ) {
      throw new PlaybookError('unsafe_permissions');
    }
    return realDirectory;
  };

  return {
    async create(content: string): Promise<void> {
      validateContent(content);
      let temporary: string | undefined;
      let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
      try {
        const directory = resolveDirectory();
        const target = path.join(directory, PRIVATE_PLAYBOOK_FILENAME);
        await fs.mkdir(directory, { recursive: true, mode: DIRECTORY_MODE });
        const realDirectory = await validateLocation(directory);
        const current = await fs.lstat(realDirectory);
        if (!current.isDirectory() || current.isSymbolicLink())
          throw new PlaybookError('unsafe_path');
        temporary = path.join(realDirectory, `.playbook.${randomUUID()}.tmp`);
        handle = await fs.open(
          temporary,
          fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW,
          FILE_MODE,
        );
        await handle.writeFile(content, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (process.platform !== 'win32') await fs.chmod(temporary, FILE_MODE);
        await validateLocation(directory);
        try {
          await fs.link(temporary, target);
        } catch (error) {
          if (isExists(error)) throw new PlaybookError('already_exists');
          throw error;
        }
        await fs.unlink(temporary);
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
            /* absent or already linked */
          }
        }
      }
    },

    async readForUpdate(): Promise<{ content: string; revision: string } | undefined> {
      try {
        const content = await reader().read();
        return content === undefined ? undefined : { content, revision: revision(content) };
      } catch (error) {
        throw safeError(error);
      }
    },

    async replace(content: string, expectedRevision: string): Promise<string> {
      validateContent(content);
      if (!/^[a-f0-9]{64}$/.test(expectedRevision)) throw new PlaybookError('stale_revision');

      let backupPath: string | undefined;
      let backupTemporary: string | undefined;
      let replacementTemporary: string | undefined;
      let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
      try {
        const before = await reader().read();
        if (before === undefined) throw new PlaybookError('missing_file');
        if (revision(before) !== expectedRevision) throw new PlaybookError('stale_revision');

        const directory = await validateLocation(resolveDirectory());
        const target = path.join(directory, PRIVATE_PLAYBOOK_FILENAME);
        backupPath = path.join(
          directory,
          `${PRIVATE_PLAYBOOK_FILENAME}.backup-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`,
        );
        backupTemporary = path.join(directory, `.backup.${randomUUID()}.tmp`);
        handle = await fs.open(
          backupTemporary,
          fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW,
          FILE_MODE,
        );
        await handle.writeFile(before, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (process.platform !== 'win32') await fs.chmod(backupTemporary, FILE_MODE);
        await validateLocation(directory);
        await fs.link(backupTemporary, backupPath);
        await fs.unlink(backupTemporary);
        backupTemporary = undefined;

        replacementTemporary = path.join(directory, `.playbook.${randomUUID()}.tmp`);
        handle = await fs.open(
          replacementTemporary,
          fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | O_NOFOLLOW,
          FILE_MODE,
        );
        await handle.writeFile(content, 'utf8');
        await handle.sync();
        await handle.close();
        handle = undefined;
        if (process.platform !== 'win32') await fs.chmod(replacementTemporary, FILE_MODE);

        const current = await reader().read();
        if (current === undefined || revision(current) !== expectedRevision) {
          throw new PlaybookError('stale_revision');
        }
        await validateLocation(directory);
        await fs.rename(replacementTemporary, target);
        replacementTemporary = undefined;
        return path.basename(backupPath);
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
        for (const temporary of [backupTemporary, replacementTemporary]) {
          if (temporary === undefined) continue;
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
