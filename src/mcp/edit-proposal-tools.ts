import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import type { ReadOnlyListingService } from './read-tools.js';
import {
  createEditProposalService,
  ProposalError,
  type ListingEditChanges,
} from '../edits/proposal-service.js';

const changeSchema = z
  .object({
    title: z.string().max(560).optional(),
    description: z.string().max(32_768).optional(),
    tags: z.array(z.string().max(80)).max(26).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined));

const prepareSchema = z
  .object({
    listingId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    changes: changeSchema,
  })
  .strict();

const proposalIdSchema = z.object({ proposalId: z.string().uuid() }).strict();

function success(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

function failure(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

function preview(proposal: ReturnType<ReturnType<typeof createEditProposalService>['prepare']>) {
  return {
    proposalId: proposal.proposalId,
    listingId: proposal.listingId,
    ownerId: proposal.ownerId,
    shopId: proposal.shopId,
    lastModifiedTimestamp: proposal.lastModifiedTimestamp,
    before: proposal.before,
    after: proposal.after,
    expiresAt: new Date(proposal.expiresAt).toISOString(),
  };
}

/** Offline proposal tools. Approval never sends an update request. */
export function registerEditProposalTools(
  server: McpServer,
  dependencies: {
    readonly readService: ReadOnlyListingService;
    readonly proposalService?: ReturnType<typeof createEditProposalService>;
  },
): void {
  const proposalService = dependencies.proposalService ?? createEditProposalService();

  server.registerTool(
    'prepare_listing_edit',
    {
      description:
        'Create a short-lived exact before/after proposal for title, description or tags on a listing returned in this server session. Reads the listing and binds the proposal to the configured owner/shop and modification timestamp. Does not change the listing or grant approval.',
      inputSchema: prepareSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (rawInput) => {
      const parsed = prepareSchema.safeParse(rawInput);
      if (!parsed.success)
        return failure('Provide one listing ID and non-empty title/description/tags changes only.');
      try {
        const listing = await dependencies.readService.getListing(parsed.data.listingId);
        const status = dependencies.readService.getConnectionStatus?.();
        if (
          !status ||
          status.etsyAccess !== 'verified_this_session' ||
          listing.lastModifiedTimestamp === undefined
        ) {
          return failure(
            'A verified listing snapshot with a modification timestamp is required. No proposal was created.',
          );
        }
        const changes = parsed.data.changes as ListingEditChanges;
        const proposal = proposalService.prepare(
          {
            listingId: listing.listingId,
            ownerId: status.connection.ownerId,
            shopId: status.connection.shopId,
            lastModifiedTimestamp: listing.lastModifiedTimestamp,
            title: listing.title,
            description: listing.description,
            tags: listing.tags,
          },
          changes,
        );
        return success(preview(proposal));
      } catch (error) {
        if (error instanceof ProposalError)
          return failure(
            'The proposed changes are invalid or unavailable. No listing was changed.',
          );
        return failure('Could not prepare a listing proposal. No listing was changed.');
      }
    },
  );

  server.registerTool(
    'approve_listing_edit',
    {
      description:
        'Request explicit host confirmation for the exact stored listing edit proposal. If the connected client cannot display and return the confirmation form, approval fails closed. This records approval only; no listing is changed.',
      inputSchema: proposalIdSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (rawInput, context) => {
      const parsed = proposalIdSchema.safeParse(rawInput);
      if (!parsed.success) return failure('Provide a valid proposal ID.');
      try {
        const pending = proposalService.getPending(parsed.data.proposalId);
        const listing = await dependencies.readService.getListing(pending.listingId);
        const status = dependencies.readService.getConnectionStatus?.();
        if (
          !status ||
          status.etsyAccess !== 'verified_this_session' ||
          listing.lastModifiedTimestamp === undefined
        ) {
          return failure(
            'A fresh verified listing snapshot is required. No approval was recorded and no listing was changed.',
          );
        }
        proposalService.validateCurrent(parsed.data.proposalId, {
          listingId: listing.listingId,
          ownerId: status.connection.ownerId,
          shopId: status.connection.shopId,
          lastModifiedTimestamp: listing.lastModifiedTimestamp,
          title: listing.title,
          description: listing.description,
          tags: listing.tags,
        });
        const outcome = await proposalService.requestApproval(
          parsed.data.proposalId,
          async (proposal) => {
            const result = await context.mcpReq.elicitInput({
              mode: 'form',
              message: `Confirm this exact listing edit?\n\n${JSON.stringify(preview(proposal), null, 2)}\n\nAccept only if the listing and every before/after value are correct.`,
              requestedSchema: {
                type: 'object',
                properties: {
                  confirm: { type: 'boolean', title: 'I approve these exact changes' },
                },
                required: ['confirm'],
              },
            });
            if (result.action !== 'accept') return { action: result.action };
            return { action: 'accept', confirm: result.content?.confirm === true };
          },
        );
        return outcome === 'approved'
          ? success({
              proposalId: parsed.data.proposalId,
              status: 'approved_for_later_apply',
              listingChanged: false,
            })
          : failure(
              'Approval was declined or incomplete. The proposal cannot be reused; prepare a new one. No listing was changed.',
            );
      } catch (error) {
        if (error instanceof ProposalError && error.code === 'proposal_expired')
          return failure('The proposal expired. Prepare a new proposal. No listing was changed.');
        if (error instanceof ProposalError && error.code === 'proposal_stale')
          return failure(
            'The listing changed after the proposal was prepared. Prepare a new proposal. No listing was changed.',
          );
        return failure(
          'The confirmation was unavailable or the proposal is no longer active. Approval was not recorded; no listing was changed.',
        );
      }
    },
  );
}
