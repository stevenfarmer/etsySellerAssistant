# macOS / Codex Desktop v1 readiness

Reviewed on 1 November 2026. The development candidate is `0.1.0-alpha.2`, not a published release or stable v1. Published `v0.1.0-alpha.1` remains unchanged. Platform sequencing follows [ADR 0004](decisions/0004-v1-platform-scope.md).

## Accepted evidence

- Owner-authorized Mac OAuth, configured-shop identity, Codex Desktop listing retrieval, and a separate bounded list-and-detail check passed. T-009 remains Done.
- The owner restarted the app after PR #7. The registered alpha's setup-status tool passed without contacting Etsy. T-010 is Done. This evidence does not verify current authorization.
- Recorded environment: macOS 27.0.1, Node.js 24.11.1, npm 11.6.2; host ChatGPT 26.1027.30824 build 22943, embedded Codex helper 156.0.8078.48 build 8078.48. These are observed host/runtime versions, not an inferred standalone Codex Desktop release number.
- PR #8 merged as `4f0761e`. Its five PR and main checks passed. Local validation passed 174 offline tests against the merged dependency baseline.
- Recovery coverage includes cross-process refresh concurrency, uncertain refresh, incomplete token pairs, replacement-token persistence failures, primary plus cleanup failure, cleanup-only failure, oversized/incomplete owner metadata at the deadline, invalid grants retaining the refreshing marker, and release tombstones. Tests use fabricated stores and temporary directories.
- Listing tools distinguish contention from recovery-required failures. Tool names, inputs, read-only permissions, and Etsy scopes are unchanged.

## Actual remaining v1 work

The agreed read-only requirements are owner-authorized Mac/Codex setup, protected credentials,
correct-shop listing retrieval, useful fact-grounded review, understandable errors, recovery review,
and the normal release checks. Historical discovery notes and additional hardening ideas are not
automatically independent release gates.

| Requirement                              | Current result                                                                                                                                    | Remaining work                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install/start and owner-authorized reads | Accepted Mac OAuth, identity, listing/detail and restart checks; T-009/T-010 Done.                                                                | Verify install/update instructions against the exact release candidate. Do not repeat accepted live checks without a concrete reason.                                                                           |
| Connection confirmation                  | After a successful listing read, status displays verified owner/shop IDs and UTC timestamp from memory; pending/failed reads or restart clear it. | Implemented with no new Etsy calls or credential reads; exact-candidate tests cover lifecycle, privacy, release failure and out-of-order completion.                                                            |
| Fact-grounded review (M4)                | [Fabricated list/detail demonstration and worked review](listing-review-example.md) completed through production read modules and MCP handlers.   | Owner review of the usefulness and clarity of suggested title/description/tags; no new server-side AI feature required.                                                                                         |
| Actionable diagnostics (M5)              | Typed authorization, permission, rate-limit, timeout, service, missing-resource and response errors now produce distinct sanitized tool messages. | Exact-candidate tests/CI and review; no automatic retries or setup mutation.                                                                                                                                    |
| Recovery review                          | Eight-stage offline and authorized test-only Keychain drill passed with verified cleanup; owner accepted its scoped results.                      | Keep live revocation/reauthorization and interactive terminal recovery explicitly untested. Assess actual risk at final release review; do not treat every untested scenario as an invented mandatory exercise. |
| Release readiness                        | Automated validation and protected-branch checks operate; published alpha.1 remains unchanged.                                                    | Final candidate/version, security/dependency dispositions, installation/update evidence, reconciled notes and explicit publication authorization.                                                               |

## Corrections to historical gates

The owner-registration form observed in the existing record had no Website URL field. The
Seller App was subsequently approved, and owner authorization and listing reads passed.
There is no demonstrated missing website/domain setup requirement for this working installation.
The earlier request for additional app-page checks was an overstatement of an old discovery note;
it is not a v1 blocker without a concrete applicable requirement or failure. This does not claim
a new portal inspection occurred.

Delegated access is T-016/P3 backlog, outside v1 acceptance by explicit owner decision.
The historical T-007 registration/callback questions must be reconciled against the accepted
owner-route evidence, not kept open merely because they predate the successful flow.

## Engineering risks, distinct from product gaps

- Lock retry timing across system-clock changes was fixed with monotonic elapsed time.
- Persisted token freshness still uses wall time and post-transport expiry calculation.
  The fabricated timing assessment identifies an assumption; it is not proof of a live failure.
  Evaluate concrete fixes or dispositions without turning a timing rewrite into a new feature gate.
- The last audit reported 11 moderate development entries tracing to minimatch and zero
  production findings. Final release review must record the actual current results and disposition.
- Further interactive CLI coverage is useful engineering work; it is not a new product feature
  or a reason to destroy the healthy connection.

The [delivery plan](v1-delivery-plan.md) is subject to these requirement/evidence corrections.
No additional live requests, credential actions, release tags or publication are authorized here.
