// Manual test only: uses a unique namespace and fabricated values, never project credentials.
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { AsyncEntry } from '@napi-rs/keyring';

if (process.platform !== 'darwin' && process.platform !== 'win32') {
  throw new Error('This smoke test supports macOS and Windows only.');
}

const entry = new AsyncEntry(`etsySellerAssistant-smoke-${randomUUID()}`, 'fabricated-test');
const value = `test-${randomUUID()}`;
try {
  await entry.setPassword(value);
  if ((await entry.getPassword()) !== value) throw new Error('Protected storage read failed.');
  if (!(await entry.deletePassword())) throw new Error('Protected storage deletion failed.');
  if ((await entry.getPassword()) !== null) throw new Error('Protected storage deletion failed.');
  process.stdout.write('Protected storage smoke test passed.\n');
} finally {
  await entry.deletePassword();
}
