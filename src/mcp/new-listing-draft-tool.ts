import type { McpServer } from '@modelcontextprotocol/server';
import { NEW_LISTING_DRAFT_WORKFLOW } from '../guidance/new-listing-draft-workflow.js';

/** Supplies a client-led, photo-aware workflow without receiving or storing images. */
export function registerNewListingDraftTool(server: Pick<McpServer, 'registerTool'>): void {
  server.registerTool(
    'start_new_listing_draft',
    {
      description:
        'Natural-language entry point for preparing a new Etsy listing draft. Call when the owner shares new-product photos or asks for help making a listing. Guide the owner through photo observations and a category-aware fact interview, keeping unresolved requirements visible. The connected AI client handles photos from chat; this tool does not fetch category data or create or publish on Etsy.',
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
