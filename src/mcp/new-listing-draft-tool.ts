import type { McpServer } from '@modelcontextprotocol/server';
import { NEW_LISTING_DRAFT_WORKFLOW } from '../guidance/new-listing-draft-workflow.js';

/** Supplies a client-led, photo-aware workflow without receiving or storing images. */
export function registerNewListingDraftTool(server: Pick<McpServer, 'registerTool'>): void {
  server.registerTool(
    'start_new_listing_draft',
    {
      description:
        'Natural-language entry point for creating a complete new Etsy listing draft. Call when the owner shares new-product photos or asks for help making a listing. Then guide the owner through the photo observations and one-question-at-a-time fact interview, and revise a complete ready-to-enter draft. The connected AI client handles photos from chat; this tool does not create or publish on Etsy.',
      inputSchema: {},
      outputSchema: undefined,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => ({
      content: [{ type: 'text' as const, text: JSON.stringify(NEW_LISTING_DRAFT_WORKFLOW) }],
      structuredContent: NEW_LISTING_DRAFT_WORKFLOW,
    }),
  );
}
