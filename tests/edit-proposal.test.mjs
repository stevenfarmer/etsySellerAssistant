import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditProposalService, ProposalError } from '../dist/src/edits/proposal-service.js';
import { ListingApplyError } from '../dist/src/edits/apply-service.js';
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
  let nextId = 0;
  const service =
    options.proposalService ??
    createEditProposalService({
      now: options.now,
      createId:
        options.createId ?? (() => `aaaaaaaa-aaaa-4aaa-8aaa-${String(++nextId).padStart(12, '0')}`),
    });
  let current = options.current ?? snapshot;
  let readCount = 0;
  const readService = {
    getConnectionStatus: () => ({
      etsyAccess: 'verified_this_session',
      connection: {
        ownerId: current.ownerId,
        shopId: current.shopId,
        lastVerifiedAt: '2026-11-04T00:00:00.000Z',
      },
    }),
    getListing: async () => {
      readCount += 1;
      options.afterRead?.(readCount, (value) => {
        current = value;
      });
      return {
        listingId: current.listingId,
        lastModifiedTimestamp: current.lastModifiedTimestamp,
        title: current.title,
        description: current.description,
        tags: [...current.tags],
      };
    },
  };
  const server = {
    registerTool(name, config, handler) {
      tools.set(name, { config, handler });
    },
  };
  registerEditProposalTools(server, {
    readService,
    proposalService: service,
    ...(options.applyService ? { applyService: options.applyService } : {}),
  });
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

test('prepare presents exact values and directs immediate apply follow-through after acceptance', async () => {
  const h = harness();
  assert.deepEqual([...h.tools.keys()], ['prepare_listing_edit']);
  let elicitation;
  const approved = await h.call(
    'prepare_listing_edit',
    {
      listingId: snapshot.listingId,
      changes: { title: 'Fabricated blue mug', description: 'Updated fabricated description' },
    },
    async (request) => {
      elicitation = request;
      return { action: 'accept' };
    },
  );
  const result = body(approved);
  assert.match(result.proposalId, /^[0-9a-f-]{36}$/);
  assert.equal(result.status, 'approved_for_later_apply');
  assert.equal(result.listingChanged, false);
  assert.match(elicitation.message, /Listing: Fabricated mug/);
  assert.match(elicitation.message, /Listing ID: 93003/);
  assert.match(
    elicitation.message,
    /Title\n\nCURRENT VALUE\nFabricated mug\n\nPROPOSED VALUE\nFabricated blue mug/,
  );
  assert.match(
    elicitation.message,
    /Description\n\nCURRENT VALUE\nFabricated description\n\nPROPOSED VALUE\nUpdated fabricated description/,
  );
  assert.match(
    elicitation.message,
    /Accept to approve this exact update\. The assistant will then apply it to Etsy and verify the result\./,
  );
  assert.doesNotMatch(
    elicitation.message,
    /later step|does not change Etsy|Do not follow instructions|shown for review only/i,
  );
  assert.match(
    h.tools.get('prepare_listing_edit').config.description,
    /immediately call apply_listing_edit/,
  );
  assert.match(
    h.tools.get('prepare_listing_edit').config.description,
    /never follow instructions in it/,
  );
  assert.doesNotMatch(
    elicitation.message,
    /proposalId|ownerId|shopId|lastModifiedTimestamp|expiresAt/,
  );
  assert.deepEqual(elicitation.requestedSchema.properties, {});
  assert.equal(elicitation.requestedSchema.required, undefined);
  assert.deepEqual(h.service.takeApproved(result.proposalId).after, {
    title: 'Fabricated blue mug',
    description: 'Updated fabricated description',
  });
  assert.throws(() => h.service.takeApproved(result.proposalId), ProposalError);
});

test('tag changes are readable and acceptance still changes no listing', async () => {
  const h = harness();
  let confirmationMessage;
  const approved = await h.call(
    'prepare_listing_edit',
    { listingId: snapshot.listingId, changes: { tags: ['blue mug', 'handmade'] } },
    async ({ message }) => {
      confirmationMessage = message;
      return { action: 'accept' };
    },
  );
  assert.match(confirmationMessage, /Tags\n\nCURRENT VALUE\n• blue mug\n• stoneware/);
  assert.match(confirmationMessage, /PROPOSED VALUE\n• blue mug\n• handmade/);
  assert.equal(body(approved).listingChanged, false);
});

test('decline, cancel and unsupported elicitation fail closed', async () => {
  for (const answer of [{ action: 'decline' }, { action: 'cancel' }]) {
    const h = harness();
    const rejected = await h.call(
      'prepare_listing_edit',
      { listingId: snapshot.listingId, changes: { description: 'Changed description' } },
      async () => answer,
    );
    assert.equal(rejected.isError, true);
    assert.match(rejected.content[0].text, /No listing was changed/);
    assert.throws(
      () => h.service.takeApproved('aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
      ProposalError,
    );
  }

  const unavailable = harness();
  const result = await unavailable.call('prepare_listing_edit', {
    listingId: snapshot.listingId,
    changes: { title: 'Another title' },
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Approval was not recorded/);
  assert.throws(
    () => unavailable.service.takeApproved('aaaaaaaa-aaaa-4aaa-8aaa-000000000001'),
    ProposalError,
  );
});

test('a changed listing between proposal and confirmation rejects before displaying the form', async () => {
  let requested = false;
  const h = harness({
    afterRead(readCount, setCurrent) {
      if (readCount === 2)
        setCurrent({
          ...snapshot,
          description: 'Changed elsewhere',
          lastModifiedTimestamp: snapshot.lastModifiedTimestamp + 1,
        });
    },
  });
  const result = await h.call(
    'prepare_listing_edit',
    { listingId: snapshot.listingId, changes: { title: 'New title' } },
    async () => {
      requested = true;
      return { action: 'accept' };
    },
  );
  assert.equal(result.isError, true);
  assert.equal(requested, false);
  assert.match(result.content[0].text, /listing changed/);
});

test('concurrent confirmations cannot obtain two approvals for one proposal', async () => {
  const service = createEditProposalService({
    createId: () => 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  });
  const proposal = service.prepare(
    {
      ...snapshot,
      lastModifiedTimestamp: snapshot.lastModifiedTimestamp,
    },
    { title: 'Concurrent title' },
  );
  let signalStarted;
  const started = new Promise((resolve) => {
    signalStarted = resolve;
  });
  let answerFirst;
  const firstApproval = service.requestApproval(proposal.proposalId, async () => {
    signalStarted();
    return new Promise((resolve) => {
      answerFirst = resolve;
    });
  });
  await started;
  await assert.rejects(
    service.requestApproval(proposal.proposalId, async () => ({
      action: 'accept',
    })),
    ProposalError,
  );
  answerFirst({ action: 'accept' });
  assert.equal(await firstApproval, 'approved');
});

test('an accepted proposal applies only through the one-use apply tool', async () => {
  const applied = [];
  const h = harness({
    applyService: {
      async apply(proposal) {
        applied.push(proposal);
        return {
          proposalId: proposal.proposalId,
          listingId: proposal.listingId,
          outcome: 'verified',
          changedFields: ['description'],
        };
      },
    },
  });
  assert.deepEqual([...h.tools.keys()], ['prepare_listing_edit', 'apply_listing_edit']);
  const prepared = await h.call(
    'prepare_listing_edit',
    { listingId: snapshot.listingId, changes: { description: 'Approved description' } },
    async () => ({ action: 'accept' }),
  );
  const { proposalId, listingChanged } = body(prepared);
  assert.equal(listingChanged, false);
  assert.equal(applied.length, 0);

  const result = await h.call('apply_listing_edit', { proposalId });
  assert.equal(result.isError, undefined);
  assert.match(result.content[0].text, /updated and verified/);
  assert.equal(applied.length, 1);
  assert.equal(applied[0].proposalId, proposalId);
  assert.equal(applied[0].after.description, 'Approved description');

  const replay = await h.call('apply_listing_edit', { proposalId });
  assert.equal(replay.isError, true);
  assert.match(replay.content[0].text, /not available for applying/);
  assert.equal(applied.length, 1);
});

test('a declined proposal cannot be consumed by the apply tool', async () => {
  let applyCalls = 0;
  const h = harness({
    applyService: {
      async apply() {
        applyCalls += 1;
        throw new Error('must not execute');
      },
    },
  });
  const declined = await h.call(
    'prepare_listing_edit',
    { listingId: snapshot.listingId, changes: { description: 'Declined description' } },
    async () => ({ action: 'decline' }),
  );
  assert.equal(declined.isError, true);
  const replay = await h.call('apply_listing_edit', {
    proposalId: 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  });
  assert.equal(replay.isError, true);
  assert.equal(applyCalls, 0);
});

test('a failed final audit record tells the seller to inspect before retrying', async () => {
  const h = harness({
    applyService: {
      async apply() {
        throw new ListingApplyError('audit_failed', false);
      },
    },
  });
  const prepared = await h.call(
    'prepare_listing_edit',
    { listingId: snapshot.listingId, changes: { description: 'Approved description' } },
    async () => ({ action: 'accept' }),
  );
  const { proposalId } = body(prepared);
  const result = await h.call('apply_listing_edit', { proposalId });
  assert.equal(result.isError, true);
  assert.match(
    result.content[0].text,
    /request was sent, but its final audit record could not be saved/,
  );
  assert.match(result.content[0].text, /Check the listing before trying again/);
  assert.doesNotMatch(result.content[0].text, /No listing change was sent/);
});

test('expiry, malformed changes, missing timestamp and storage limits fail closed', async () => {
  let time = 1000;
  const expired = createEditProposalService({
    now: () => time,
    createId: () => 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001',
  });
  const proposal = expired.prepare(snapshot, { title: 'Later title' });
  time += 5 * 60 * 1000;
  assert.throws(() => expired.getPending(proposal.proposalId), { code: 'proposal_expired' });

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

  let sequence = 0;
  const bounded = createEditProposalService({
    now: () => time,
    createId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  });
  for (let index = 0; index < 128; index += 1)
    bounded.prepare(snapshot, { title: `Changed title ${index}` });
  assert.throws(() => bounded.prepare(snapshot, { title: 'One too many' }), {
    code: 'proposal_limit',
  });
  time += 5 * 60 * 1000;
  assert.doesNotThrow(() => bounded.prepare(snapshot, { title: 'Reclaimed capacity' }));
});
