import assert from 'node:assert/strict';
import test from 'node:test';
import { registerReadOnlyListingTools } from '../dist/src/mcp/read-tools.js';
import { RefreshCoordinationError } from '../dist/src/local/refresh-lock.js';

for (const tool of ['list_active_listings', 'get_listing']) {
  test(`${tool} distinguishes contention from recovery without exposing private errors`, async () => {
    const handlers = new Map();
    let failure;
    const fail = async () => {
      throw failure;
    };
    registerReadOnlyListingTools(
      { registerTool: (name, _schema, handler) => handlers.set(name, handler) },
      { listActiveListings: fail, getListing: fail },
    );
    const call = () => handlers.get(tool)(tool === 'get_listing' ? { listingId: 123 } : {});
    for (const code of [
      'busy',
      'timeout',
      'recovery_required',
      'ownership_lost',
      'invalid_state',
      'unsafe_path',
      'io_failed',
      'invalid_input',
    ]) {
      failure = new RefreshCoordinationError(code);
      failure.message = 'fabricated-private-token-and-local-path';
      const result = await call();
      assert.equal(result.isError, true);
      const message = result.content[0].text;
      assert.equal(message.includes(failure.message), false);
      if (code === 'busy' || code === 'timeout') {
        assert.match(message, /Wait for it to finish/);
        assert.match(message, /do not remove its refresh lock/);
      } else {
        assert.match(message, /Stop listing retries/);
        assert.match(message, /recovery procedure/);
        assert.match(message, /Do not delete a refresh lock/);
      }
    }
    // Untrusted errors cannot spoof the typed recovery path via a code field.
    failure = Object.assign(new Error('fabricated-private-token'), { code: 'recovery_required' });
    const result = await call();
    assert.equal(result.content[0].text, 'Listing read failed. Check local setup or retry.');
  });
}
