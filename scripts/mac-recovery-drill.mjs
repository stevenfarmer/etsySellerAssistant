import process from 'node:process';
import { runRecoveryDrill } from './lib/recovery-drill.mjs';
import { InMemorySecretStore } from '../dist/src/secret-store.js';
import { createIsolatedDrillStore } from './lib/isolated-drill-store.mjs';

const args = process.argv.slice(2);
if (args.length !== 1 || !['--offline', '--keychain'].includes(args[0])) {
  process.stderr.write('Usage: node scripts/mac-recovery-drill.mjs --offline | --keychain\n');
  process.exitCode = 1;
} else if (args[0] === '--keychain' && process.platform !== 'darwin') {
  process.stderr.write('The Keychain drill requires macOS.\n');
  process.exitCode = 1;
} else {
  try {
    // No real fetch is available, even if a mock is accidentally omitted.
    globalThis.fetch = async () => {
      throw new Error('Recovery drill blocks network requests.');
    };
    let store = new InMemorySecretStore();
    if (args[0] === '--keychain') {
      const { AsyncEntry } = await import('@napi-rs/keyring');
      const isolated = createIsolatedDrillStore(
        (service, account) => new AsyncEntry(service, account),
        process.platform,
      );
      process.stdout.write(`Test-only Keychain service: ${isolated.namespace}\n`);
      store = isolated.store;
    }
    const result = await runRecoveryDrill(store);
    for (const stage of result.stages) process.stdout.write(`PASS: ${stage}\n`);
    process.stdout.write('PASS: fabricated store and temporary directory cleanup verified.\n');
  } catch {
    process.stderr.write('Recovery drill failed; completion or cleanup was not verified.\n');
    process.exitCode = 1;
  }
}
