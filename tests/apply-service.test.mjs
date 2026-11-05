import assert from 'node:assert/strict';
import test from 'node:test';
import { createListingApplyService, ListingApplyError } from '../dist/src/edits/apply-service.js';
import { createEditProposalService } from '../dist/src/edits/proposal-service.js';

const PROPOSAL_ID = '123e4567-e89b-42d3-a456-426614174000';
const OWNER_ID = 71001;
const SHOP_ID = 82002;
const LISTING_ID = 93003;
const before = {
  listingId: LISTING_ID,
  lastModifiedTimestamp: 1731000000,
  title: 'Fabricated old title',
  description: 'Fabricated description.',
  tags: ['blue beads'],
};
const after = { ...before, title: 'Fabricated revised title' };
const connection = {
  etsyAccess: 'verified_this_session',
  connection: { ownerId: OWNER_ID, shopId: SHOP_ID },
};

async function approvedProposal() {
  const service = createEditProposalService({
    now: () => 1,
    createId: () => PROPOSAL_ID,
  });
  const proposal = service.prepare(
    { ...before, ownerId: OWNER_ID, shopId: SHOP_ID },
    { title: after.title },
  );
  assert.equal(
    await service.requestApproval(proposal.proposalId, async () => ({ action: 'accept' })),
    'approved',
  );
  return service.takeApproved(proposal.proposalId);
}

function harness({
  initial = before,
  identity = connection.connection,
  updateError,
  updateChanges = true,
  afterReadError,
  auditError,
  appendIntentError,
  appendOutcomeError,
} = {}) {
  const events = [];
  let currentSnapshot = { ...initial };
  let updateCalls = 0;
  let reads = 0;
  const outcomes = [];
  const auditStore = {
    async withWriter(work) {
      events.push('writer-lock');
      return work({
        async appendIntent(proposal) {
          events.push('intent');
          if (appendIntentError) throw new Error('fabricated audit failure');
          assert.equal(proposal.proposalId, PROPOSAL_ID);
          return {
            recordId: '123e4567-e89b-42d3-a456-426614174001',
            month: '2026-11',
            proposalId: PROPOSAL_ID,
          };
        },
        async appendOutcome(_receipt, outcome, category) {
          events.push('outcome');
          if (appendOutcomeError) throw new Error('fabricated outcome failure');
          outcomes.push({ outcome, category });
        },
      });
    },
  };
  const apply = createListingApplyService({
    async getAuditStore() {
      events.push('audit-config');
      if (auditError) throw new Error('not configured');
      return auditStore;
    },
    async getSnapshot(id) {
      events.push('read');
      assert.equal(id, LISTING_ID);
      reads += 1;
      if (reads === 2 && afterReadError) throw new Error('fabricated read failure');
      return {
        snapshot: { ...currentSnapshot },
        connection: {
          etsyAccess: 'verified_this_session',
          connection: { ...identity },
        },
      };
    },
    async getWriteClient() {
      events.push('write-client');
      return {
        identity: { ownerId: OWNER_ID, shopId: SHOP_ID },
        async updateListing(id, changes) {
          events.push('patch');
          updateCalls += 1;
          assert.equal(id, LISTING_ID);
          assert.deepEqual(changes, { title: after.title });
          if (updateChanges) currentSnapshot = { ...currentSnapshot, ...changes };
          if (updateError) throw updateError;
        },
      };
    },
  });
  return {
    apply,
    events,
    outcomes,
    get updateCalls() {
      return updateCalls;
    },
  };
}

test('records intent before one exact PATCH and verifies the result', async () => {
  const h = harness();
  const result = await h.apply.apply(await approvedProposal());

  assert.equal(result.outcome, 'verified');
  assert.deepEqual(result.changedFields, ['title']);
  assert.deepEqual(h.events, [
    'audit-config',
    'writer-lock',
    'read',
    'write-client',
    'intent',
    'patch',
    'read',
    'outcome',
  ]);
  assert.equal(h.updateCalls, 1);
  assert.deepEqual(h.outcomes, [{ outcome: 'verified', category: undefined }]);
});

test('missing audit setup fails before reading or sending an update', async () => {
  const h = harness({ auditError: true });
  await assert.rejects(h.apply.apply(await approvedProposal()), {
    name: 'ListingApplyError',
    code: 'audit_unavailable',
    mayHaveChanged: false,
  });
  assert.deepEqual(h.events, ['audit-config']);
  assert.equal(h.updateCalls, 0);
});

test('stale values or a wrong configured identity fail before intent and PATCH', async () => {
  const stale = harness({
    initial: { ...before, lastModifiedTimestamp: before.lastModifiedTimestamp + 1 },
  });
  await assert.rejects(stale.apply.apply(await approvedProposal()), { code: 'proposal_stale' });
  assert.equal(stale.updateCalls, 0);
  assert.equal(stale.events.includes('intent'), false);

  const wrong = harness({ identity: { ownerId: OWNER_ID + 1, shopId: SHOP_ID } });
  await assert.rejects(wrong.apply.apply(await approvedProposal()), { code: 'identity_mismatch' });
  assert.equal(wrong.updateCalls, 0);
  assert.equal(wrong.events.includes('intent'), false);

  const wrongShop = harness({ identity: { ownerId: OWNER_ID, shopId: SHOP_ID + 1 } });
  await assert.rejects(wrongShop.apply.apply(await approvedProposal()), {
    code: 'identity_mismatch',
  });
  assert.equal(wrongShop.updateCalls, 0);
  assert.equal(wrongShop.events.includes('intent'), false);
});

test('failed intent persistence stops before the protected operation', async () => {
  const h = harness({ appendIntentError: true });
  await assert.rejects(h.apply.apply(await approvedProposal()), { code: 'audit_unavailable' });
  assert.equal(h.updateCalls, 0);
  assert.deepEqual(h.events, ['audit-config', 'writer-lock', 'read', 'write-client', 'intent']);
});

test('a definite rejection with unchanged values is recorded as rejected', async () => {
  const h = harness({
    updateChanges: false,
    updateError: Object.assign(new Error('fabricated body'), { mayHaveApplied: false }),
  });
  const result = await h.apply.apply(await approvedProposal());
  assert.equal(result.outcome, 'rejected');
  assert.deepEqual(h.outcomes, [{ outcome: 'rejected', category: 'etsy_rejected' }]);
  assert.equal(h.updateCalls, 1);
});

test('a lost response reconciles exact after-state without retry', async () => {
  const h = harness({
    updateError: Object.assign(new Error('fabricated transport failure'), { mayHaveApplied: true }),
  });
  const result = await h.apply.apply(await approvedProposal());
  assert.equal(result.outcome, 'reconciled');
  assert.deepEqual(h.outcomes, [{ outcome: 'reconciled', category: 'transport_failed' }]);
  assert.equal(h.updateCalls, 1);
});

test('a lost response with unchanged values remains uncertain and is never retried', async () => {
  const h = harness({
    updateChanges: false,
    updateError: Object.assign(new Error('fabricated transport failure'), { mayHaveApplied: true }),
  });
  const result = await h.apply.apply(await approvedProposal());
  assert.equal(result.outcome, 'uncertain');
  assert.deepEqual(h.outcomes, [{ outcome: 'uncertain', category: 'verification_failed' }]);
  assert.equal(h.updateCalls, 1);
});

test('a failed post-write read records an uncertain result without retry', async () => {
  const h = harness({ afterReadError: true });
  const result = await h.apply.apply(await approvedProposal());
  assert.equal(result.outcome, 'uncertain');
  assert.deepEqual(h.outcomes, [{ outcome: 'uncertain', category: 'read_failed' }]);
  assert.equal(h.updateCalls, 1);
});

test('a failed outcome append reports the possible change and never retries', async () => {
  const h = harness({ appendOutcomeError: true });
  await assert.rejects(h.apply.apply(await approvedProposal()), (error) => {
    assert.ok(error instanceof ListingApplyError);
    assert.equal(error.code, 'audit_failed');
    assert.equal(error.mayHaveChanged, true);
    return true;
  });
  assert.equal(h.updateCalls, 1);
});

test('changed copy failing local constraints is not sent', async () => {
  const service = createEditProposalService({
    now: () => 1,
    createId: () => PROPOSAL_ID,
  });
  const proposal = service.prepare(
    { ...before, ownerId: OWNER_ID, shopId: SHOP_ID },
    { title: 'not allowed 😊' },
  );
  await service.requestApproval(proposal.proposalId, async () => ({ action: 'accept' }));
  const h = harness();
  await assert.rejects(h.apply.apply(service.takeApproved(proposal.proposalId)), {
    code: 'invalid_copy',
  });
  assert.equal(h.updateCalls, 0);
  assert.equal(h.events.includes('intent'), false);
});
