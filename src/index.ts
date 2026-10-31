import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createServer } from './server.js';

void serveStdio(() => createServer());
console.error('etsySellerAssistant MCP server started on STDIO. Etsy access is not configured.');
