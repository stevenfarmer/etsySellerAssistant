import { Buffer } from 'node:buffer';
import { z } from 'zod/v4';

/** Envelope bounds protect the local tool; copy rules below report within-envelope errors. */
export const draftInputSchema = z
  .object({
    title: z.string().max(560),
    description: z.string().max(32_768),
    tags: z.array(z.string().max(80)).max(26),
  })
  .strict();
export type ListingDraft = z.infer<typeof draftInputSchema>;
export const MAX_DESCRIPTION_BYTES = 16_384; // Application preflight bound, not an Etsy limit.
export const DRAFT_RULES_VERSION = '2026-11-01';

const codes = [
  'empty_text',
  'title_length',
  'title_characters',
  'title_repeated_symbol',
  'description_byte_limit',
  'description_controls',
  'description_unicode',
  'tag_count',
  'tag_length',
  'tag_characters',
  'tag_initial_punctuation',
  'duplicate_tag',
  'unused_tag_slots',
  'title_word_count',
  'outer_whitespace',
  'non_nfc',
] as const;
const issueSchema = z
  .object({
    field: z.enum(['title', 'description', 'tags']),
    code: z.enum(codes),
    severity: z.enum(['error', 'warning']),
    tagIndex: z.number().int().min(0).max(25).optional(),
  })
  .strict();
export const draftResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    rulesVersion: z.literal(DRAFT_RULES_VERSION),
    scope: z.literal('copy_constraints_only'),
    valid: z.boolean(),
    grounding: z.literal('not_evaluated'),
    approvalGranted: z.literal(false),
    writePerformed: z.literal(false),
    counts: z
      .object({
        titleCharacters: z.number().int().min(0),
        descriptionBytes: z.number().int().min(0),
        tags: z.number().int().min(0),
      })
      .strict(),
    issues: z.array(issueSchema).max(200),
  })
  .strict();
export type DraftCheck = z.infer<typeof draftResultSchema>;

export class DraftValidationError extends Error {
  readonly code = 'invalid_input';
  constructor() {
    super('Draft input does not match the bounded title, description and tags contract.');
    this.name = 'DraftValidationError';
  }
}

/** Deterministic copy preflight only: no filesystem, credentials, transport, model or approval. */
export function validateListingDraft(input: unknown): DraftCheck {
  const parsed = draftInputSchema.safeParse(input);
  if (!parsed.success) throw new DraftValidationError();
  const draft = parsed.data;
  const issues: DraftCheck['issues'] = [];
  const add = (
    field: 'title' | 'description' | 'tags',
    code: (typeof codes)[number],
    severity: 'error' | 'warning' = 'error',
    tagIndex?: number,
  ) => {
    issues.push({ field, code, severity, ...(tagIndex === undefined ? {} : { tagIndex }) });
  };
  const checkText = (field: 'title' | 'description' | 'tags', text: string, tagIndex?: number) => {
    if (text.trim().length === 0) add(field, 'empty_text', 'error', tagIndex);
    if (text !== text.trim()) add(field, 'outer_whitespace', 'warning', tagIndex);
    if (text !== text.normalize('NFC')) add(field, 'non_nfc', 'warning', tagIndex);
  };
  checkText('title', draft.title);
  checkText('description', draft.description);
  const titleCharacters = Array.from(draft.title).length;
  const descriptionBytes = Buffer.byteLength(draft.description, 'utf8');
  if (titleCharacters > 140) add('title', 'title_length');
  // Current Etsy updateListing character rules; do not silently normalize or rewrite copy.
  if (/[^\p{L}\p{Nd}\p{P}\p{Sm}\p{Zs}™©®]/u.test(draft.title)) add('title', 'title_characters');
  if (['%', ':', '&', '+'].some((symbol) => draft.title.split(symbol).length > 2))
    add('title', 'title_repeated_symbol');
  if (draft.title.trim().split(/\s+/u).filter(Boolean).length >= 15)
    add('title', 'title_word_count', 'warning');
  if (descriptionBytes > MAX_DESCRIPTION_BYTES) add('description', 'description_byte_limit');
  if (
    Array.from(draft.description).some((c) => {
      const code = c.codePointAt(0)!;
      return code === 127 || (code < 32 && code !== 9 && code !== 10 && code !== 13);
    })
  )
    add('description', 'description_controls');
  if (
    Array.from(draft.description).some((c) => {
      const code = c.codePointAt(0)!;
      return code >= 0xd800 && code <= 0xdfff;
    })
  )
    add('description', 'description_unicode');
  if (draft.tags.length > 13) add('tags', 'tag_count');
  if (draft.tags.length < 13) add('tags', 'unused_tag_slots', 'warning');
  const seen = new Set<string>();
  draft.tags.forEach((tag, index) => {
    checkText('tags', tag, index);
    if (Array.from(tag).length > 20) add('tags', 'tag_length', 'error', index);
    if (/[^\p{L}\p{Nd}\p{Zs}\-'™©®]/u.test(tag)) add('tags', 'tag_characters', 'error', index);
    if (/^['-]/u.test(tag.trim())) add('tags', 'tag_initial_punctuation', 'error', index);
    const key = tag.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
    if (seen.has(key)) add('tags', 'duplicate_tag', 'warning', index);
    seen.add(key);
  });
  return {
    schemaVersion: 1,
    rulesVersion: DRAFT_RULES_VERSION,
    scope: 'copy_constraints_only',
    valid: !issues.some((issue) => issue.severity === 'error'),
    grounding: 'not_evaluated',
    approvalGranted: false,
    writePerformed: false,
    counts: { titleCharacters, descriptionBytes, tags: draft.tags.length },
    issues,
  };
}
