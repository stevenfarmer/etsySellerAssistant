import assert from 'node:assert/strict';
import test from 'node:test';
import { getSetupStatus, getReadSetupStatus } from '../dist/src/status.js';

test('setup status clearly reports that Etsy access is not configured', () => {
  assert.deepEqual(getSetupStatus(), {
    application: 'etsySellerAssistant',
    version: '0.1.0-alpha.2',
    etsyAccess: 'not_configured',
    readOnly: true,
  });
});

test('read status projects only verified identity fields and preserves default output', () => {
  assert.equal(getReadSetupStatus().etsyAccess, 'not_checked');
  const result = getReadSetupStatus({
    etsyAccess: 'verified_this_session',
    connection: {
      ownerId: 123,
      shopId: 456,
      lastVerifiedAt: '2026-11-01T00:00:00.000Z',
      accessToken: 'fabricated-private',
    },
    refreshToken: 'fabricated-private',
  });
  assert.deepEqual(result, {
    application: 'etsySellerAssistant',
    version: '0.1.0-alpha.2',
    readOnly: true,
    etsyAccess: 'verified_this_session',
    connection: { ownerId: 123, shopId: 456, lastVerifiedAt: '2026-11-01T00:00:00.000Z' },
  });
  assert.equal(JSON.stringify(result).includes('fabricated-private'), false);
  assert.deepEqual(getReadSetupStatus({ etsyAccess: 'not_checked', connection: { shopId: 999 } }), {
    application: 'etsySellerAssistant',
    version: '0.1.0-alpha.2',
    readOnly: true,
    etsyAccess: 'not_checked',
  });
});
