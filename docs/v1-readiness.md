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

- The [isolated recovery drill](mac-recovery-acceptance.md) passed offline and owner-authorized test-only Keychain modes on the Mac, with cleanup verified; the owner accepted these isolated results on 1 November 2026. T-008 remains In Progress for its broader criteria: live revocation/reauthorization, interactive CLI recovery, and recovery of the healthy connection were not tested or accepted by this drill. Do not reset, revoke, or remove credentials from a healthy connection to fill an evidence checkbox.
- Review the alpha.2 candidate diff, run validation and audit, and obtain its own CI/security results. Earlier checks are baseline evidence only.
- Reconcile release materials and record the exact candidate in the [release checklist](release-checklist.md#v010-alpha2-candidate). Publication requires explicit owner authorization after the candidate is concrete.
- Delegated authorization remains untested under T-007. This candidate continues the owner-authorized alpha boundary and makes no delegated-access claim.
- Wall-clock adjustments can affect waits and apparent freshness; expiry is currently calculated after refresh transport. See the [clock assessment](development.md#refresh-failure-and-cleanup-diagnostics). A timing redesign remains separate work.

Other local STDIO clients follow v1. Windows follows that client milestone; Linux remains exploratory. Neither is a v1 manual acceptance gate. Etsy writes and broader scopes remain separately gated.
