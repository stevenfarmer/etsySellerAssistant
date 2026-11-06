import { z } from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/server';
import { PRIVATE_SETUP_PROMPT } from '../guidance/private-setup-prompt.js';
import type { PrivatePlaybookWriter } from '../local/private-playbook-writer.js';
import { MAX_PLAYBOOK_BYTES, PlaybookError } from '../local/private-playbook.js';

const emptyInput = z.object({}).strict();
const saveInput = z.object({ content: z.string().min(1).max(MAX_PLAYBOOK_BYTES) }).strict();

function failure(message: string) {
  return { isError: true, content: [{ type: 'text' as const, text: message }] };
}

/** Generic setup prompt and fixed-path, confirmed, create-only private guidance save. */
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
        'Save the complete owner-reviewed private guidance document to the installation’s fixed local guidance file. Immediately shows the exact document in one host confirmation. Accept creates a new file only; it never overwrites an existing file, changes Etsy or activates private guidance. After success, ask the owner separately in chat whether to turn private guidance on or keep it off.',
      inputSchema: saveInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (rawInput, context) => {
      const parsed = saveInput.safeParse(rawInput);
      if (!parsed.success)
        return failure('Provide the complete nonempty private guidance document.');
      let result: Awaited<ReturnType<typeof context.mcpReq.elicitInput>>;
      try {
        result = await context.mcpReq.elicitInput({
          mode: 'form',
          message: [
            'Save this exact private guidance document?',
            'Destination: this installation’s private guidance folder (playbook.private.md).',
            'Accept creates the file only if it does not already exist. Etsy is unchanged and private guidance stays off.',
            'The selected AI provider has already received the setup conversation and draft.',
            '--- DOCUMENT START ---',
            parsed.data.content,
            '--- DOCUMENT END ---',
          ].join('\n\n'),
          requestedSchema: { type: 'object', properties: {} },
        });
      } catch {
        return failure('The confirmation could not be opened. No file was written.');
      }
      if (result.action !== 'accept') {
        return failure('Save was declined or cancelled. No file was written.');
      }
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
