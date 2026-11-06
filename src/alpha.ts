import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createLocalReadService } from './etsy/local-read-service.js';
import { createServer } from './server.js';
import { createLocalGuidanceService } from './guidance/local-guidance-service.js';
import { createLocalListingApplyService } from './etsy/local-apply-service.js';
import { createPrivatePlaybookWriter } from './local/private-playbook-writer.js';
import { fileURLToPath } from 'node:url';

// Explicit opt-in local alpha. Construction does not read the keychain or contact Etsy.
const readService = createLocalReadService(globalThis.fetch);
const applyService = createLocalListingApplyService(globalThis.fetch, readService);
void serveStdio(() =>
  createServer({
    readService,
    guidanceService: createLocalGuidanceService(),
    privatePlaybookWriter: createPrivatePlaybookWriter({
      repositoryDirectory: fileURLToPath(new URL('../../', import.meta.url)),
      ...(process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY === undefined ||
      process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY.length === 0
        ? {}
        : { directory: process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY }),
    }),
    draftValidation: true,
    editProposals: true,
    applyService,
  }),
);
