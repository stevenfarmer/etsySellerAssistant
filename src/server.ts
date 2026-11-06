import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { getSetupStatus, getReadSetupStatus } from './status.js';
import { registerReadOnlyListingTools, type ReadOnlyListingService } from './mcp/read-tools.js';
import { registerGuidanceTool } from './mcp/guidance-tool.js';
import type { ReviewGuidanceService } from './guidance/review-guidance.js';
import { registerDraftValidationTool } from './mcp/draft-tool.js';
import { registerEditProposalTools } from './mcp/edit-proposal-tools.js';
import { registerPrivateSetupTools } from './mcp/private-setup-tools.js';
import type { PrivatePlaybookWriter } from './local/private-playbook-writer.js';
import type { PrivateGuidanceSettingsStore } from './local/private-guidance-settings.js';
import type { ListingEditProposal } from './edits/proposal-service.js';
import type { ListingApplyResult } from './edits/apply-service.js';

const emptyInput = z.object({});

export function createServer(
  options: {
    readonly readService?: ReadOnlyListingService;
    readonly guidanceService?: ReviewGuidanceService;
    readonly draftValidation?: boolean;
    readonly editProposals?: boolean;
    readonly privatePlaybookWriter?: PrivatePlaybookWriter;
    readonly privateGuidanceSettings?: PrivateGuidanceSettingsStore;
    readonly applyService?: {
      apply(proposal: ListingEditProposal): Promise<ListingApplyResult>;
    };
  } = {},
): McpServer {
  const server = new McpServer({
    name: 'etsySellerAssistant',
    version: '1.0.0',
  });

  server.registerTool(
    'get_setup_status',
    {
      description: options.readService
        ? 'Reports connection identity from the last successful listing read in this server session. Status does not contact Etsy or read credentials and does not prove current authorization. A later pending or failed listing read clears verification.'
        : 'Reports local setup status. This scaffold does not connect to Etsy or read shop data.',
      inputSchema: emptyInput,
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            options.readService
              ? getReadSetupStatus(options.readService.getConnectionStatus?.())
              : getSetupStatus(),
            null,
            2,
          ),
        },
      ],
    }),
  );

  if (options.readService) {
    registerReadOnlyListingTools(server, options.readService);
    if (options.editProposals)
      registerEditProposalTools(server, {
        readService: options.readService,
        ...(options.applyService ? { applyService: options.applyService } : {}),
      });
  }
  if (options.guidanceService) registerGuidanceTool(server, options.guidanceService);
  if (options.privatePlaybookWriter && options.privateGuidanceSettings) {
    registerPrivateSetupTools(
      server,
      options.privatePlaybookWriter,
      options.privateGuidanceSettings,
    );
  }
  if (options.draftValidation) registerDraftValidationTool(server);

  return server;
}
