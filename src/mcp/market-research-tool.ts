import type { McpServer } from '@modelcontextprotocol/server';
import { MARKET_RESEARCH_WORKFLOW } from '../guidance/market-research-workflow.js';

/** Returns the client-side workflow for public-market research on explicit request. */
export function registerMarketResearchTool(server: Pick<McpServer, 'registerTool'>): void {
  server.registerTool(
    'get_market_research_guidance',
    {
      description:
        'Call only when the owner asks for public pricing/comparable-product research, seasonal marketing ideas, or trend research. Returns a sourced research workflow for the connected AI application to carry out. This server does not browse, contact marketplaces, read seller analytics, or change listings or campaigns.',
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
      content: [{ type: 'text' as const, text: JSON.stringify(MARKET_RESEARCH_WORKFLOW) }],
      structuredContent: MARKET_RESEARCH_WORKFLOW,
    }),
  );
}
