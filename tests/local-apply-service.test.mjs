import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createEditProposalService } from '../dist/src/edits/proposal-service.js';
import { createLocalListingApplyService } from '../dist/src/etsy/local-apply-service.js';
import { InMemorySecretStore } from '../dist/src/secret-store.js';

const OWNER_ID = 71001;
const SHOP_ID = 82002;
const LISTING_ID = 93003;

test('local apply keeps read credentials isolated and integrates edit refresh, PATCH and audit', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'etsy-local-apply-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const auditDirectory = join(directory, 'github', 'etsySellerAssistant', 'auditTrail');
  await mkdir(join(directory, 'github', 'etsySellerAssistant'), { recursive: true });
  const appDirectory = join(directory, 'app');
  const secretStore = new InMemorySecretStore();
  for (const [key, value] of [
    ['appKeystring', 'fabricated-client'],
    ['appSharedSecret', 'fabricated-secret'],
    ['accessToken', `${OWNER_ID}.fabricated-read-access`],
    ['refreshToken', `${OWNER_ID}.fabricated-read-refresh`],
    ['editAccessToken', `${OWNER_ID}.fabricated-edit-access`],
    ['editRefreshToken', `${OWNER_ID}.fabricated-edit-refresh`],
  ]) {
    await secretStore.set(key, value);
  }

  const before = {
    listingId: LISTING_ID,
    lastModifiedTimestamp: 1_731_000_000,
    title: 'Fabricated original title',
    description: 'Fabricated description.',
    tags: ['blue beads'],
  };
  let current = { ...before };
  const readService = {
    async getListing(listingId) {
      assert.equal(listingId, LISTING_ID);
      return { ...current };
    },
    getConnectionStatus() {
      return {
        etsyAccess: 'verified_this_session',
        connection: { ownerId: OWNER_ID, shopId: SHOP_ID },
      };
    },
  };
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (url === 'https://api.etsy.com/v3/public/oauth/token') {
      return globalThis.Response.json({
        access_token: `${OWNER_ID}.fabricated-refreshed-edit-access`,
        refresh_token: `${OWNER_ID}.fabricated-rotated-edit-refresh`,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'listings_w listings_r',
      });
    }
    assert.equal(
      url,
      `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
    );
    assert.equal(init.method, 'PATCH');
    assert.deepEqual([...init.body.entries()], [['title', 'Fabricated approved title']]);
    current = { ...current, title: 'Fabricated approved title' };
    return new globalThis.Response(null, { status: 200 });
  };
  const service = createLocalListingApplyService(fetchImpl, readService, {
    directory: appDirectory,
    store: secretStore,
    config: {
      async read() {
        return { expectedShopId: SHOP_ID, auditDirectory };
      },
    },
  });
  const proposalService = createEditProposalService({
    createId: () => '123e4567-e89b-42d3-a456-426614174000',
  });
  const proposal = proposalService.prepare(
    { ...before, ownerId: OWNER_ID, shopId: SHOP_ID },
    { title: 'Fabricated approved title' },
  );
  assert.equal(
    await proposalService.requestApproval(proposal.proposalId, async () => ({ action: 'accept' })),
    'approved',
  );

  const result = await service.apply(proposalService.takeApproved(proposal.proposalId));

  assert.equal(result.outcome, 'verified');
  assert.equal(requests.length, 2);
  assert.deepEqual(
    [...requests[0].init.body.entries()],
    [
      ['grant_type', 'refresh_token'],
      ['client_id', 'fabricated-client'],
      ['refresh_token', `${OWNER_ID}.fabricated-edit-refresh`],
    ],
  );
  assert.equal(
    requests[1].init.headers.authorization,
    `Bearer ${OWNER_ID}.fabricated-refreshed-edit-access`,
  );
  assert.equal(await secretStore.get('accessToken'), `${OWNER_ID}.fabricated-read-access`);
  assert.equal(await secretStore.get('refreshToken'), `${OWNER_ID}.fabricated-read-refresh`);
  assert.equal(
    await secretStore.get('editRefreshToken'),
    `${OWNER_ID}.fabricated-rotated-edit-refresh`,
  );

  const [auditFile] = await readdir(auditDirectory);
  const records = (await readFile(join(auditDirectory, auditFile), 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    records.map((record) => record.outcome),
    ['pending', 'verified'],
  );
  assert.equal(records[0].after.title, 'Fabricated approved title');
});
