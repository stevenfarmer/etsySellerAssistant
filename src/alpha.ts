import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createLocalReadService } from './etsy/local-read-service.js';
import { createServer } from './server.js';
import { createLocalGuidanceService } from './guidance/local-guidance-service.js';
import { createLocalListingApplyService } from './etsy/local-apply-service.js';

// Explicit opt-in local alpha. Construction does not read the keychain or contact Etsy.
const readService = createLocalReadService(globalThis.fetch);
const applyService = createLocalListingApplyService(globalThis.fetch, readService);
void serveStdio(() =>
  createServer({
    readService,
    guidanceService: createLocalGuidanceService(),
    draftValidation: true,
    editProposals: true,
    applyService,
  }),
);
