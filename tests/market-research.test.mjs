import assert from 'node:assert/strict';
import test from 'node:test';
import { MARKET_RESEARCH_WORKFLOW } from '../dist/src/guidance/market-research-workflow.js';
import { registerMarketResearchTool } from '../dist/src/mcp/market-research-tool.js';

function tool() {
  let registered;
  registerMarketResearchTool({
    registerTool(name, definition, handler) {
      registered = { name, definition, handler };
    },
  });
  return registered;
}

test('market research is explicitly requested and covers pricing and marketing evidence', () => {
  assert.match(MARKET_RESEARCH_WORKFLOW.title, /only when requested/);
  assert.ok(
    MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /only when the owner asks/.test(line)),
  );
  assert.ok(MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /Etsy, eBay/.test(line)));
  assert.ok(
    MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /completed-sale evidence/.test(line)),
  );
  assert.ok(MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /date checked/.test(line)));
  assert.ok(MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /short listing video/.test(line)));
  assert.ok(MARKET_RESEARCH_WORKFLOW.instructions.some((line) => /does not browse/.test(line)));
  assert.ok(
    MARKET_RESEARCH_WORKFLOW.instructions.some((line) =>
      /Do not create or launch campaigns/.test(line),
    ),
  );
});

test('market research tool returns fixed guidance without external or Etsy actions', async () => {
  const registered = tool();
  assert.equal(registered.name, 'get_market_research_guidance');
  assert.match(registered.definition.description, /Call only when the owner asks/);
  assert.deepEqual(registered.definition.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  const result = await registered.handler({});
  assert.deepEqual(result.structuredContent, MARKET_RESEARCH_WORKFLOW);
  assert.deepEqual(JSON.parse(result.content[0].text), MARKET_RESEARCH_WORKFLOW);
});
