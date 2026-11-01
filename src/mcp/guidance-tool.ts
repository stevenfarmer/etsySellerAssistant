import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import { guidanceOutputSchema, type ReviewGuidanceService } from '../guidance/review-guidance.js';
import { PlaybookError, type PlaybookErrorCode } from '../local/private-playbook.js';

const input = z.object({}).strict();
const messages: Record<PlaybookErrorCode, string> = {
  invalid_path:
    'The private guidance directory must be an absolute local path outside Git. Check the client guidance settings.',
  unsafe_path:
    'Private guidance is in an unsafe location or uses a link/non-regular file. Use a separate private directory outside Git.',
  unsafe_permissions:
    'Private guidance must be owned by the current user with private file and directory permissions. Review the storage guide.',
  too_large:
    'Private guidance exceeds the 65,536-byte limit. Shorten the file before explicitly requesting it again.',
  invalid_content:
    'Private guidance must be nonblank valid UTF-8 without unsupported control characters. Review the file locally.',
  changed_file:
    'Private guidance changed while being read. Save a stable file, then explicitly request guidance again.',
  io_failed:
    'Private guidance could not be read safely. Check the local file and storage guide; no generic fallback was returned.',
};
const generalMessage =
  'Review guidance could not be loaded safely. Check guidance mode/directory and the storage guide. No private content or generic fallback was returned.';

export function registerGuidanceTool(
  server: Pick<McpServer, 'registerTool'>,
  service: ReviewGuidanceService,
): void {
  server.registerTool(
    'get_review_guidance',
    {
      description:
        'Explicitly retrieve generic or opted-in private listing-review guidance. The selected AI client/provider receives its text. This reads no Etsy/credentials, accepts no paths, and grants no edit approval. Startup/status never loads guidance.',
      inputSchema: input,
      outputSchema: guidanceOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      if (!input.safeParse(rawInput).success) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'get_review_guidance accepts no arguments.' }],
        };
      }
      try {
        const parsed = guidanceOutputSchema.safeParse(await service.getGuidance());
        if (
          !parsed.success ||
          (parsed.data.source === 'private') !== (parsed.data.selection === 'private_file')
        ) {
          throw new Error('invalid_guidance_result');
        }
        const result = parsed.data;
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        const text =
          error instanceof PlaybookError
            ? (messages[error.code] ?? generalMessage)
            : generalMessage;
        return { isError: true, content: [{ type: 'text' as const, text }] };
      }
    },
  );
}
