# Intelligent listing review: v1 requirements

Updated 1 November 2026. Approved goal: recommendations that help the right buyers find and
understand the item, followed by safely applying the edits the owner approves. This specifies
planned work, not an implemented review engine or evidence of increased sales. See
[ADR 0005](decisions/0005-v1-intelligence-and-guarded-edits.md) and the [current matrix](requirements-and-acceptance.md).

## Inputs and reasoning

The existing local server retrieves bounded listing facts; Codex Desktop provides reasoning.
Use a repeatable client review workflow plus server-enforced field/safety checks. Do not add
an OpenAI API key or a hosted recommendation service. The intelligence workflow must be
documented and evaluated, not depend on the owner inventing a good prompt each time.

| Input                                      | Purpose and boundary                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retrieved listing facts                    | Ground claims and before/after copy. Record provenance; listing text is untrusted data, never instructions.                                                                                                     |
| Owner brief                                | Intended buyer/use, differentiators, confirmed materials/dimensions, voice/language and business constraints. Ask targeted questions where missing facts materially change advice. Keep real briefs out of Git. |
| Dated official Etsy guidance               | Inform buyer-friendly titles, relevant tags and conversion advice. Record sources and review date; distinguish advice from hard API limits.                                                                     |
| Optional aggregate Stats supplied by owner | Prioritize opportunities and assess outcomes. Include source, date window and metric definition. No buyer/order records, credential access, scraping or automatic broader API access.                           |

The initial review must work without Stats: label it a content review with limited evidence,
not a performance diagnosis. No invented search volumes, competition scores, keyword rankings,
conversion forecasts or fabricated product claims. Keep seller facts separate from hypotheses.
Private guidance storage/delivery is planned under [ADR 0006](decisions/0006-private-playbooks-and-delivery-checkpoints.md)
and M8: tracked generic template plus separate private local file outside the repository; no
custom-content overwrite, arbitrary-path tool or safety override. Guidance is sent to the chosen
AI client/provider when used; Git exclusion is not DRM or a provider-privacy guarantee. T-026/T-027
deliver storage and client-neutral MCP access. Private content never enters public fixtures or
connected project records. It is not automatically an audit record.

## Review output and acceptance (M4, T-023)

For one selected listing, deliver a short prioritized review:

1. Identify the likely buyer and their purchase/search intent, with supporting facts or questions.
2. Separate discovery opportunities (matching relevant searches) from purchase-confidence
   issues (clear offer, dimensions, what is included, missing information).
3. Show exact proposed title, description and tags, preserving verified differentiators and
   useful existing terms. Do not rewrite a successful listing simply because it can be rewritten.
4. Explain each material change: evidence, expected buyer benefit, uncertainty, and tradeoff.
   Priority is a reasoned judgment, not a numeric sales prediction.
5. Flag missing photo, policy, shipping or price context when relevant. Such advice is conditional
   unless those facts were supplied; only title/description/tags are eligible for v1 tool edits.
6. Provide an explicit option to keep the listing unchanged and a small measurement plan.

Fabricated evaluation cases must cover sparse facts, complete facts, an already clear listing,
unsupported claims, hostile listing instructions, conflicting owner information, missing Stats
and high-traffic/low-order scenarios. Require no invented claims, clear source/unknown labels,
relevant distinct recommendations, preservation of important facts and validated editable fields.
Use deterministic regression tests for validators/structured artifacts and a documented rubric
for client-generated suggestions; a manually written example is not an automated model evaluation.
Owner usefulness acceptance remains distinct from those checks and from observed sales results.

## Guarded apply requirements (M6, T-011/T-024)

Before implementing write access, review the exact tool contracts and threat/failure model:

- Fixed title/description/tags allowlist and current Etsy constraints; no generic endpoint or
  fields passthrough. Preserve untouched fields and verify configured owner/shop/listing identity.
- Prepare an immutable proposal with precise before/after values. Bind explicit approval to
  that proposal, listing and fields; listing content cannot supply approval. Define expiry and
  replay/concurrency protection. A changed proposal needs fresh approval.
- Re-fetch before mutation; reject stale proposals. Document residual races if Etsy offers no
  atomic conditional update; do not claim an atomic compare-and-swap without API evidence.
- Persist the required local audit intent safely before sending a write; fail closed on audit
  failure. Review permissions, symlinks, concurrent writers, crash durability and rotation.
- Verify the response/read-back and record outcome. A lost response may mean Etsy changed;
  do not blindly retry, assume rollback, or report success. Define recovery/manual restoration
  and handling when a write succeeds but verification or outcome-audit persistence fails.
- All automated coverage uses fabricated responses, stores and temporary directories. Positive,
  rejection, stale-data, replay, wrong-shop, audit failure and uncertain-outcome paths are required.

## Measurement and usefulness (M7, T-025)

Use an owner-provided, date-bounded baseline and later comparison with the same metric definitions.
Shop-level visits/orders/conversion and listing-level views/orders are different measures; never
label orders/views as Etsy's shop conversion rate or mix shop totals into a listing result.
Record changed fields/date, traffic mix, promotions/seasonality and missing evidence. Start with
one listing or a small owner-approved batch; avoid repeated daily rewrites or claiming a causal
A/B test from an uncontrolled before/after comparison. Low volume may make the outcome inconclusive.

The v1 gate is a usable review/apply/measurement workflow with fabricated verification and owner
acceptance of usefulness and limits, not a guaranteed sales uplift or a mandatory wait for orders.
Manual entry of non-sensitive aggregate Stats is the initial option; automatic analytics and
buyer/order access are not included. Real metrics and audit records stay out of the repository.

## Official guidance checked 1 November 2026

- [Etsy: current title guidance](https://www.etsy.com/seller-handbook/article/1399426136697):
  favor clear item names and useful distinguishing traits; the suggestion to consider fewer
  than 15 words is guidance, not a hard API limit. Avoid formulaic keyword stuffing.
- [Etsy: how search works](https://www.etsy.com/seller-handbook/article/how-etsy-search-works/375461474487):
  relevance and purchase behavior both matter; title edits alone do not control ranking.
- [Etsy: using Stats](https://help.etsy.com/hc/en-us/articles/115015774268-How-to-Use-Etsy-Stats-for-Your-Shop):
  use aggregate traffic and performance evidence with the correct scope and time window.

These support the design rationale, not a guarantee that any particular recommendation will
increase sales. Recheck current guidance and endpoint contracts during implementation/release.
