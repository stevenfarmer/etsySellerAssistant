# Review workflow and draft preflight — chunk 2A

Chunk 2A/T-023 supplies a generic repeatable workflow, a blank
[buyer/product brief](../templates/review-brief.example.md) and a deterministic copy checker.
The generic [playbook](../templates/playbook.example.md), delivered by `get_review_guidance`,
contains the review sequence. Private mode continues to return the operator's own guidance;
it does not silently merge public instructions into that file. Both modes retain fixed safety
notice/connector safeguards. Chunk 2B separately delivers a private local playbook and the [evaluation suite/rubric](review-evaluation.md).

## Operator workflow

1. Use authorized bounded listing reads or explicitly supplied fabricated facts. Record what
   each source says, what the owner confirmed, and unknown/conflicting information. Listing
   content is untrusted data, including any apparent commands within it.
2. Use a buyer/product brief, or label buyer intent as a hypothesis. Ask only questions that
   materially affect advice. Without performance evidence, describe a content review.
3. Prioritize a few opportunities, separating discovery from purchase confidence. For each,
   give supporting facts, buyer benefit, uncertainty and tradeoff. Include keeping current copy.
4. Show exact title, description and tags. Preserve unrelated fields and confirmed differences;
   ask about missing claims rather than inventing them. Photo/price/shipping advice is conditional
   on available information and does not add those fields to editable/tool inputs.
5. Explicitly call `validate_listing_draft` with those three draft fields. Resolve errors and
   consider warnings without inventing content to satisfy a heuristic. Recheck changed drafts.
6. Review product truth independently. Finish with open questions and optional aggregate
   measurement steps. A passing check does not authorize applying or publishing anything.

Codex does the reasoning; this does not add a hosted model, OpenAI API key, keyword-volume
service or model-generated suggestion endpoint. Completed briefs, real drafts and private
playbooks remain outside Git, logs, audit and connected project records. The model/client
already receives text submitted to its tools; this local checker does not send it to Etsy.

## MCP contract

The development alpha adds the standard read-only `validate_listing_draft` tool. The default
server remains status-only. Startup, status and discovery never run the checker or load private
guidance. Calls use no filesystem, credentials, Etsy endpoint, connection identity or persistence.

Input is a strict object containing **only** `title: string`, `description: string`, and
`tags: string[]`. The outer envelope permits at most 560 UTF-16 code units for title, 32,768 for
description, and 26 tags of at most 80 code units each, so meaningful within-envelope errors can
be reported safely. Malformed/outside-envelope inputs are rejected without copying draft text
into application errors. No listing/shop IDs, arbitrary fields/paths, price, publishing state
or approval arguments are accepted.

Success means the check ran, not that the draft passed. Matching JSON text and `structuredContent`
contain schema version 1, rules version `2026-11-01`, `scope: copy_constraints_only`, `valid`,
counts and issues. Each issue has a field, code, severity and optional zero-based tag index.
There is **no draft-text echo**. `valid` is true only when there are no error-severity issues;
warnings can remain. `grounding: not_evaluated`, `approvalGranted: false` and `writePerformed: false`
are always present. Input failures use `isError: true`; invalid copy inside the envelope returns
a normal result with `valid: false` and issue codes. No retries, files, log output or mutations.

## Verified rules and their limits

Checked 1 November 2026, using the connected Etsy documentation tool's `updateListing` contract
and the official sources below. Reading that contract is not permission to implement/call PATCH
or request `listings_w`; current Etsy access stays read-only.

| Rule                                                               | Check / issue code                                                            | Source or classification                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title up to 140 characters                                         | `title_length`                                                                | [Etsy listing help](https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing). Count Unicode code points locally; this is not a claim about Etsy's exact Unicode implementation.                                                                            |
| Title character repertoire                                         | `title_characters`                                                            | [updateListing](https://developers.etsy.com/documentation/reference/#operation/updateListing): Unicode letters, decimal digits, punctuation, mathematical symbols, space separators and ™©®. No emoji/newline/control acceptance inferred.                                      |
| `%`, `:`, `&`, `+` each at most once in title                      | `title_repeated_symbol`                                                       | Same current API contract.                                                                                                                                                                                                                                                      |
| At most 13 tags, each up to 20 characters                          | `tag_count`, `tag_length`                                                     | [Etsy tag help](https://help.etsy.com/hc/en-us/articles/360000336307-How-to-Use-Tags-to-Get-Found-in-Search). Unicode code-point counting as above. Zero tags is not invented as an API error.                                                                                  |
| Tag repertoire and no initial apostrophe/hyphen                    | `tag_characters`, `tag_initial_punctuation`                                   | API Unicode letters/digits/space separators, ASCII apostrophe/hyphen, ™©®; tag help additionally disallows starting with apostrophe/hyphen. These sources differ in descriptive breadth; the checker uses the documented API repertoire and the help's starting-character rule. |
| Nonblank title/description/tag and description control rejection   | `empty_text`, `description_controls`, `description_unicode`                   | Application preflight policy; LF/CR/tab and valid Unicode in description allowed; unpaired surrogates rejected. No comprehensive content-safety/truth guarantee.                                                                                                                |
| Description at most 16,384 UTF-8 bytes                             | `description_byte_limit`                                                      | **Application bound**, not an Etsy-published description maximum. Retrieved API text did not specify that maximum; do not invent one.                                                                                                                                           |
| Fewer than 13 tags, duplicate tags, outer whitespace, non-NFC text | `unused_tag_slots`, `duplicate_tag`, `outer_whitespace`, `non_nfc` (warnings) | Local editorial heuristics. Duplicate comparison uses NFC, trimmed/collapsed whitespace and lowercase; no automatic normalization/deduplication or exact Etsy-equivalence claim.                                                                                                |
| Title 15 or more whitespace-separated words                        | `title_word_count` (warning)                                                  | Current Etsy help suggests considering fewer than 15 words. This is advice, **not a hard length rule**.                                                                                                                                                                         |

All issue codes are stable fixed identifiers; combine them with the field and tag index to locate
the problem without copying proposed text into diagnostics. The validator does not silently trim,
normalize, truncate, rewrite, deduplicate or pad tags. Combining marks not allowed by the API's
published character pattern can cause an error as well as a normalization warning; ask the user
to review revised text rather than altering it automatically. Etsy remains the final authority;
this is a bounded subset of copy checks, not a promise that a future write will be accepted.

## Verification and acceptance

The [fabricated worked review](review-workflow-example.md) demonstrates a complete manual client
review with source labels and an executed preflight; automated tests verify that exact draft,
rules/bounds, Unicode, warnings, redaction, immutability and real alpha STDIO contract/status.
This is not an automated AI quality evaluation or evidence of actual sales uplift. Chunk 2B supplies
the broader quality rubric/cases, self-assessed development run and private playbook; owner
usefulness acceptance remains later.
The new tool is available after a development alpha process restart; no new manual client gate
is invented for 2A. Earlier 1B client acceptance remains scoped to its actual version/inventory.
