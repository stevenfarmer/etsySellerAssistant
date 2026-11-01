# Current v1 readiness

Updated 1 November 2026. The development version is `1.0.0`, **unpublished and incomplete for the expanded v1 scope**.
The published release remains `v0.1.0-alpha.1`. No final v1 product acceptance or publication
authorization has been given.

The authoritative local feature/use-case/acceptance matrix is
[requirements-and-acceptance.md](requirements-and-acceptance.md). Task state is synchronized
with the connected tracker under the [tracking process](project-tracking.md). This page is a
release summary, not a second requirements list.

## Completed implementation and verification

- M1: Mac setup/startup and owner-route identity checks; session status displays verified numeric
  owner/shop IDs and UTC time from the last successful read. Status does no I/O and is not current health.
- M2: protected OAuth/token lifecycle, fail-closed uncertain refresh, recovery guidance, and the
  accepted eight-stage isolated Mac Keychain drill with verified cleanup.
- M3: bounded configured-shop listing pages/detail. Existing owner-authorized Mac reads and
  restart/status acceptance remain accepted; T-009/T-010 are Done.
- M4: fabricated list/detail path and [worked fact-grounded review](listing-review-example.md)
  demonstrated. Owner usefulness/final product acceptance remains with T-012.
- M5: read-only inventory, constrained inputs/outputs, secret handling, and actionable sanitized
  authorization/access/rate-limit/timeout/service/data diagnostics.

Runtime baseline [PR #17](https://github.com/stevenfarmer/etsySellerAssistant/pull/17),
`6dc9c3b`, matches reviewed head `c26ba1c` exactly. It passed all five PR/main checks.
A fresh exported checkout on macOS 27.0.1 / Node 24.11.1 / npm 11.6.2 passed locked install,
build and `npm run validate` with **200 offline tests**. Production audit: zero findings;
full audit: 11 moderate development entries, no high/critical findings.
This was a fresh checkout on the existing Mac, not a new clean-machine/live OAuth test.

## Work still required for v1

The owner confirmed editing and intelligent sales-oriented recommendations are expected in v1.
[ADR 0005](decisions/0005-v1-intelligence-and-guarded-edits.md) supersedes the read-only-only
release recommendation. T-023 (intelligent review), T-011 (guarded-write design/security review),
T-024 (guarded edits after review) and T-025 (measurement/usefulness) are active v1 work.
ADR 0006 adds M8/T-026/T-027 private customizable guidance. The
[phase-gated plan](v1-phase-gates.md) breaks delivery into one resumable chunk per continuation;
[the checkpoint](work-checkpoint.md) names 1B/T-027 as next after chunk 1A merge. T-028/T-029/T-030 split T-024;
T-031 tracks concrete separately authorized Mac/usefulness/edit acceptance. Chunk 1A/T-026 implements private storage/template only: 12 fabricated tests; full validation
passed 212 offline tests. MCP delivery is not enabled. Other listed capabilities remain planned.
Their [requirements](intelligent-listing-review.md) distinguish planned capabilities from the
existing read-only implementation. No write tools/scopes have been enabled.

T-007 remains Done; accepted read/setup/recovery evidence is retained. T-008 remains In Review
for disclosed recovery limits. T-012 is In Progress, pending the expanded features and final
product/limits acceptance, then exact-candidate checks and separate publication authorization.
There is no stable publication target now; do not publish the previous read-only build as v1.

## Disclosed limitations and backlog

- Status is evidence from a prior read; external reset/revocation is not detected until a read/restart.
- Live revocation/reauthorization and interactive terminal recovery were not exercised by the
  accepted isolated drill. Extra isolated terminal coverage is T-022/Backlog.
- Persisted expiry still uses wall time and post-transport anchoring: T-020/Backlog.
- Moderate development dependency advisory remediation is T-021/Backlog; no fix is claimed.
- Existing Etsy terms uncertainty retains the previously recorded owner decision.
- Delegated access is T-016/P3 backlog, outside v1. Guarded editing is now planned for v1; other clients remain deferred.

There is no demonstrated missing website/domain setup requirement for the already approved,
successfully owner-authorized installation. The earlier request for extra checks was a historical
discovery inference, not a current feature gate. No new portal inspection or waiver is claimed.

See the [delivery status](v1-delivery-plan.md), [candidate notes](releases/v1.0.0.md), and
[release checklist](release-checklist.md). No additional live/native/credential action is required
or authorized by this reconciliation.
