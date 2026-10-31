import { spawn } from 'node:child_process';
import { win32 } from 'node:path';

export const LOCAL_START_URL = 'http://localhost:3003/oauth/start';

export class BrowserLaunchError extends Error {
  constructor() {
    super('Unable to open the local authorization page.');
    this.name = 'BrowserLaunchError';
  }
}

export interface BrowserLauncherOptions {
  readonly platform?: NodeJS.Platform;
  readonly windowsRoot?: string;
  readonly launch?: (command: string, args: readonly string[]) => Promise<void>;
}

async function launchProcess(command: string, args: readonly string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, [...args], { shell: false, stdio: 'ignore', windowsHide: true });
    child.once('error', () => reject(new BrowserLaunchError()));
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

/** Launch only a fixed local URL; the Etsy authorization URL is never a process argument. */
export async function openLocalAuthorization(options: BrowserLauncherOptions = {}): Promise<void> {
  const platform = options.platform ?? process.platform;
  let command: string;
  let args: readonly string[];
  if (platform === 'darwin') {
    command = '/usr/bin/open';
    args = [LOCAL_START_URL];
  } else if (platform === 'win32') {
    const root = options.windowsRoot ?? process.env.SystemRoot;
    if (root === undefined || !win32.isAbsolute(root)) throw new BrowserLaunchError();
    command = win32.join(root, 'System32', 'rundll32.exe');
    args = ['url.dll,FileProtocolHandler', LOCAL_START_URL];
  } else {
    throw new BrowserLaunchError();
  }
  try {
    await (options.launch ?? launchProcess)(command, args);
  } catch {
    throw new BrowserLaunchError();
  }
}
