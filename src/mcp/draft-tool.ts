import type { McpServer } from '@modelcontextprotocol/server';
import {
  draftInputSchema,
  draftResultSchema,
  validateListingDraft,
} from '../review/draft-validator.js';

export function registerDraftValidationTool(server: Pick<McpServer, 'registerTool'>): void {
  server.registerTool(
    'validate_listing_draft',
    {
      description:
        'Check proposed title, description and tags locally. Title limit: 140 Unicode code points; at most 13 tags, 20 code points each. Description limit: 16,384 UTF-8 bytes (application policy, not an Etsy maximum). Also checks documented characters and returns issue codes/counts without draft echo. No Etsy, credentials, files, persistence or edits. Does not check truth, ownership, ranking or sales, and never grants approval.',
      inputSchema: draftInputSchema,
      outputSchema: draftResultSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const result = validateListingDraft(input);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'Draft input must contain only bounded title, description and tags. No draft was saved or applied.',
            },
          ],
        };
      }
    },
  );
}
