# Next phase proposal: verified access and a read-only listing MVP

> **Delivery sequencing superseded on 1 November 2026:** Use the [v1 delivery plan](v1-delivery-plan.md) for current work. This document preserves the earlier proposal and its decisions.

> **Current delivery checkpoint — 1 November 2026:** Owner-authorized Mac OAuth, listing/detail reads, and restart/setup-status acceptance passed (T-009/T-010 Done). PR #8 recovery hardening is merged. The next candidate is unpublished `0.1.0-alpha.2`; see [readiness](v1-readiness.md) and [draft release notes](releases/v0.1.0-alpha.2.md). T-008 owner recovery acceptance and T-007 delegated authorization remain open. The plan below records the earlier implementation proposal; it does not reopen completed work or authorize live credential actions.

> **Scope superseded on 31 October 2026:** [ADR 0004](decisions/0004-v1-platform-scope.md) makes v1 macOS/Codex Desktop only. Earlier cross-platform requirements below are historical. Other local STDIO clients follow v1; Windows is deferred to v2 or later, and Linux is exploratory. Windows manual acceptance does not block v1. Existing code and CI coverage are retained.

- Status: Approved by product owner on 2026-10-31 for offline implementation and bounded delegation; live credential handling and live Etsy requests remain separately gated.
- Date: 2026-10-31.
- Covers: remaining T-007 verification, T-008 design, T-009 implementation, and T-010 desktop acceptance.
- Proposed outcome: the owner authorizes the local tool, Codex can review the configured shop's
  listings, and the installation can be repeated on Windows and macOS.

## Source of truth and current evidence

This plan follows the [steering document](https://docs.google.com/document/d/1BPuwHwicA7KntAv6nUj3BKSaMjFf5nfSr_QAET_NDPc/edit),
[project tracker](https://docs.google.com/spreadsheets/d/12FGXUgCwp_y9P7dX9vsctcRfEhTKnzfL_Ja78ezOv2A/edit),
[architecture](architecture.md), [ADR 0002](decisions/0002-etsy-access-and-write-boundary.md), and
[T-007 evidence](etsy-registration-verification.md). The limited sequencing refinement below is
recorded in the steering document, ADR, and tracker.

Verified so far:

- The owner registered a Seller App and the portal shows it approved.
- `http://localhost:3003/oauth/redirect` saves and persists after reopening the callback editor.
- The separate Shared Access account could reach Personal App registration but was rejected by the
  Seller App route. The owner account remains the proposed initial authorizer.
- Etsy's documentation MCP works. The duplicate direct `etsyDeveloperDocs` configuration was removed;
  the working **Etsy MCP Tool** plugin is the single retained documentation connection.
- Endpoint documentation supports `listings_r` for `getListingsByShop`. `getListing` and
  `getShopByOwnerUserId` list app-key authentication; owner-only optional features need further review.

The operator subsequently reported a successful owner-authorized Mac connection; the verifier
checks the callback, token exchange, exact granted scope, and configured-shop identity before
reporting success. The owner-authorized Mac listing and detail reads subsequently passed. Safe
refresh/revocation across all cases and delegated OAuth remain unverified. The default MCP server
remains status-only; the separate alpha entry point exposes read-only listing tools.

## Scope for this phase

Deliver owner authorization, protected local credentials, shop identity enforcement, active-listing
pagination, retrieval of an authorized listing, and review-friendly output. Codex supplies the
listing suggestions using its existing client; this phase adds no OpenAI API account or credentials.

The first connected release stays read-only. Writes, publishing, deletion, orders, receipts, buyer
data, payments, messages, and other private-shop workflows remain outside this implementation.
These are phase boundaries, not permanent exclusions from the long-term roadmap. Additional
features need concrete requirements and the necessary approvals and permissions when selected.
The product will not serve other sellers.

Keep the runtime local and launched over STDIO. The existing Etsy documentation plugin helps
development; the project's own local MCP process supplies the eventual shop-reading tools. Do not
add another duplicate documentation connection, a hosted callback bridge, telemetry, or a tunnel.

## Approved sequencing refinement

The current gate requires T-007 evidence before OAuth implementation, while the remaining T-007
evidence requires an OAuth round trip. Resolve that dependency explicitly:

> After review of the OAuth/security design, permit a bounded, offline-tested local verification
> harness to finish T-007. Owner consent and any live credential use remain explicit manual steps.
> The harness may exchange OAuth tokens and make only the agreed identity/listing reads. Production
> MCP shop-reading tools remain disabled until T-007 evidence and the T-008 design are accepted.

The product owner approved this limited sequencing refinement on 31 October 2026. The steering
document and ADR 0002 record it. Local development against fabricated/mocked data is authorized
after design review. The live test, credential provisioning, publication, and merge each retain
their existing authorization requirements.

## Delivery checkpoints

| Checkpoint                           | Work and deliverable                                                                                                                           | Evidence needed to advance                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1. Design and contracts              | T-008 OAuth sequence, threat review, credential-store decision, typed module contracts, field/scope allowlists, and bounded-verifier amendment | Product-owner approval of this proposal; maintained design/decision records; maintainer security review |
| 2. Offline connection implementation | Local setup/connection CLI, protected stores, PKCE/state callback handling, token lifecycle, and verifier with mocked tests                    | Passing auth/storage/security tests; local validation; reviewed dependency choices; no live credentials |
| 3. Controlled owner verification     | Owner-authorized manual round trip using the registered callback and agreed read scope                                                         | Sanitized callback, grant, scope, and intended-shop results; owner acceptance; T-007 closure evidence   |
| 4. Read-only MVP                     | T-009 identity checks, Etsy GET client, pagination, allowlisted listing output, and MCP tools                                                  | Gates above accepted; mocked integration/contract tests; no reachable Etsy mutation path                |
| 5. Desktop and handoff               | T-010 Codex smoke tests, platform setup/recovery documentation, reviewable changes                                                             | Windows/macOS CI, real platform credential-store evidence, owner read-only acceptance, final review     |

Checkpoint 1 also records the permitted-use risk for the disclosed AI-assisted/automated listing
workflow. On 31 October 2026 the product owner accepted that unresolved risk for now and chose not
to contact Etsy at this time; app registration approval is not treated as blanket approval of every
later use. The separate technical review and live-access authorization gates remain in place.

Work may be built against mocks in parallel after its design is approved. Live access and enabling
runtime tools follow the checkpoints. If the local redirect fails, keep shop access disabled and
bring the actual error and compliant options back for a decision.

## Concrete design to implement after approval

### Authorization and callback

- Request only `listings_r` for this phase, subject to owner acceptance. Do not copy broader
  tutorial scopes. Establish and validate the effective grant; reject missing required permissions
  or unexpected permissions rather than silently accepting a broader connection.
- Use Authorization Code with PKCE S256, cryptographically random single-use state, and the exact
  registered callback. Keep the verifier/state tied to one pending attempt in memory.
- Bind the short-lived receiver only to loopback on port 3003, handling localhost IPv4/IPv6 behavior
  on both platforms. Fail clearly if binding fails or the port is occupied. Never fall back to a
  public interface or a different unregistered callback.
- Validate method, host, path, state, duplicate parameters, callback size, replay, cancellation, and
  timeout before exchanging a code. Close the listener after success, cancellation, or timeout.
- Use HTTPS to Etsy endpoints. Redact callback queries, authorization URLs, codes, verifiers, tokens,
  headers, and API errors. The browser success page contains no credential material.
- Refresh according to returned expiry; serialize concurrent refreshes, safely persist replacement
  tokens, and handle storage/refresh failure without losing a valid stored connection silently.
  Do not blindly retry one-use code exchanges or failed refresh requests.

### Local setup and credentials

- Keep credential entry in a local setup CLI with hidden input, outside MCP/model arguments and
  shell history. Never reuse credential material from chat or screenshots.
- Protect app credentials and OAuth tokens using macOS Keychain and Windows Credential Manager.
  Select a maintained adapter only after reviewing its license, dependencies, Node 24/26 support,
  native build requirements, and supported architectures. Keep it behind a small `SecretStore`
  interface so tests can use an in-memory fabricated store.
- Recommend no plaintext fallback in this phase. An unavailable/locked OS store produces an
  actionable setup error. A file fallback would require a separate explicit decision.
- Store non-secret connection settings and the expected shop identity in platform-appropriate local
  configuration outside the repository and synced source directory. Keep ignored-file protection
  and secret scanning intact. Document independent setup on each computer; do not sync credentials.
- Provide local status, disconnect/token removal, Etsy revocation, shared-secret rotation recovery,
  and reauthorization instructions. Disconnect is deliberate; transient errors do not erase tokens.

### Etsy reads and the one-shop boundary

- Use the owner identity from the validated grant and the documented owner-to-shop lookup. Compare
  the result with the explicitly configured expected shop before enabling reads. Public shop data
  alone is not evidence of consent.
- Fix the shop in local configuration; do not accept arbitrary shop IDs as MCP input. Verify listing
  ownership before returning data, using the configured shop's known listing membership and response
  checks. Test mismatches with fabricated responses rather than probing another live shop.
- Implement only the selected GET operations with explicit request construction, bounded pagination,
  cancellation, timeouts, safe read retry limits, and rate-limit/Retry-After handling. Isolate OAuth
  token POST requests from the Etsy business-data client; no generic endpoint executor.
- Return only approved review fields: listing identity, title, description, tags, category, price,
  quantity/state, URL, and necessary factual attributes. Omit unneeded associations and profile,
  order, buyer, payment, message, image, and file payloads.
- Treat listing text as untrusted data. Return facts separately from suggested copy; no instructions
  inside a listing may change tool permissions or trigger an action.

### Proposed user-facing tools

| Tool or command             | Intended behavior                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Existing `get_setup_status` | Preserve compatibility and report sanitized setup/auth/read-only state without secrets                        |
| `list_active_listings`      | Bounded pagination for the configured shop with allowlisted summaries                                         |
| `get_listing`               | Retrieve one listing belonging to that shop with review-friendly fields                                       |
| Local connection CLI        | Configure, connect, inspect local status, and deliberately disconnect; credentials never become MCP arguments |

Finalize schemas during checkpoint 1. Authentication failures give clear local reauthorization
instructions and fail closed; the assistant never asks for a password, key, or token in chat.

## Test and acceptance plan

All automated tests use fabricated values and mocked Etsy responses. Deny unexpected network access
in the test harness so a missing mock cannot contact Etsy. Update the test command: it currently
runs only `tests/status.test.mjs`, so new suites must actually run under `npm run validate`.

Required coverage:

- PKCE/state generation, exact callback matching, malformed/duplicate/mismatched/replayed callbacks,
  denied consent, port conflicts, timeouts, and listener cleanup.
- Token expiry, refresh concurrency, revocation, insufficient/excess/unverifiable scopes, and store
  read/write failures; redaction tests covering success and error paths.
- Wrong shop/listing handling, pagination bounds, rate limiting, cancellation, incomplete responses,
  field minimization, and untrusted listing text.
- MCP contract tests proving the inventory is read-only, accepts no arbitrary shop/endpoint input,
  and cannot reach Etsy business-data writes. Preserve the existing status-tool contract.
- CI on Windows/macOS with Node 24/26, dependency audit, and secret scanning. Triage the previously
  observed moderate audit findings; do not claim a clean audit or force dependency upgrades.

After the implementation is reviewable, present a concrete manual test for explicit authorization:
the owner provisions credentials locally, consents on Etsy in the browser on the receiver's machine,
and verifies callback, effective scope, and expected-shop identity. Limit initial live reads to the
agreed identity check and a bounded active-listing sample. No writes. Record only sanitized pass/fail
evidence in project materials, never credentials, identifiers, live listing content, or screenshots.

Run the existing status-only MacBook check first if T-010 is still outstanding. Verify real protected
storage on Windows and macOS with fabricated secrets; CI mocks alone do not establish OS-store
compatibility. Record missing hardware/manual evidence as incomplete rather than claiming support.
Then perform the owner-authorized connected MacBook smoke test. Confirm Codex can review listing
facts and produce suggestions without inventing product claims.

The phase is accepted when its gated verification is complete, the read-only tools work for the
configured shop, security/automated/platform checks pass, recovery is documented, and the product
owner accepts the behavior. Reviewable code alone does not mark T-007/T-009/T-010 Done.

## Proposed lower-cost delegation, only after permission

Use at most two concurrent `gpt-6-luna` workers at medium reasoning, reused across two waves. The
product owner authorized this delegation on 31 October 2026. This is not a claim about exact pricing.
No nested delegation or unapproved model upgrades. Keep each assignment bounded to its files,
acceptance tests, and an integration checkpoint; bring repeated failures or design changes back
instead of continuing an open-ended run.

| Wave        | Worker A                                                                   | Worker B                                                                          | Lead responsibility                                                                                             |
| ----------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Preparation | OAuth/security review                                                      | Credential-store review                                                           | Finalize design, interfaces, dependency decisions, shared configuration/redaction contracts, and file ownership |
| 1           | OAuth protocol, callback receiver, token lifecycle, and focused tests      | OS credential-store adapters, secure local input helper, and focused tests        | Review security-sensitive paths and integrate connection CLI/verifier                                           |
| 2           | Etsy read client, identity/listing ownership checks, pagination, and tests | MCP tool schemas/output mapping, contract tests, and setup/recovery documentation | Integrate only after gates; review complete request/data flow and run acceptance checks                         |

Workers receive seller-neutral contracts and fabricated fixtures only, never real credentials or
shop data. Use isolated work areas or strictly disjoint file ownership. The lead owns shared
interfaces, `package.json`, lockfile, workflow changes, final README integration, and commits to avoid
parallel conflicts. The lead reviews all work; cheaper workers do not approve their own security
designs or final acceptance. No worker performs live OAuth, publishes changes, or merges a PR.

## Review and delivery

Preserve the existing uncommitted documentation work. Use feature branches and focused changes:
first connection/security verification, then read-only client/tools. Before any live test, prepare
its exact action and expected results for owner authorization. Before publication, provide the
actual diff, check results, and draft PR description. Keep protected-main rules intact and leave
merge to the normal reviewed process.

Approval selected the read-only scope, minimum-scope proposal, OS-store-only approach, bounded-verifier
sequencing refinement, and delegation structure. Live credentials/API access, future writes or other
private-data features, hosting, publication, and merge remain subject to their stated
review/authorization boundaries.

Current state (31 October 2026): duplicate documentation connection removed; the owner approved this plan and bounded
delegation. The read-only alpha has been implemented; a fabricated macOS protected-store smoke test
passed, while Windows and the full platform matrix remain unverified. The product owner has accepted
the unresolved Etsy terms risk for now. The local connection CLI is implemented for offline-tested
verification and the owner-authorized Mac connection was reported successful. Bounded live listing
and detail reads have passed on the Mac through the alpha entry point. Windows and recovery review
remain open; the normal server remains status-only. The Mac-tested `v0.1.0-alpha.1` is published
as a GitHub prerelease. This plan also describes historical gates and does not imply Windows live acceptance.

## Reference evidence

- Etsy MCP `essentials/authentication`: PKCE/state, exact redirect matching, effective scopes,
  expiry/refresh and owner-ID behavior; checked 2026-10-31.
- Etsy MCP endpoint lookups: `getListingsByShop`, `getListing`, `getShopByOwnerUserId`; checked 2026-10-31.
- [Authentication guide](https://developers.etsy.com/documentation/essentials/oauth2/) and
  [Quick Start](https://developers.etsy.com/documentation/tutorials/quickstart/): the HTTPS/localhost
  documentation mismatch still requires real authorization evidence.
- [API Terms](https://www.etsy.com/legal/api/): owner registration approval does not replace review of
  permitted use or approval requirements for later application changes.
