import assert from 'node:assert/strict';
import test from 'node:test';
import { getSetupStatus } from '../dist/src/status.js';

test('setup status clearly reports that Etsy access is not configured', () => {
  assert.deepEqual(getSetupStatus(), {
    application: 'etsySellerAssistant',
    version: '0.1.0',
    etsyAccess: 'not_configured',
    readOnly: true,
  });
});
