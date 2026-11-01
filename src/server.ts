import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { getSetupStatus, getReadSetupStatus } from './status.js';
import { registerReadOnlyListingTools, type ReadOnlyListingService } from './mcp/read-tools.js';

const emptyInput = z.object({});

export function createServer(
  options: { readonly readService?: ReadOnlyListingService } = {},
): McpServer {
  const server = new McpServer({
    name: 'etsySellerAssistant',
    version: '1.0.0-rc.1',
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

  if (options.readService) registerReadOnlyListingTools(server, options.readService);

  return server;
}
