import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { getSetupStatus } from './status.js';
import { registerReadOnlyListingTools, type ReadOnlyListingService } from './mcp/read-tools.js';

const emptyInput = z.object({});

export function createServer(
  options: { readonly readService?: ReadOnlyListingService } = {},
): McpServer {
  const server = new McpServer({
    name: 'etsySellerAssistant',
    version: '0.1.0-alpha.1',
  });

  server.registerTool(
    'get_setup_status',
    {
      description: options.readService
        ? 'Reports local setup status. Read-only listing tools are available; connection status has not been checked.'
        : 'Reports local setup status. This scaffold does not connect to Etsy or read shop data.',
      inputSchema: emptyInput,
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            options.readService
              ? { ...getSetupStatus(), etsyAccess: 'not_checked' }
              : getSetupStatus(),
            null,
            2,
          ),
        },
      ],
    }),
  );

  if (options.readService) registerReadOnlyListingTools(server, options.readService);

  return server;
}
