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
and optional owner-supplied aggregate performance evidence. Codex Desktop does the reasoning;
the local MCP server supplies bounded data and enforces deterministic safety/validation rules.
No hosted AI service or OpenAI API account is added. Recommendations explain their evidence,
buyer benefit, uncertainty and measurement plan, rather than promising rankings or sales.

Guarded edits initially cover title, description and tags only. The required workflow is exact
before/after preview, explicit approval for the selected listing and values, stale-data checks,
audit before mutation, narrowly scoped apply, and verification with clear uncertain outcomes.
Existing steering audit requirements remain: ignored local JSONL beneath the configured Drive
sync root at `github/etsySellerAssistant/auditTrail`, single writer and monthly rotation.
Sync is backup, not tamper-proof storage. No blind write retries or automatic shop-wide edits.

## Authorization and review boundary

This is approval of the product requirement and planning work. Detailed OAuth/write-tool,
approval binding, concurrency, audit durability, failure and recovery design must be reviewed
before write-access implementation. Recheck current Etsy API constraints, permitted use and
terms for these capabilities; the earlier read-only risk acceptance does not cover them.
Live Etsy reads/writes, credential reads, scope upgrades, reset, reauthorization and release
publication still need concrete authorization. Do not disturb the healthy connection.

No price, inventory, images, variations, shipping, publishing, creation/deletion, orders or
buyer-data tools are added by this decision. Broader analytics API access also needs a separate
requirement/data-availability review. Recommendations may flag missing evidence; they must not
pretend to inspect unavailable photos, policies, search volumes or competitor performance.

## Delivery and acceptance

The [current matrix](../requirements-and-acceptance.md) maps the expanded M4 and new M6/M7
criteria to tasks. T-011 covers detailed guarded-write design/security review; T-023 covers
intelligent review and fabricated evaluations; T-024 covers guarded-edit implementation after
review; T-025 covers bounded measurement and owner usefulness acceptance. T-012 remains open
for the completed product's final acceptance and separately authorized publication.

The [review requirements](../intelligent-listing-review.md) define recommendation quality.
Passing format/unit tests alone cannot establish AI usefulness or sales improvement. Retain
accepted read/setup/recovery evidence and disclose its actual limits; do not reopen it merely
because editing moved into v1.
