import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createLocalReadService } from './etsy/local-read-service.js';
import { createServer } from './server.js';
import { createLocalGuidanceService } from './guidance/local-guidance-service.js';
import { createLocalListingApplyService } from './etsy/local-apply-service.js';
import { createPrivatePlaybookWriter } from './local/private-playbook-writer.js';
import { createPrivateGuidanceSettingsStore } from './local/private-guidance-settings.js';
import { fileURLToPath } from 'node:url';

// Explicit opt-in local alpha. Construction does not read the keychain or contact Etsy.
const readService = createLocalReadService(globalThis.fetch);
const applyService = createLocalListingApplyService(globalThis.fetch, readService);
const repositoryDirectory = fileURLToPath(new URL('../../', import.meta.url));
const privateGuidanceSettings = createPrivateGuidanceSettingsStore({ repositoryDirectory });
void serveStdio(() =>
  createServer({
    readService,
    guidanceService: createLocalGuidanceService({
      settingsStore: privateGuidanceSettings,
      repositoryDirectory,
    }),
    privatePlaybookWriter: createPrivatePlaybookWriter({
      repositoryDirectory,
      ...(process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY === undefined ||
      process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY.length === 0
        ? {}
        : { directory: process.env.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY }),
    }),
    privateGuidanceSettings,
    draftValidation: true,
    editProposals: true,
    applyService,
  }),
);
