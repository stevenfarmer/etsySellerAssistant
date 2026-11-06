import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import { PRIVATE_SETUP_PROMPT } from '../guidance/private-setup-prompt.js';
import type { PrivatePlaybookWriter } from '../local/private-playbook-writer.js';
import { MAX_PLAYBOOK_BYTES, PlaybookError } from '../local/private-playbook.js';

const emptyInput = z.object({}).strict();
const saveInput = z
  .object({
    content: z.string().min(1).max(MAX_PLAYBOOK_BYTES),
    ownerConfirmed: z.literal(true),
  })
  .strict();

function failure(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

/** Generic setup prompt and fixed-path, chat-confirmed, create-only private guidance save. */
export function registerPrivateSetupTools(server: McpServer, writer: PrivatePlaybookWriter): void {
  server.registerTool(
    'get_private_guidance_setup',
    {
      description:
        'Returns generic instructions for an optional, disclosed interview to prepare private Etsy seller guidance. No Etsy or private-file access occurs. The selected AI client conducts the interview and research; nothing is saved or activated by this tool.',
      inputSchema: emptyInput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      if (!emptyInput.safeParse(rawInput).success)
        return failure('This setup prompt accepts no arguments.');
      return { content: [{ type: 'text' as const, text: PRIVATE_SETUP_PROMPT }] };
    },
  );

  server.registerTool(
    'save_private_guidance',
    {
      description:
        'Save the complete private guidance document to the installation’s fixed local file. First show the entire exact document in chat and ask the owner to choose Save or Don’t save; wait for an explicit Save reply before calling this tool with ownerConfirmed:true. This flag records the assistant’s confirmation but the server cannot verify the chat transcript. If declined, cancelled, unclear, or unapproved, do not call this tool. The save creates a new file only; it never overwrites existing guidance, changes Etsy, or activates private guidance. After success, ask separately whether to turn private guidance on or keep it off.',
      inputSchema: saveInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (rawInput) => {
      const parsed = saveInput.safeParse(rawInput);
      if (!parsed.success)
        return failure(
          'Show the complete document and receive the owner’s explicit Save choice before calling this tool with ownerConfirmed:true.',
        );
      try {
        await writer.create(parsed.data.content);
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Private guidance saved. It remains off until the owner separately turns it on in chat.',
            },
          ],
        };
      } catch (error) {
        if (error instanceof PlaybookError) {
          if (error.code === 'already_exists')
            return failure(
              'Private guidance already exists. It was left unchanged; no file was written. Use the reviewed update workflow when available.',
            );
          if (error.code === 'invalid_content' || error.code === 'too_large')
            return failure(
              'The document is blank, contains unsupported characters, or exceeds the 65,536-byte limit. No file was written.',
            );
          if (
            error.code === 'unsafe_path' ||
            error.code === 'unsafe_permissions' ||
            error.code === 'invalid_path'
          )
            return failure(
              'The configured private guidance location is not safe to use. No file was written.',
            );
        }
        return failure(
          'Private guidance could not be saved safely. No success was recorded. Check the local storage setup.',
        );
      }
    },
  );
}
