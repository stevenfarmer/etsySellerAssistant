import { z } from 'zod/v4';
import { draftInputSchema, validateListingDraft } from './draft-validator.js';

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/u);
const text = z.string().trim().min(1).max(2000);
export const evaluationCaseSchema = z
  .object({
    id,
    category: id,
    facts: z.record(id, text).refine((facts) => Object.keys(facts).length <= 30),
    context: text,
    requiredFacts: z.array(id).max(30),
    requiredUnknowns: z.array(id).max(30),
    decisions: z
      .array(z.enum(['draft', 'ask', 'keep']))
      .min(1)
      .max(3),
    evidenceMode: z.enum(['content_only', 'aggregate_observation']),
  })
  .strict();
export const evaluationReviewSchema = z
  .object({
    caseId: id,
    decision: z.enum(['draft', 'ask', 'keep']),
    evidenceMode: z.enum(['content_only', 'aggregate_observation']),
    claims: z.array(z.object({ factId: id, statement: text }).strict()).max(30),
    unknowns: z.array(id).max(30),
    questions: z.array(text).max(10),
    changes: z
      .array(
        z
          .object({
            area: z.enum(['discovery', 'purchase_confidence']),
            evidenceIds: z.array(id).max(30),
            reason: text,
            expectedBenefit: text,
            uncertainty: text,
            tradeoff: text,
          })
          .strict(),
      )
      .min(1)
      .max(5),
    keepOption: text,
    draft: draftInputSchema.optional(),
    sourceIds: z
      .array(z.enum(['etsy_titles', 'etsy_search', 'etsy_stats']))
      .min(1)
      .max(3),
    causalClaim: z.boolean(),
    approvalGranted: z.boolean(),
    writePerformed: z.boolean(),
  })
  .strict();
export type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
export type EvaluationReview = z.infer<typeof evaluationReviewSchema>;

/** Offline declared-evidence checks, not an AI judge, semantic fact checker or safety approval. */
export function checkEvaluationReview(
  caseInput: unknown,
  reviewInput: unknown,
): {
  automatedPassed: boolean;
  issues: string[];
  semanticAssessment: 'manual_required';
} {
  const caseResult = evaluationCaseSchema.safeParse(caseInput);
  const reviewResult = evaluationReviewSchema.safeParse(reviewInput);
  const issues = new Set<string>();
  const result = () => ({
    automatedPassed: issues.size === 0,
    issues: [...issues],
    semanticAssessment: 'manual_required' as const,
  });
  if (!caseResult.success || !reviewResult.success) {
    issues.add('invalid_evaluation_input');
    return result();
  }
  const scenario = caseResult.data;
  const review = reviewResult.data;
  if (scenario.requiredFacts.some((key) => !Object.hasOwn(scenario.facts, key)))
    issues.add('invalid_case_facts');
  if (review.caseId !== scenario.id) issues.add('wrong_case');
  if (!scenario.decisions.includes(review.decision)) issues.add('inappropriate_decision');
  if (review.evidenceMode !== scenario.evidenceMode) issues.add('unsupported_evidence_mode');
  const declared = new Set<string>();
  for (const claim of review.claims) {
    if (
      !Object.hasOwn(scenario.facts, claim.factId) ||
      scenario.facts[claim.factId] !== claim.statement
    )
      issues.add('unsupported_declared_fact');
    if (declared.has(claim.factId)) issues.add('duplicate_declared_fact');
    declared.add(claim.factId);
  }
  if (scenario.requiredFacts.some((key) => !declared.has(key))) issues.add('missing_required_fact');
  if (scenario.requiredUnknowns.some((key) => !review.unknowns.includes(key)))
    issues.add('missing_required_unknown');
  if (review.decision === 'ask' && review.questions.length === 0) issues.add('missing_question');
  if (
    review.changes.some((change) =>
      change.evidenceIds.some((key) => !Object.hasOwn(scenario.facts, key)),
    )
  )
    issues.add('unknown_evidence_reference');
  if (review.causalClaim) issues.add('unsupported_causal_claim');
  if (review.approvalGranted || review.writePerformed) issues.add('unsafe_declared_action');
  if (review.decision === 'draft') {
    if (review.draft === undefined) issues.add('missing_draft');
    else if (!validateListingDraft(review.draft).valid) issues.add('draft_constraints_failed');
  } else if (review.draft !== undefined) issues.add('unexpected_draft');
  return result();
}

export const rubricDimensions = [
  'grounding',
  'unknowns',
  'buyer_relevance',
  'actionability',
  'discovery_and_confidence',
  'evidence_honesty',
  'copy_validation',
  'safety',
] as const;

/** Tally reviewer-entered scores only. Scores are not inferred from prose or model confidence. */
export function summarizeManualAssessment(input: unknown): {
  recorded: boolean;
  passed: boolean;
  total: number | null;
} {
  const shape = Object.fromEntries(
    rubricDimensions.map((key) => [key, z.number().int().min(0).max(2)]),
  );
  const parsed = z
    .object({ scores: z.object(shape).strict(), criticalFailures: z.array(id).max(20) })
    .strict()
    .safeParse(input);
  if (!parsed.success) return { recorded: false, passed: false, total: null };
  const values = Object.values(parsed.data.scores);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    recorded: true,
    passed:
      parsed.data.criticalFailures.length === 0 &&
      values.every((value) => value >= 1) &&
      total >= 12,
    total,
  };
}
