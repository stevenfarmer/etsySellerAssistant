import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createLocalReadService } from './etsy/local-read-service.js';
import { createServer } from './server.js';
import { createLocalGuidanceService } from './guidance/local-guidance-service.js';

// Explicit opt-in local alpha. Construction does not read the keychain or contact Etsy.
void serveStdio(() =>
  createServer({
    readService: createLocalReadService(globalThis.fetch),
    guidanceService: createLocalGuidanceService(),
    draftValidation: true,
  }),
);
