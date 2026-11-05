import {
  AuditStoreError,
  type AuditErrorCategory,
  type LocalAuditStore,
} from '../local/audit-store.js';
import { validateListingDraft } from '../review/draft-validator.js';
import type { ListingEditChanges, ListingEditProposal } from './proposal-service.js';

export interface ApplyListingSnapshot {
  readonly listingId: number;
  readonly lastModifiedTimestamp?: number;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
}

export interface ApplyConnectionStatus {
  readonly etsyAccess: 'not_checked' | 'verified_this_session';
  readonly connection?: { readonly ownerId: number; readonly shopId: number };
}

export interface ListingApplyClient {
  readonly identity: { readonly ownerId: number; readonly shopId: number };
  updateListing(listingId: number, changes: ListingEditChanges): Promise<void>;
}

export type ListingApplyOutcome = 'verified' | 'reconciled' | 'rejected' | 'uncertain';
export interface ListingApplyResult {
  readonly proposalId: string;
  readonly listingId: number;
  readonly outcome: ListingApplyOutcome;
  readonly changedFields: readonly (keyof ListingEditChanges)[];
}

export type ListingApplyErrorCode =
  | 'proposal_stale'
  | 'identity_mismatch'
  | 'verification_failed'
  | 'invalid_copy'
  | 'authorization_required'
  | 'audit_unavailable'
  | 'audit_failed';

export class ListingApplyError extends Error {
  constructor(
    readonly code: ListingApplyErrorCode,
    readonly mayHaveChanged = false,
  ) {
    super(`Listing apply failed (${code}).`);
    this.name = 'ListingApplyError';
  }
}

const FIELD_ORDER = ['title', 'description', 'tags'] as const;

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function fieldsMatch(snapshot: ApplyListingSnapshot, changes: ListingEditChanges): boolean {
  return Object.entries(changes).every(([field, value]) =>
    sameValue(snapshot[field as keyof ApplyListingSnapshot], value),
  );
}

function changedFields(proposal: ListingEditProposal): (keyof ListingEditChanges)[] {
  return FIELD_ORDER.filter((field) => Object.hasOwn(proposal.after, field));
}

function mergeDraft(
  snapshot: ApplyListingSnapshot,
  changes: ListingEditChanges,
): { readonly title: string; readonly description: string; readonly tags: readonly string[] } {
  return {
    title: changes.title ?? snapshot.title,
    description: changes.description ?? snapshot.description,
    tags: changes.tags ?? snapshot.tags,
  };
}

function errorCategory(error: unknown): AuditErrorCategory {
  if (error instanceof Error && 'mayHaveApplied' in error) {
    const mayHaveApplied = (error as { readonly mayHaveApplied?: unknown }).mayHaveApplied;
    return mayHaveApplied === true ? 'transport_failed' : 'etsy_rejected';
  }
  return 'transport_failed';
}

/** Applies one previously approved proposal using a fixed writer and the local audit store. */
export function createListingApplyService(options: {
  readonly getSnapshot: (listingId: number) => Promise<{
    readonly snapshot: ApplyListingSnapshot;
    readonly connection: ApplyConnectionStatus;
  }>;
  readonly getWriteClient: () => Promise<ListingApplyClient>;
  readonly getAuditStore: () => Promise<LocalAuditStore>;
}) {
  async function current(proposal: ListingEditProposal) {
    let result: Awaited<ReturnType<typeof options.getSnapshot>>;
    try {
      result = await options.getSnapshot(proposal.listingId);
    } catch {
      throw new ListingApplyError('verification_failed');
    }
    const connection = result.connection.connection;
    if (
      result.connection.etsyAccess !== 'verified_this_session' ||
      !connection ||
      connection.ownerId !== proposal.ownerId ||
      connection.shopId !== proposal.shopId ||
      result.snapshot.listingId !== proposal.listingId
    ) {
      throw new ListingApplyError('identity_mismatch');
    }
    return result.snapshot;
  }

  return {
    async apply(proposal: ListingEditProposal): Promise<ListingApplyResult> {
      let auditStore: LocalAuditStore;
      try {
        auditStore = await options.getAuditStore();
      } catch {
        throw new ListingApplyError('audit_unavailable');
      }
      const fields = changedFields(proposal);
      let mayHaveChanged = false;
      try {
        return await auditStore.withWriter(async (writer) => {
          const before = await current(proposal);
          if (
            before.lastModifiedTimestamp === undefined ||
            before.lastModifiedTimestamp !== proposal.lastModifiedTimestamp ||
            !fieldsMatch(before, proposal.before)
          ) {
            throw new ListingApplyError('proposal_stale');
          }
          const draft = mergeDraft(before, proposal.after);
          if (!validateListingDraft(draft).valid) throw new ListingApplyError('invalid_copy');

          let client: ListingApplyClient;
          try {
            client = await options.getWriteClient();
          } catch {
            throw new ListingApplyError('authorization_required');
          }
          if (
            client.identity.ownerId !== proposal.ownerId ||
            client.identity.shopId !== proposal.shopId
          ) {
            throw new ListingApplyError('identity_mismatch');
          }

          let receipt;
          try {
            receipt = await writer.appendIntent(proposal);
          } catch {
            throw new ListingApplyError('audit_unavailable');
          }

          let requestError: unknown;
          try {
            mayHaveChanged = true;
            await client.updateListing(proposal.listingId, proposal.after);
          } catch (error) {
            requestError = error;
            mayHaveChanged =
              !(error instanceof Error && 'mayHaveApplied' in error) ||
              (error as { readonly mayHaveApplied?: unknown }).mayHaveApplied !== false;
          }

          let after: ApplyListingSnapshot | undefined;
          try {
            after = await current(proposal);
          } catch {
            // A failed read after a PATCH cannot establish the actual listing state.
          }

          let outcome: ListingApplyOutcome;
          let category: AuditErrorCategory | undefined;
          if (after && fieldsMatch(after, proposal.after)) {
            if (requestError === undefined) {
              outcome = 'verified';
            } else if (mayHaveChanged) {
              outcome = 'reconciled';
              category = errorCategory(requestError);
            } else {
              outcome = 'uncertain';
              category = 'verification_failed';
            }
          } else if (
            after &&
            fieldsMatch(after, proposal.before) &&
            requestError !== undefined &&
            !mayHaveChanged
          ) {
            outcome = 'rejected';
            category = errorCategory(requestError);
          } else {
            outcome = 'uncertain';
            category = after ? 'verification_failed' : 'read_failed';
          }

          try {
            await writer.appendOutcome(receipt, outcome, category);
          } catch {
            throw new ListingApplyError('audit_failed', mayHaveChanged);
          }
          return {
            proposalId: proposal.proposalId,
            listingId: proposal.listingId,
            outcome,
            changedFields: fields,
          };
        });
      } catch (error) {
        if (error instanceof ListingApplyError) throw error;
        if (mayHaveChanged) throw new ListingApplyError('audit_failed', true);
        if (error instanceof AuditStoreError) throw new ListingApplyError('audit_unavailable');
        throw new ListingApplyError('audit_unavailable');
      }
    },
  };
}
