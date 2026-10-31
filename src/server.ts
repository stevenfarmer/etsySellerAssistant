import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';
import { getSetupStatus } from './status.js';

const emptyInput = z.object({});

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'etsySellerAssistant',
    version: '0.1.0',
  });

  server.registerTool(
    'get_setup_status',
    {
      description:
        'Reports local setup status. This scaffold does not connect to Etsy or read shop data.',
      inputSchema: emptyInput,
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(getSetupStatus(), null, 2),
        },
      ],
    }),
  );

  return server;
}
