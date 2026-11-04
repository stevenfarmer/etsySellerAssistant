import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditProposalService, ProposalError } from '../dist/src/edits/proposal-service.js';
import { registerEditProposalTools } from '../dist/src/mcp/edit-proposal-tools.js';

const snapshot = Object.freeze({
  listingId: 93003,
  ownerId: 71001,
  shopId: 82002,
  lastModifiedTimestamp: 1_799_999_000,
  title: 'Fabricated mug',
  description: 'Fabricated description',
  tags: Object.freeze(['blue mug', 'stoneware']),
});

function harness(options = {}) {
  const tools = new Map();
  const service =
    options.proposalService ??
    createEditProposalService({
      now: options.now,
      createId: options.createId ?? (() => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    });
  let current = options.current ?? snapshot;
  const readService = {
    getConnectionStatus: () => ({
      etsyAccess: 'verified_this_session',
      connection: {
        ownerId: current.ownerId,
        shopId: current.shopId,
        lastVerifiedAt: '2026-11-04T00:00:00.000Z',
      },
    }),
    getListing: async () => ({
      listingId: current.listingId,
      lastModifiedTimestamp: current.lastModifiedTimestamp,
      title: current.title,
      description: current.description,
      tags: [...current.tags],
    }),
  };
  const server = {
    registerTool(name, config, handler) {
      tools.set(name, { config, handler });
    },
  };
  registerEditProposalTools(server, { readService, proposalService: service });
  const call = (name, input, elicitInput) =>
    tools.get(name).handler(input, {
      mcpReq: { elicitInput },
    });
  return {
    tools,
    service,
    call,
    setCurrent: (value) => {
      current = value;
    },
  };
}

function body(result) {
  return JSON.parse(result.content[0].text);
}

test('proposal binds exact fields, configured identity and timestamp, and approval returns no copy', async () => {
  const h = harness();
  const prepared = await h.call('prepare_listing_edit', {
    listingId: snapshot.listingId,
    changes: { title: 'Fabricated blue mug' },
  });
  const proposal = body(prepared);
  assert.equal(proposal.ownerId, snapshot.ownerId);
  assert.equal(proposal.shopId, snapshot.shopId);
  assert.equal(proposal.lastModifiedTimestamp, snapshot.lastModifiedTimestamp);
  assert.deepEqual(proposal.before, { title: snapshot.title });
  assert.deepEqual(proposal.after, { title: 'Fabricated blue mug' });

  let elicitation;
  const approved = await h.call(
    'approve_listing_edit',
    { proposalId: proposal.proposalId },
    async (request) => {
      elicitation = request;
      return { action: 'accept', content: { confirm: true } };
    },
  );
  assert.deepEqual(body(approved), {
    proposalId: proposal.proposalId,
    status: 'approved_for_later_apply',
    listingChanged: false,
  });
  assert.match(elicitation.message, /Fabricated mug/);
  assert.match(elicitation.message, /Fabricated blue mug/);
  assert.deepEqual(elicitation.requestedSchema.required, ['confirm']);
  assert.deepEqual(h.service.takeApproved(proposal.proposalId).after, {
    title: 'Fabricated blue mug',
  });
  assert.throws(() => h.service.takeApproved(proposal.proposalId), ProposalError);
});

test('decline, cancel, false confirmation and unsupported elicitation fail closed and consume the proposal', async () => {
  for (const answer of [
    { action: 'decline' },
    { action: 'cancel' },
    { action: 'accept', content: { confirm: false } },
  ]) {
    const h = harness();
    const proposal = body(
      await h.call('prepare_listing_edit', {
        listingId: snapshot.listingId,
        changes: { description: 'Changed description' },
      }),
    );
    const rejected = await h.call(
      'approve_listing_edit',
      { proposalId: proposal.proposalId },
      async () => answer,
    );
    assert.equal(rejected.isError, true);
    assert.throws(() => h.service.takeApproved(proposal.proposalId), ProposalError);
    assert.equal(
      (
        await h.call(
          'approve_listing_edit',
          { proposalId: proposal.proposalId },
          async () => answer,
        )
      ).isError,
      true,
    );
  }

  const unavailable = harness();
  const proposal = body(
    await unavailable.call('prepare_listing_edit', {
      listingId: snapshot.listingId,
      changes: { title: 'Another title' },
    }),
  );
  const result = await unavailable.call(
    'approve_listing_edit',
    { proposalId: proposal.proposalId },
    async () => {
      throw new Error('client has no elicitation capability');
    },
  );
  assert.equal(result.isError, true);
  assert.throws(() => unavailable.service.takeApproved(proposal.proposalId), ProposalError);
});

test('fresh snapshot mismatch rejects stale proposal before requesting approval', async () => {
  const h = harness();
  const proposal = body(
    await h.call('prepare_listing_edit', {
      listingId: snapshot.listingId,
      changes: { description: 'New description' },
    }),
  );
  h.setCurrent({ ...snapshot, description: 'Updated elsewhere' });
  let requested = false;
  const result = await h.call(
    'approve_listing_edit',
    { proposalId: proposal.proposalId },
    async () => {
      requested = true;
      return { action: 'accept', content: { confirm: true } };
    },
  );
  assert.equal(result.isError, true);
  assert.equal(requested, false);
  assert.throws(() => h.service.getPending(proposal.proposalId), ProposalError);
});

test('concurrent approval calls cannot obtain two confirmations for one proposal', async () => {
  const h = harness();
  const proposal = body(
    await h.call('prepare_listing_edit', {
      listingId: snapshot.listingId,
      changes: { title: 'Concurrent title' },
    }),
  );
  let signalStarted;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  let answerFirst;
  const firstApproval = h.call(
    'approve_listing_edit',
    { proposalId: proposal.proposalId },
    async () => {
      signalStarted();
      return new Promise((resolve) => {
        answerFirst = resolve;
      });
    },
  );
  await started;
  let secondPrompted = false;
  const secondApproval = await h.call(
    'approve_listing_edit',
    { proposalId: proposal.proposalId },
    async () => {
      secondPrompted = true;
      return { action: 'accept', content: { confirm: true } };
    },
  );
  assert.equal(secondApproval.isError, true);
  assert.equal(secondPrompted, false);
  answerFirst({ action: 'accept', content: { confirm: true } });
  assert.equal(body(await firstApproval).status, 'approved_for_later_apply');
});

test('expiry, proposal replay, malformed changes and missing timestamp fail closed', async () => {
  let time = 1000;
  const expired = harness({ now: () => time });
  const proposal = body(
    await expired.call('prepare_listing_edit', {
      listingId: snapshot.listingId,
      changes: { title: 'Later title' },
    }),
  );
  time += 5 * 60 * 1000;
  assert.throws(() => expired.service.getPending(proposal.proposalId), {
    code: 'proposal_expired',
  });

  const malformed = harness();
  assert.equal(
    (
      await malformed.call('prepare_listing_edit', {
        listingId: snapshot.listingId,
        changes: { title: 'valid', state: 'draft' },
      })
    ).isError,
    true,
  );
  malformed.setCurrent({ ...snapshot, lastModifiedTimestamp: undefined });
  assert.equal(
    (
      await malformed.call('prepare_listing_edit', {
        listingId: snapshot.listingId,
        changes: { title: 'valid' },
      })
    ).isError,
    true,
  );
});

test('proposal storage is bounded and removes expired entries before accepting more', () => {
  let time = 1000;
  let sequence = 0;
  const service = createEditProposalService({
    now: () => time,
    createId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  });
  for (let index = 0; index < 128; index += 1)
    service.prepare(snapshot, { title: `Changed title ${index}` });
  assert.throws(() => service.prepare(snapshot, { title: 'One too many' }), {
    code: 'proposal_limit',
  });
  time += 5 * 60 * 1000;
  assert.doesNotThrow(() => service.prepare(snapshot, { title: 'Reclaimed capacity' }));
});
