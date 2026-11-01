# macOS / Codex Desktop v1 readiness

Reviewed on 1 November 2026. The development candidate is `0.1.0-alpha.2`, not a published release or stable v1. Published `v0.1.0-alpha.1` remains unchanged. Platform sequencing follows [ADR 0004](decisions/0004-v1-platform-scope.md).

## Accepted evidence

- Owner-authorized Mac OAuth, configured-shop identity, Codex Desktop listing retrieval, and a separate bounded list-and-detail check passed. T-009 remains Done.
- The owner restarted the app after PR #7. The registered alpha's setup-status tool passed without contacting Etsy. T-010 is Done. This evidence does not verify current authorization.
- Recorded environment: macOS 27.0.1, Node.js 24.11.1, npm 11.6.2; host ChatGPT 26.1027.30824 build 22943, embedded Codex helper 156.0.8078.48 build 8078.48. These are observed host/runtime versions, not an inferred standalone Codex Desktop release number.
- PR #8 merged as `4f0761e`. Its five PR and main checks passed. Local validation passed 174 offline tests against the merged dependency baseline.
- Recovery coverage includes cross-process refresh concurrency, uncertain refresh, incomplete token pairs, replacement-token persistence failures, primary plus cleanup failure, cleanup-only failure, oversized/incomplete owner metadata at the deadline, invalid grants retaining the refreshing marker, and release tombstones. Tests use fabricated stores and temporary directories.
- Listing tools distinguish contention from recovery-required failures. Tool names, inputs, read-only permissions, and Etsy scopes are unchanged.

## Remaining acceptance and release work

The [v1 delivery plan](v1-delivery-plan.md) defines the next milestones and decision gates. It proposes no automatic waiver of the open criteria below.

- The [isolated recovery drill](mac-recovery-acceptance.md) passed offline and owner-authorized test-only Keychain modes on the Mac, with cleanup verified; the owner accepted these isolated results on 1 November 2026. T-008 remains In Progress for its broader criteria: live revocation/reauthorization, interactive CLI recovery, and recovery of the healthy connection were not tested or accepted by this drill. Do not reset, revoke, or remove credentials from a healthy connection to fill an evidence checkbox.
- Review the alpha.2 candidate diff, run validation and audit, and obtain its own CI/security results. Earlier checks are baseline evidence only.
- Reconcile release materials and record the exact candidate in the [release checklist](release-checklist.md#v010-alpha2-candidate). Publication requires explicit owner authorization after the candidate is concrete.
- Delegated authorization remains untested and was moved to the very low-priority backlog (T-016/P3) by the owner on 1 November 2026. It is outside v1 acceptance. T-007 retains the owner-authorized registration/OAuth criteria; no delegated-access support is claimed.
- Lock retry waits now use monotonic elapsed time, with forward/backward clock regression coverage. Persisted expiry still depends on wall-clock time and is currently calculated after refresh transport. See the [clock assessment](development.md#refresh-failure-and-cleanup-diagnostics). A timing redesign remains separate work.

Other local STDIO clients follow v1. Windows follows that client milestone; Linux remains exploratory. Neither is a v1 manual acceptance gate. Etsy writes and broader scopes remain separately gated.

## Owner-path and recovery acceptance matrix — 1 November 2026

This reconciles historical T-007/T-008 criteria without reopening accepted live listing work.

| Criterion                                     | Current evidence / disposition                                                                                                                                                           | Next step                                                                                                                                        |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-007 Seller App registration/approval        | Owner-login Seller App approved; accepted Mac owner OAuth passed.                                                                                                                        | Retain accepted evidence.                                                                                                                        |
| T-007 website/settings                        | Recorded owner registration form had no Website URL field; later settings/domain-validation requirements were not verified in the historical record.                                     | Resolve this specific evidence gap; no new portal or credential access was performed. Do not infer additional requirements or silently close it. |
| T-007 callback                                | Registered callback persisted; subsequent owner consent and local connection passed callback/token verification.                                                                         | Earlier pending callback-test wording is superseded by the successful owner flow.                                                                |
| T-007 permissions and identity                | Owner flow enforces exact listings_r scope and configured-shop identity; accepted listing/detail reads passed.                                                                           | Retain accepted evidence; no scope expansion or repeat live test needed.                                                                         |
| T-007 authorizer                              | Owner authorization is the v1 path. Delegated access is T-016/P3 backlog by explicit owner decision.                                                                                     | Delegated testing does not block v1. Final owner-path acceptance still needs the evidence reconciliation above.                                  |
| T-008 protected storage and isolated recovery | Eight-stage offline and Mac test-only Keychain drill passed with verified cleanup and scoped owner acceptance.                                                                           | Accepted; no repeat native run needed for this timer-only change.                                                                                |
| T-008 interactive CLI recovery                | Current acceptance drill invokes production modules with mocks; it does not exercise real terminal prompts.                                                                              | Add isolated interactive CLI integration coverage and an understandable operator walkthrough.                                                    |
| T-008 live revocation/reauthorization         | Not tested by the isolated drill; healthy connection remains intact.                                                                                                                     | Present a concrete residual-risk recommendation before requesting a limitation disposition or separately authorized live test.                   |
| T-008 timing behavior                         | Backward clock jump reproduced an overlong lock retry wait; monotonic fix passes regressions for both directions. Expiry post-transport assumption reproduced with fabricated time only. | Keep expiry anchoring/clock freshness review separate from the confirmed wait fix.                                                               |
| T-009 / T-010                                 | Listing/detail reads and Mac restart/status acceptance are Done.                                                                                                                         | Do not reopen these completed tasks merely to progress v1.                                                                                       |

T-007/T-008 remain In Progress; this matrix records technical evidence, not new owner acceptance.
Next engineering work is conservative token-expiry design and isolated CLI recovery coverage,
followed by dependency-risk disposition and exact-candidate rehearsal under the delivery plan.
