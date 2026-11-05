import { createHash, randomUUID } from 'node:crypto';

export interface ListingEditSnapshot {
  readonly listingId: number;
  readonly ownerId: number;
  readonly shopId: number;
  readonly lastModifiedTimestamp: number;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface ListingEditChanges {
  readonly title?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface ListingEditProposal {
  readonly proposalId: string;
  readonly listingId: number;
  readonly ownerId: number;
  readonly shopId: number;
  readonly lastModifiedTimestamp: number;
  readonly before: ListingEditChanges;
  readonly after: ListingEditChanges;
  readonly expiresAt: number;
}

export type ApprovalResult =
  { readonly action: 'accept' } | { readonly action: 'decline' | 'cancel' };

type StoredProposal = {
  readonly proposal: ListingEditProposal;
  readonly digest: string;
  state: 'pending' | 'asking' | 'approved' | 'used';
};

const PROPOSAL_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING_PROPOSALS = 128;
const FIELDS = ['title', 'description', 'tags'] as const;

export type ProposalErrorCode =
  | 'invalid_snapshot'
  | 'invalid_changes'
  | 'proposal_not_available'
  | 'proposal_expired'
  | 'proposal_stale'
  | 'proposal_limit'
  | 'approval_unavailable';

export class ProposalError extends Error {
  constructor(readonly code: ProposalErrorCode) {
    super(code);
    this.name = 'ProposalError';
  }
}

function digestProposal(proposal: ListingEditProposal): string {
  return createHash('sha256').update(JSON.stringify(proposal)).digest('hex');
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validSnapshot(snapshot: ListingEditSnapshot): boolean {
  return (
    Number.isSafeInteger(snapshot.listingId) &&
    snapshot.listingId > 0 &&
    Number.isSafeInteger(snapshot.ownerId) &&
    snapshot.ownerId > 0 &&
    Number.isSafeInteger(snapshot.shopId) &&
    snapshot.shopId > 0 &&
    Number.isSafeInteger(snapshot.lastModifiedTimestamp) &&
    snapshot.lastModifiedTimestamp >= 0 &&
    typeof snapshot.title === 'string' &&
    typeof snapshot.description === 'string' &&
    Array.isArray(snapshot.tags) &&
    snapshot.tags.every((tag) => typeof tag === 'string')
  );
}

function validateChanges(changes: ListingEditChanges): void {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes))
    throw new ProposalError('invalid_changes');
  const keys = Object.keys(changes);
  if (keys.length === 0 || keys.some((key) => !FIELDS.includes(key as (typeof FIELDS)[number])))
    throw new ProposalError('invalid_changes');
  if (
    (changes.title !== undefined &&
      (typeof changes.title !== 'string' || changes.title.length > 560)) ||
    (changes.description !== undefined &&
      (typeof changes.description !== 'string' || changes.description.length > 32_768)) ||
    (changes.tags !== undefined &&
      (!Array.isArray(changes.tags) ||
        changes.tags.length > 26 ||
        !changes.tags.every((tag) => typeof tag === 'string' && tag.length <= 80)))
  ) {
    throw new ProposalError('invalid_changes');
  }
}

export function createEditProposalService(
  options: {
    readonly now?: () => number;
    readonly createId?: () => string;
  } = {},
) {
  const now = options.now ?? Date.now;
  const createId = options.createId ?? randomUUID;
  const proposals = new Map<string, StoredProposal>();

  function findAvailable(proposalId: string): StoredProposal {
    const stored = proposals.get(proposalId);
    if (!stored || stored.state !== 'pending') throw new ProposalError('proposal_not_available');
    if (stored.proposal.expiresAt <= now()) {
      stored.state = 'used';
      throw new ProposalError('proposal_expired');
    }
    if (digestProposal(stored.proposal) !== stored.digest) {
      stored.state = 'used';
      throw new ProposalError('proposal_not_available');
    }
    return stored;
  }

  function pruneExpired(): void {
    for (const [proposalId, stored] of proposals) {
      if (stored.state === 'used' || stored.proposal.expiresAt <= now())
        proposals.delete(proposalId);
    }
  }

  return {
    prepare(snapshot: ListingEditSnapshot, changes: ListingEditChanges): ListingEditProposal {
      if (!validSnapshot(snapshot)) throw new ProposalError('invalid_snapshot');
      validateChanges(changes);
      pruneExpired();
      if (proposals.size >= MAX_PENDING_PROPOSALS) throw new ProposalError('proposal_limit');
      const before: { title?: string; description?: string; tags?: readonly string[] } = {};
      const after: { title?: string; description?: string; tags?: readonly string[] } = {};
      for (const field of FIELDS) {
        const value = changes[field];
        if (value === undefined) continue;
        const existing = snapshot[field];
        if (sameValue(value, existing)) throw new ProposalError('invalid_changes');
        if (field === 'tags') {
          before.tags = [...snapshot.tags];
          after.tags = [...(value as readonly string[])];
        } else {
          before[field] = existing as string;
          after[field] = value as string;
        }
      }
      const proposal: ListingEditProposal = Object.freeze({
        proposalId: createId(),
        listingId: snapshot.listingId,
        ownerId: snapshot.ownerId,
        shopId: snapshot.shopId,
        lastModifiedTimestamp: snapshot.lastModifiedTimestamp,
        before: Object.freeze({
          ...before,
          ...(before.tags ? { tags: Object.freeze([...before.tags]) } : {}),
        }),
        after: Object.freeze({
          ...after,
          ...(after.tags ? { tags: Object.freeze([...after.tags]) } : {}),
        }),
        expiresAt: now() + PROPOSAL_TTL_MS,
      });
      if (proposals.has(proposal.proposalId)) throw new ProposalError('proposal_limit');
      proposals.set(proposal.proposalId, {
        proposal,
        digest: digestProposal(proposal),
        state: 'pending',
      });
      return proposal;
    },

    getPending(proposalId: string): ListingEditProposal {
      return findAvailable(proposalId).proposal;
    },

    validateCurrent(proposalId: string, snapshot: ListingEditSnapshot): void {
      const stored = findAvailable(proposalId);
      const proposal = stored.proposal;
      const matches =
        validSnapshot(snapshot) &&
        snapshot.listingId === proposal.listingId &&
        snapshot.ownerId === proposal.ownerId &&
        snapshot.shopId === proposal.shopId &&
        snapshot.lastModifiedTimestamp === proposal.lastModifiedTimestamp &&
        Object.entries(proposal.before).every(([field, value]) =>
          sameValue(snapshot[field as keyof ListingEditSnapshot], value),
        );
      if (!matches) {
        stored.state = 'used';
        throw new ProposalError('proposal_stale');
      }
    },

    async requestApproval(
      proposalId: string,
      request: (proposal: ListingEditProposal) => Promise<ApprovalResult>,
    ): Promise<'approved' | 'declined'> {
      const stored = findAvailable(proposalId);
      stored.state = 'asking';
      let answer: ApprovalResult;
      try {
        answer = await request(stored.proposal);
      } catch {
        stored.state = 'used';
        throw new ProposalError('approval_unavailable');
      }
      if (stored.proposal.expiresAt <= now()) {
        stored.state = 'used';
        throw new ProposalError('proposal_expired');
      }
      stored.state = answer.action === 'accept' ? 'approved' : 'used';
      return stored.state === 'approved' ? 'approved' : 'declined';
    },

    takeApproved(proposalId: string): ListingEditProposal {
      const stored = proposals.get(proposalId);
      if (!stored || stored.state !== 'approved') throw new ProposalError('proposal_not_available');
      if (stored.proposal.expiresAt <= now()) {
        stored.state = 'used';
        throw new ProposalError('proposal_expired');
      }
      if (digestProposal(stored.proposal) !== stored.digest) {
        stored.state = 'used';
        throw new ProposalError('proposal_not_available');
      }
      stored.state = 'used';
      return stored.proposal;
    },
  };
}
