# ADR 0005: intelligent review and guarded listing edits in v1

- Status: Product scope accepted by owner; detailed implementation/security design pending review
- Date: 2026-11-01
- Supersedes: read-only-only v1 sequencing in ADR 0004 and the prior publication recommendation
- Retains: ADR 0004 macOS/Codex Desktop platform scope and existing access/security gates

## Decision

The owner explicitly expects editing in v1 and recommendations designed to help Etsy sales.
The read-only foundation is useful delivered work, but is insufficient for stable v1. Do not
publish the current read-only build as v1. The package's existing unpublished `1.0.0` literal
does not establish completion; choose the next candidate version when preparing that artifact.
Published `v0.1.0-alpha.1` and its tag remain unchanged.

v1 combines listing facts, an owner-supplied buyer/product brief, dated official Etsy guidance,
and optional owner-supplied aggregate performance evidence. The connected MCP client does the
reasoning; Codex Desktop is the current v1 acceptance client. The local MCP server supplies bounded
data and enforces deterministic safety/validation rules. Broader client acceptance remains tracked
separately and this clarification does not expand v1's platform scope.
No hosted AI service or OpenAI API account is added. Recommendations explain their evidence,
buyer benefit, uncertainty and measurement plan, rather than promising rankings or sales.

## Owner follow-up — measurement scope, 5 November 2026

The owner moved T-025's success-measurement design to the backlog. The store's handmade items are
unique, so a repeat-item sales comparison is not a suitable default. No metric or comparison method
is selected yet, and M7 is not a current v1 release gate. Revisit measurement after discussing an
approach that fits the products. T-031's scoped private-guidance and Mac workflow acceptance does
not depend on T-025.

Guarded edits initially cover title, description and tags only. The required workflow is exact
before/after preview, explicit approval for the selected listing and values, stale-data checks,
audit before mutation, narrowly scoped apply, and verification with clear uncertain outcomes.
Existing steering audit requirements remain: ignored local JSONL beneath the configured Drive
sync root at `github/etsySellerAssistant/auditTrail`, single writer and monthly rotation.
Sync is backup, not tamper-proof storage. No blind write retries or automatic shop-wide edits.

## Authorization and review boundary

This is approval of the product requirement and planning work. Detailed OAuth/write-tool,
approval binding, concurrency, audit durability, failure and recovery design must be reviewed
before write-access implementation. The guarded-edit design baseline is recorded in
[the 3A review](../guarded-edit-design-review.md). Live Etsy reads/writes, credential reads,
scope upgrades, reset, reauthorization and release
publication still need concrete authorization. Do not disturb the healthy connection.

No price, inventory, images, variations, shipping, publishing, creation/deletion, orders or
buyer-data tools are added by this decision. Broader analytics API access also needs a separate
requirement/data-availability review. Recommendations may flag missing evidence; they must not
pretend to inspect unavailable photos, policies, search volumes or competitor performance.

## Delivery and acceptance

The [current matrix](../requirements-and-acceptance.md) maps the expanded M4 and new M6/M7
criteria to tasks. T-011 covers detailed guarded-write design/security review; T-023 covers
intelligent review and fabricated evaluations; T-024 covers guarded-edit implementation after
review. T-025's measurement design is in the backlog and is not a current v1 release gate; T-031
tracks scoped owner review of private-guidance usefulness and Mac workflow acceptance. T-012
remains open for the completed product's final acceptance and separately authorized publication.

The [review requirements](../intelligent-listing-review.md) define recommendation quality.
Passing format/unit tests alone cannot establish AI usefulness or sales improvement. Retain
accepted read/setup/recovery evidence and disclose its actual limits; do not reopen it merely
because editing moved into v1.
