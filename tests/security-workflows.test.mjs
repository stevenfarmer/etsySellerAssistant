import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import test from 'node:test';

test('CI runs a pinned CodeQL JavaScript/TypeScript analysis on PRs and main with scoped permissions', async () => {
  const workflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /codeql-action\/init@[a-f0-9]{40} # v3\./);
  assert.match(workflow, /codeql-action\/analyze@[a-f0-9]{40} # v3\./);
  assert.match(workflow, /languages: javascript-typescript/);
  assert.match(workflow, /security-events: write/);
  assert.match(workflow, /Scan secrets with Gitleaks/);
  assert.match(workflow, /npm audit --audit-level=high/);
  assert.match(workflow, /npm run validate/);
});
