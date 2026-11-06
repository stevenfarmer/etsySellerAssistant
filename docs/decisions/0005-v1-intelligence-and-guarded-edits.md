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

v1 supports two core listing workflows: draft a complete proposed listing from owner-provided
product photos and confirmed facts, and review one or more existing listings with separate
recommendations for each. When asked, it also provides current, sourced decision support for
comparable-product pricing, seasonal sales planning and marketing ideas, including suitable video
and timely-theme ideas. Pricing comparisons should cover relevant Etsy, eBay and other legitimate
online sellers, explain why examples are comparable, and state the source date and uncertainty.
These are recommendations for the owner to decide on; they do not guarantee sales or rankings.

The connected MCP client does the reasoning and image interpretation; the owner provides the
photos to that client. The local MCP server supplies bounded Etsy data and enforces deterministic
safety/validation rules. Codex Desktop remains the current v1 acceptance client. Broader client
acceptance remains tracked separately and this clarification does not expand v1's platform scope.
No hosted AI service or OpenAI API account is added. “Manage nearly all aspects of listings and
pricing” is longer-term product vision, not a v1 commitment to automatic changes or expanded write
permissions.

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

No price, inventory, images, variations, shipping, listing creation/deletion, orders or buyer-data
write tools are added by this decision. The client may interpret photos that the owner supplies in
the conversation; it must ask the owner to confirm details that cannot be reliably seen. Market
research is on request and must cite current comparable sources; it must not imply access to private
sales data, search volumes or competitor performance metrics. Broader analytics API access needs a
separate requirement/data-availability review.

## Delivery and acceptance

The [current matrix](../requirements-and-acceptance.md) maps M4 and M6/M7 plus the new photo-draft
and on-request research requirements to tasks. T-011 covers detailed guarded-write design/security
review; T-023 covers the delivered intelligent-review workflow and fabricated evaluations; T-024
covers guarded-edit implementation after review. T-037 tracks photo-based listing drafts and T-038
tracks requested pricing/marketing research. T-025's measurement design is in the backlog and is
not a current v1 release gate; T-031
tracks scoped owner review of private-guidance usefulness and Mac workflow acceptance; that
acceptance is complete. T-012 remains open for final product acceptance and separately authorized
publication.

The [review requirements](../intelligent-listing-review.md) define recommendation quality.
Passing format/unit tests alone cannot establish AI usefulness or sales improvement. Retain
accepted read/setup/recovery evidence and disclose its actual limits; do not reopen it merely
because editing moved into v1.
