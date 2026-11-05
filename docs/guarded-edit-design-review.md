# Guarded listing edit design and security review

Updated 5 November 2026. Phase 3A / T-011 technical design baseline, completed and merged.
This review records the design before implementation. The later T-030 implementation merged in
PR #39 as `dd77876d52c0a93db48bf95d61d0ca25f248f817` after offline verification and all five CI
checks passed. The opt-in unpublished development alpha now contains guarded apply; published
alpha.1 remains read-only. No live grant or listing change was performed, and owner acceptance
remains T-031.

## Decision and gate

The technical design below is the baseline for later offline implementation planning. The
future write path must remain closed until all of these are true:

1. The client check confirms that Codex presents a real, explicit human confirmation
   bound to the exact proposal. Unsupported or ambiguous client behavior fails closed.
2. Phase 4A–4C offline design, tests, and reviews pass, and any actual credential, scope,
   live-write, or publication step receives its own concrete authorization.

No Etsy account, developer portal, credential, shop, listing, or live endpoint was accessed
for this review.

## Current Etsy contract

The current Open API reference documents `updateListing` as `PATCH
/v3/application/shops/{shop_id}/listings/{listing_id}`. It requires OAuth `listings_w`
and an API key. Its form body is much broader than this product: it includes fields such
as `state`, which can activate and publish a draft. The future adapter must construct its
own body from an explicit three-field allowlist (`title`, `description`, `tags`); it must
never forward caller objects or send `state`, even when unchanged.

`getListing` returns listing, shop, and owner IDs, the editable text fields, and
`last_modified_timestamp`. The published endpoint contract does not document an ETag,
`If-Match`, conditional update, or idempotency key. A fresh read and timestamp check can
detect many stale proposals, but cannot prevent a change in the interval before Etsy
processes the PATCH. This residual time-of-check/time-of-use race must be disclosed; do
not claim atomic compare-and-swap.

Etsy documents `listings_w` as the scope for creating and editing listings. Scope changes
require another authorization-code grant and owner consent. A future write grant may add
only `listings_w` to the existing `listings_r` need. The server must fail closed unless
the configured owner/shop identity and required grant are verified. No scope upgrade,
refresh, reset, or reauthorization is part of this design work.

The update endpoint specifies title and tag character repertoires, but not every limit
used by the local preflight. Keep the existing stricter 140-code-point title, 13-tag,
20-code-point-per-tag, and description-byte policies unless a later source-backed review
changes them. Validation is a local guard, not proof Etsy will accept a request. Encode
tags using the endpoint's documented form representation; test commas, Unicode, empty
values, and order without rewriting approved copy.

## Tool and state contracts

These are proposed future contracts, not registered tools:

### `prepare_listing_edit`

- Accept only `listingId` and a strict `changes` object containing at least one of
  `title`, `description`, or `tags`. Reject additional keys and malformed values.
- Take no shop ID, owner ID, endpoint, arbitrary fields, approval flag, audit path, or
  credential from the caller. Resolve identity from the configured connection.
- Re-read the selected listing and verify its owner/shop/listing IDs. Capture the exact
  current values and modification timestamp for the allowlisted fields.
- Create an immutable proposal bound to schema version, configured owner/shop/listing,
  exact before/after values, and the captured timestamp. Return a cryptographically random
  one-use proposal ID and the exact human-readable diff. Keep proposal state in process
  memory only; expire it after five minutes and invalidate it on restart. Never log or
  persist proposal copy.

### `apply_listing_edit`

- Accept only the proposal ID. Recompute/verify the stored proposal digest and expiry; do
  not accept replacement fields or an `approved: true` argument.
- Ask the connected client to present the exact listing identity and before/after values
  for explicit human confirmation using MCP form elicitation. Proceed only when the client
  reports `action: accept` and the required confirmation value is true. Decline, cancel,
  missing capability, timeout, malformed response, or uncertainty means no write. There
  is no tool-call-only or AI-instruction fallback. Verify this behavior in Codex before
  relying on it.
- Consume the proposal atomically before sending a write so concurrent/replayed calls
  cannot reuse it. It is intentionally not durable across restart. A changed proposal
  requires a new prepare and new human confirmation.

The proposal response itself is untrusted text when passed through an AI client. Listing
text remains data, never instructions. The server—not the client or model—owns the
proposal values, digest, identity checks, approval result, and permission decision.

## Apply sequence and concurrency

After a human accepts the exact proposal, the server must:

1. Acquire the single-writer lock for the configured audit root. Reject a second concurrent
   apply, including one from another local process.
2. Reconfirm the configured owner/shop identity and write-scope grant. Fetch the listing
   again and compare IDs, `last_modified_timestamp`, and every allowlisted before-value
   with the proposal. Reject any mismatch as stale; require a new proposal and approval.
3. Run local field validation again. Build a fixed form request containing only changed
   allowlisted values. Preserve untouched fields by omitting them. No generic Etsy
   transport, arbitrary API call, publish/state update, retry loop, or batch apply exists.
4. Append and durably flush an audit intent before contacting Etsy. If this fails, do not
   send the PATCH.
5. Send one PATCH. Never automatically retry a write, including on timeout, rate limit,
   transport error, or lost response. Treat the result as uncertain until reconciled.
6. On a success response, perform a bounded fresh read and verify owner/shop/listing IDs
   plus exact after-values. Record the outcome. A mismatch or failed read is not success.
7. If the response is lost, perform at most a safe read to reconcile. Exact after-state
   means “applied, response lost”; exact before-state still does not trigger an automatic
   retry; any other state or failed read is “uncertain; manual review required.” Never
   claim rollback. A later attempt requires a new proposal after the operator resolves
   the actual state.

The pre-write re-read does not close Etsy's unprovided atomic-conditional-update gap.
Another actor can still edit after the check and before the PATCH. Record this as a
residual risk and make the single-writer limit explicit: it controls this application,
not Etsy Shop Manager or other clients.

## Audit contract

Use only the already approved ignored local JSONL location beneath the operator's Drive
sync root at `github/etsySellerAssistant/auditTrail`; store the machine-specific absolute
path only in ignored local settings. Do not place it in source, examples, docs, GitHub,
logs, or connected project records. Drive sync is backup, not tamper-proof storage or a
transactional guarantee.

Before a write, append one intent record with UTC time, local profile/actor label, proposal
ID/digest, configured IDs, listing ID, changed field names, exact before/after values, and
`pending` outcome. After the request, append a separate outcome record with verified,
reconciled, rejected, or uncertain status and a sanitized error category. Never record
tokens, app secrets, OAuth data, prompts, buyer data, private playbook content, or raw
Etsy error bodies. Listing copy is seller content; it belongs only in this separately
configured local audit store under its private permissions.

Use one writer; reject symlinks and non-regular files; create files mode `0600` in the
approved mode-`0700` directory; append with no-follow semantics; flush the intent before
the network request; and rotate monthly without overwriting prior records. If outcome
append or flush fails after Etsy may have acted, report that the result may have changed
and that audit completion failed. Do not hide a successful or uncertain Etsy result.
Temporary-directory tests must cover permissions, links, concurrency, crashes, rotation,
pre-write failure, post-write failure, and recovery before any live write path exists.

## Review disposition and remaining evidence

| Area                      | Design disposition                                                                          | Evidence still required                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| API fields and scope      | Fixed title/description/tags adapter; `listings_w` plus existing `listings_r` only          | Exact current API/spec review again before phase 4 and exact owner-approved scope transition   |
| Human approval            | Exact immutable proposal plus host-mediated explicit confirmation; no fallback              | Codex UI/client capability verification and fabricated accept/decline/cancel/unsupported tests |
| Staleness and concurrency | Fresh identity/field/timestamp check, proposal expiry/one-use, process-wide audit lock      | Fabricated race/replay tests; disclose external Shop Manager race                              |
| Audit                     | Local append-only intent/outcome records, fixed approved location, fail closed before PATCH | T-029 temporary-directory durability and failure-path tests                                    |
| Uncertain outcome         | One write attempt; safe read reconciliation; no blind retry                                 | T-030 offline transport and reconciliation tests                                               |

## T-030 implementation addendum — confirmation and authorization boundaries

Updated 5 November 2026 for the implementation plan. T-032's owner-accepted Mac check established
that the readable confirmation should appear automatically in `prepare_listing_edit` and use the
host's single Accept/Deny choice. Therefore acceptance records a one-use approval for the exact
in-memory proposal; a later explicit `apply_listing_edit` call consumes it. Applying does not open a
second confirmation form. This preserves the human approval step while avoiding the confusing
double-confirmation flow. Neither tool call alone can construct or alter the approved fields.

The opt-in alpha obtains write credentials only from a separate explicit local `enable-edits`
authorization profile with exactly `listings_r` and `listings_w`; the existing read-only token pair
and refresh state remain separate. The `disable-edits` command removes only the edit grant and its
refresh state after local server processes are stopped. The apply tool requires the configured
local audit folder and fails closed when the grant is absent. The default server remains status-only.
No authorization flow, credential change, live Etsy request, or listing update is run as part of
offline implementation or CI.

The addendum changes the timing of the already-required human confirmation to match the verified
T-032 interaction; it does not change the immutable proposal, one-use, field allowlist, identity,
stale-check, audit-before-write, no-retry, or reconciliation requirements above.

### Sources checked 3 November 2026

- [Etsy `updateListing` API reference](https://developers.etsy.com/documentation/reference/#operation/updateListing)
- [Etsy `getListing` API reference](https://developers.etsy.com/documentation/reference/#operation/getListing)
- [Etsy OAuth 2.0 and scopes](https://developers.etsy.com/documentation/essentials/oauth2/)
- [MCP form elicitation specification](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)
