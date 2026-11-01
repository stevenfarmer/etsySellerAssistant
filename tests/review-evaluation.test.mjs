import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {
  checkEvaluationReview,
  evaluationCaseSchema,
  rubricDimensions,
  summarizeManualAssessment,
} from '../dist/src/review/evaluation.js';

const cases = JSON.parse(
  await fs.readFile(new URL('../evals/review-cases.json', import.meta.url), 'utf8'),
);
// Synthetic protocol examples only, not outputs from the private playbook or an AI benchmark.
function packet(scenario) {
  const decision = scenario.decisions[0];
  return {
    caseId: scenario.id,
    decision,
    evidenceMode: scenario.evidenceMode,
    claims: Object.entries(scenario.facts).map(([factId, statement]) => ({ factId, statement })),
    unknowns: scenario.requiredUnknowns,
    questions: decision === 'ask' ? ['What missing information can be confirmed?'] : [],
    changes: [
      {
        area: 'purchase_confidence',
        evidenceIds: scenario.requiredFacts,
        reason: 'Synthetic test reason.',
        expectedBenefit: 'Synthetic test benefit.',
        uncertainty: 'Not independently verified.',
        tradeoff: 'Synthetic test tradeoff.',
      },
    ],
    keepOption: 'Retain current copy pending review.',
    sourceIds: ['etsy_titles'],
    causalClaim: false,
    approvalGranted: false,
    writePerformed: false,
    ...(decision === 'draft'
      ? {
          draft: {
            title: 'Fabricated sample',
            description: 'Fabricated sample description.',
            tags: ['sample'],
          },
        }
      : {}),
  };
}
const score = (value = 2) => ({
  scores: Object.fromEntries(rubricDimensions.map((key) => [key, value])),
  criticalFailures: [],
});

test('the public suite covers all eight required review conditions with valid referenced facts', () => {
  assert.deepEqual(
    cases.map((c) => c.category),
    [
      'sparse_facts',
      'complete_facts',
      'already_clear',
      'unsupported_claims',
      'hostile_content',
      'conflicting_facts',
      'missing_stats',
      'high_views_low_orders',
    ],
  );
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const scenario of cases) {
    assert.equal(evaluationCaseSchema.safeParse(scenario).success, true);
    for (const key of scenario.requiredFacts) assert.ok(Object.hasOwn(scenario.facts, key));
    const result = checkEvaluationReview(scenario, packet(scenario));
    assert.equal(result.automatedPassed, true);
    assert.equal(result.semanticAssessment, 'manual_required');
  }
});

test('rejects invented or altered declared facts and missing required known/unknown information', () => {
  const scenario = cases[1];
  for (const mutate of [
    (p) => {
      p.claims.push({ factId: 'certification', statement: 'Fabricated unverified private claim' });
    },
    (p) => {
      p.claims[0].statement = 'Fabricated wrong material';
    },
    (p) => {
      p.claims = [];
    },
    (p) => {
      p.unknowns = [];
    },
    (p) => {
      p.changes[0].evidenceIds = ['not_a_fact'];
    },
    (p) => {
      p.claims.push(p.claims[0]);
    },
  ]) {
    const p = packet(scenario);
    mutate(p);
    const result = checkEvaluationReview(scenario, p);
    assert.equal(result.automatedPassed, false);
    assert.equal(JSON.stringify(result).includes('Fabricated unverified private claim'), false);
  }
});

test('conflicts, missing data and already clear copy cannot be bypassed with a forced draft', () => {
  for (const scenario of cases.filter((c) =>
    ['conflicting_facts', 'missing_stats', 'already_clear'].includes(c.category),
  )) {
    const p = packet(scenario);
    p.decision = 'draft';
    p.draft = { title: 'Sample', description: 'Sample details.', tags: ['sample'] };
    assert.ok(checkEvaluationReview(scenario, p).issues.includes('inappropriate_decision'));
  }
  const p = packet(cases[0]);
  p.questions = [];
  assert.ok(checkEvaluationReview(cases[0], p).issues.includes('missing_question'));
});

test('rejects unauthorized action/causality declarations and evidence mode inflation', () => {
  const scenario = cases[7];
  for (const update of [
    { approvalGranted: true },
    { writePerformed: true },
    { causalClaim: true },
    { evidenceMode: 'content_only' },
  ]) {
    assert.equal(
      checkEvaluationReview(scenario, { ...packet(scenario), ...update }).automatedPassed,
      false,
    );
  }
  assert.equal(
    checkEvaluationReview(cases[6], { ...packet(cases[6]), evidenceMode: 'aggregate_observation' })
      .automatedPassed,
    false,
  );
});

test('requires draft preflight only for a draft, and rejects malformed or excessive packets', () => {
  const scenario = cases[1];
  const missing = packet(scenario);
  delete missing.draft;
  assert.ok(checkEvaluationReview(scenario, missing).issues.includes('missing_draft'));
  const bad = packet(scenario);
  bad.draft.title = 'a'.repeat(141);
  assert.ok(checkEvaluationReview(scenario, bad).issues.includes('draft_constraints_failed'));
  const keep = packet(cases[2]);
  keep.draft = packet(scenario).draft;
  assert.ok(checkEvaluationReview(cases[2], keep).issues.includes('unexpected_draft'));
  for (const input of [
    null,
    {},
    { ...packet(scenario), path: '/fabricated-private' },
    { ...packet(scenario), changes: [] },
    { ...packet(scenario), keepOption: 'a'.repeat(2001) },
  ]) {
    assert.deepEqual(checkEvaluationReview(scenario, input), {
      automatedPassed: false,
      issues: ['invalid_evaluation_input'],
      semanticAssessment: 'manual_required',
    });
  }
  assert.ok(
    checkEvaluationReview(
      { ...scenario, requiredFacts: ['missing'] },
      packet(scenario),
    ).issues.includes('invalid_case_facts'),
  );
  assert.ok(
    checkEvaluationReview(scenario, { ...packet(scenario), caseId: 'wrong' }).issues.includes(
      'wrong_case',
    ),
  );
});

test('manual score tally cannot replace missing dimensions, a failed dimension or a critical failure', () => {
  assert.deepEqual(summarizeManualAssessment(score()), { recorded: true, passed: true, total: 16 });
  assert.deepEqual(summarizeManualAssessment(score(1)), {
    recorded: true,
    passed: false,
    total: 8,
  });
  const oneFail = score();
  oneFail.scores.grounding = 0;
  assert.equal(summarizeManualAssessment(oneFail).passed, false);
  assert.equal(
    summarizeManualAssessment({ ...score(), criticalFailures: ['invented_claim'] }).passed,
    false,
  );
  const missing = score();
  delete missing.scores.grounding;
  assert.equal(summarizeManualAssessment(missing).recorded, false);
  assert.equal(
    summarizeManualAssessment({ ...score(), scores: { ...score().scores, extra: 2 } }).recorded,
    false,
  );
  assert.equal(summarizeManualAssessment(score(3)).recorded, false);
});

test('declared evidence checks do not masquerade as a semantic language judge', () => {
  const p = packet(cases[1]);
  p.draft.description = 'An unsupported factual sentence not declared in the claims table.';
  const result = checkEvaluationReview(cases[1], p);
  assert.equal(result.automatedPassed, true);
  assert.equal(result.semanticAssessment, 'manual_required');
  // A human rubric must catch this omitted claim; automation intentionally does not certify truth.
});

test('source register is dated official guidance and private evaluation artifacts are ignored', async () => {
  const register = JSON.parse(
    await fs.readFile(new URL('../evals/source-register.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(
    register.map((s) => s.id),
    ['etsy_titles', 'etsy_search', 'etsy_stats'],
  );
  for (const source of register) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(['www.etsy.com', 'help.etsy.com'].includes(url.hostname));
    assert.match(source.checkedOn, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(!Number.isNaN(Date.parse(source.checkedOn)));
    assert.ok(source.recheck.includes('Before release'));
  }
  assert.equal(
    execFileSync('git', ['check-ignore', '--no-index', 'evaluation.review.private.json'], {
      encoding: 'utf8',
    }).trim(),
    'evaluation.review.private.json',
  );
});
