import { fileURLToPath } from 'node:url';
import {
  createPrivatePlaybookReader,
  resolvePrivatePlaybookDirectory,
} from '../local/private-playbook.js';
import { createReviewGuidanceService, type ReviewGuidanceService } from './review-guidance.js';

export interface LocalGuidanceOptions {
  readonly environment?: Readonly<Record<string, string | undefined>>;
  /** Trusted test/installation override, never exposed in MCP tool input. */
  readonly repositoryDirectory?: string;
}

/** No configuration resolution or private I/O until the explicit guidance call. */
export function createLocalGuidanceService(
  options: LocalGuidanceOptions = {},
): ReviewGuidanceService {
  return {
    async getGuidance() {
      const environment = options.environment ?? process.env;
      const mode = environment.ETSY_SELLER_ASSISTANT_GUIDANCE_MODE ?? 'generic';
      if (mode === 'generic') return createReviewGuidanceService().getGuidance();
      if (mode !== 'private') throw new Error('invalid_guidance_configuration');
      const override = environment.ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY;
      const directory = resolvePrivatePlaybookDirectory(
        override === undefined ? {} : { directory: override },
      );
      const reader = createPrivatePlaybookReader({
        directory,
        repositoryDirectory:
          options.repositoryDirectory ?? fileURLToPath(new URL('../../../', import.meta.url)),
      });
      return createReviewGuidanceService(() => reader.read()).getGuidance();
    },
  };
}
