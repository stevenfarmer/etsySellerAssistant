import assert from 'node:assert/strict';
import test from 'node:test';
import { NEW_LISTING_DRAFT_WORKFLOW } from '../dist/src/guidance/new-listing-draft-workflow.js';
import { registerNewListingDraftTool } from '../dist/src/mcp/new-listing-draft-tool.js';

function tool() {
  let registered;
  registerNewListingDraftTool({
    registerTool(name, definition, handler) {
      registered = { name, definition, handler };
    },
  });
  return registered;
}

test('new listing workflow covers photo interview, applicable Etsy fields, and finished draft', () => {
  assert.match(NEW_LISTING_DRAFT_WORKFLOW.title, /complete, reviewable Etsy listing draft/);
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.instructions.some((line) =>
      /one focused question at a time/.test(line),
    ),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.instructions.some((line) => /does not create or publish/.test(line)),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.instructions.some((line) =>
      /guidance is general, tell the owner/.test(line),
    ),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.listingFields.some((group) => group.fields.includes('who made it')),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.listingFields.some((group) =>
      group.fields.includes('when it was made'),
    ),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.listingFields.some((group) =>
      group.fields.includes('suggested category/taxonomy'),
    ),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.listingFields.some((group) =>
      group.fields.includes('variations/options'),
    ),
  );
  assert.ok(
    NEW_LISTING_DRAFT_WORKFLOW.listingFields.some((group) =>
      group.fields.includes('existing shipping profile'),
    ),
  );
  assert.match(
    NEW_LISTING_DRAFT_WORKFLOW.conversation.at(-1),
    /complete, ready-to-enter listing draft/,
  );
});

test('natural-language start tool returns the fixed workflow without taking Etsy or file actions', async () => {
  const registered = tool();
  assert.equal(registered.name, 'start_new_listing_draft');
  assert.match(registered.definition.description, /shares new-product photos/);
  assert.deepEqual(registered.definition.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  const result = await registered.handler({});
  assert.deepEqual(result.structuredContent, NEW_LISTING_DRAFT_WORKFLOW);
  assert.deepEqual(JSON.parse(result.content[0].text), NEW_LISTING_DRAFT_WORKFLOW);
});
