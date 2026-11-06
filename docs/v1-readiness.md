# Current v1 readiness

Updated 5 November 2026. The development version is `1.0.0`, **unpublished and incomplete for the expanded v1 scope**.
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
  demonstrated. Owner usefulness was accepted in T-031; final product acceptance remains T-012.
- M5: read-only inventory, constrained inputs/outputs, secret handling, and actionable sanitized
  authorization/access/rate-limit/timeout/service/data diagnostics.

Runtime baseline [PR #17](https://github.com/stevenfarmer/etsySellerAssistant/pull/17),
`6dc9c3b`, matches reviewed head `c26ba1c` exactly. It passed all five PR/main checks.
A fresh exported checkout on macOS 27.0.1 / Node 24.11.1 / npm 11.6.2 passed locked install,
build and `npm run validate` with **200 offline tests**. Production audit: zero findings;
full audit: 11 moderate development entries, no high/critical findings.
This was a fresh checkout on the existing Mac, not a new clean-machine/live OAuth test.

## Work still required for v1

The owner confirmed v1 includes photo-based complete listing drafts, distinct reviews for selected existing listings, and on-request comparable-pricing and seasonal/marketing research, alongside guarded edits.
[ADR 0005](decisions/0005-v1-intelligence-and-guarded-edits.md) supersedes the read-only-only
release recommendation. T-023 (intelligent review), T-011 (guarded-write design/security review),
and T-024 (guarded edits) are complete for their stated criteria. T-025 measurement design was moved to the
backlog by the owner on 5 November 2026; its method does not fit unique, one-off handmade items
yet and it is not a current release gate. T-031 Mac usefulness and guarded-edit acceptance passed
on 5 November 2026. T-035's revised confirmation also passed Mac owner review and merged in PR #44.
T-034's functional first-run private-guidance proposal was approved and merged in PR #48 as
`23e1a0e0318783ab56240c9566421fa17cad9bfe`; all five checks passed on reviewed head
`52fde35efe36ff472b9511cd12a74f13f49437ea` (run 42146691927). T-039 implements the setup prompt
and fixed-path create-only save. T-040 implements natural-language update entry, safe reviewed
replacement, manual editing guidance and the separate in-chat activation choice; Codex Desktop
acceptance remains. T-037 and T-038 track photo-based drafts and requested price/marketing research;
broader listing/pricing management remains longer-term vision.
The CI workflow scans Git history for secrets and runs `npm audit` across its Node/OS matrix;
Dependabot weekly dependency updates are configured. No CodeQL workflow was found, and the current
connection could not verify GitHub alert or push-protection settings. T-036 tracks closing this
coverage gap before the v1 release candidate.
ADR 0006 adds M8/T-026/T-027 private customizable guidance. The
[phase-gated plan](v1-phase-gates.md) breaks delivery into one resumable chunk per continuation;
[the checkpoint](work-checkpoint.md) records T-028's successful Mac confirmation check and T-032's
readable same-call confirmation flow. The owner found the extra checkbox and host buttons confusing;
T-032 removed the extra field, passed the repeat Mac check without changing the listing, and was
accepted as clear enough to merge. T-033 completed in PR #35: the product is described as a local
STDIO MCP server, with Codex Desktop/macOS as the current v1 acceptance target. T-029 audit
durability and T-030 guarded apply/reconciliation implementation are complete under T-024. In
T-031, the owner accepted the review's usefulness and a separately authorized Mac edit completed
with verified values and an audit outcome. T-025 measurement design is deferred and is not a
prerequisite for T-031. Chunk 1A/T-026 implements private storage/template only: 12 fabricated tests; full validation
passed 212 offline tests. Chunk 1B adds get_review_guidance to alpha, generic by default;
full validation now passes 222 offline tests with actual STDIO coverage. After app restart, actual Codex discovery/default-generic invocation also passed on
1 November 2026. T-027 is Done for that scoped client gate; advanced review usefulness remains later work. Chunk 2A adds the [workflow/brief/draft checker](draft-review-workflow.md), fabricated
manual review and 12 new regressions; full validation passed 234 offline tests. Chunk 2B delivers the [evaluation suite/rubric and private strategy baseline](review-evaluation.md):
full validation passed 242 offline tests; eight fabricated reviews passed declared checks and
same-assistant self-assessment. The private file was created/loaded outside Git without changing
client settings. T-023 Done is scoped to those development criteria; T-031 usefulness/edit
acceptance and T-035 confirmation review are complete. Independent model benchmarking, other-client
validation and sales uplift are not established. Other listed capabilities remain planned.
Their [requirements](intelligent-listing-review.md) distinguish planned capabilities from the
existing deployed alpha.1 read-only implementation. The unpublished development alpha contains
guarded edit tools; the scoped Mac acceptance edit was completed under T-031. T-035's revised
confirmation copy passed Mac review and merged in PR #44 without changing the approval, audit, or
apply boundaries.

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
- Delegated access is T-016/P3 backlog, outside v1. Guarded editing is now planned for v1; other clients remain deferred.

There is no demonstrated missing website/domain setup requirement for the already approved,
successfully owner-authorized installation. The earlier request for extra checks was a historical
discovery inference, not a current feature gate. No new portal inspection or waiver is claimed.

See the [delivery status](v1-delivery-plan.md), [candidate notes](releases/v1.0.0.md), and
[release checklist](release-checklist.md). No additional live/native/credential action is required
or authorized by this reconciliation.
