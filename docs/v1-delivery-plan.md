# Delivery plan to v1

Prepared 1 November 2026 from live main `276af58`, the steering document and tracker.
This is the working delivery plan, not authorization for release publication or live access.
It supersedes the earlier phase proposal for sequencing future v1 work; historical evidence remains intact.

## What v1 delivers

A dependable local, owner-authorized, read-only listing assistant on macOS with Codex Desktop.
The operator can install, connect, inspect listing facts, obtain grounded copy suggestions through
Codex, understand failures, and follow documented recovery steps. Credentials remain in Keychain.
The default status-only entry point and explicit read-only entry point remain distinct.

Writes, expanded scopes, hosted services, new MCP clients and additional operating systems are
outside this delivery. No new feature is needed merely to label the existing assistant v1.
Version targets are `1.0.0-rc.1` for final rehearsal and `1.0.0` after acceptance, subject to
review of the exact candidate. The unpublished alpha.2 can be an interim checkpoint; publishing
another alpha is optional and must not delay the v1 gates without a useful reason.

## Baseline we retain

- T-009 listing reads and T-010 Mac/Codex restart/setup-status acceptance are Done.
- Owner-authorized Mac OAuth, configured-shop identity, listing and detail reads passed.
- The isolated recovery drill passed all eight stages in offline and owner-authorized test-only
  Keychain modes, verified cleanup, and was accepted by the owner. PR #10/main `87c6023`
  passed all five checks; local validation passed 178 offline tests.
- PR #11 records scoped owner acceptance. It does not claim live revocation, reauthorization,
  interactive CLI recovery, or recovery of the healthy connection was tested.
- Published `v0.1.0-alpha.1` remains unchanged. Alpha.2 is prepared but unpublished.

## Milestones and completion criteria

| Milestone                                    | Work led by maintainer                                                                                                                                                                                                                                                                                                      | Evidence required to finish                                                                                                                                                                                                                                                                                                       | Owner involvement                                                                                                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Close the acceptance gaps on paper        | Map every remaining T-007/T-008 criterion to accepted evidence, a bounded test, or a proposed deferral. Define the owner-only v1 claim and recovery limitations precisely.                                                                                                                                                  | A criterion-by-criterion matrix in the readiness record; explicit disposition for every open criterion. No silent task closure or scope reduction.                                                                                                                                                                                | Delegated access was deferred by the owner on 1 November 2026. Decide whether the stated live recovery limitations are acceptable for v1. Receive a plain-language recommendation first.                                         |
| 2. Finish focused offline hardening          | Review clock changes and expiry calculation after refresh transport; reproduce actual failure cases before selecting small fixes. Review the 11 moderate development audit findings and compatible remediation. Add isolated coverage for interactive CLI recovery without exposing production paths or native credentials. | Focused PRs with regression tests; timing behavior and audit findings fixed or explicitly dispositioned with rationale. CLI cancellation, partial failure, cleanup and successful recovery are exercised with mocks/temporary fixtures. Required CI stays enforced.                                                               | No routine approvals. Concrete authorization only if a proposed test needs native storage or live access beyond existing authorization.                                                                                          |
| 3. Rehearse the release candidate on the Mac | Prepare rc.1 and concise install/update/recovery instructions. Verify a fresh checkout/build and STDIO status/inventory from the exact candidate using isolated settings and fabricated storage. Exercise a listing-review scenario with synthetic facts.                                                                   | Repeatable installation and restart; version agreement across manifest, lockfile, handshake and status; expected read-only inventory; no unintended network/credential access; suggestions separate facts from ideas and invent no materials, dimensions or claims. Record actual Mac/runtime versions and operator observations. | Review the short operator walkthrough and whether the behavior is useful and understandable. Any justified live smoke test is separately specified and authorized; existing accepted live checks are not automatically reopened. |
| 4. Release v1 deliberately                   | Freeze the source candidate, finish technical/security review, reconcile all release materials and connected records, run the normal PR/CI process, and prepare exact release notes and rollback instructions.                                                                                                              | All applicable gates resolved; exact-candidate validation, supported Node CI, audit disposition and secret scan recorded. README, SECURITY, guides, diagrams, ADRs, steering, tracker, versions and notes agree. Post-merge source matches the reviewed candidate.                                                                | Approve publication of the named version and exact commit after seeing the completion summary and remaining risks. Publication is never inferred from enthusiasm or acceptance of a test.                                        |

Proceed in this order; milestone 2 investigation and the milestone 1 evidence matrix can overlap.
Use small PRs and reuse valid evidence. There is no calendar promise until the remaining findings
and owner decisions are bounded. Report completion or a concrete decision needed, not routine
platform backlog updates.

## Decisions to prepare, not assume

1. **Delegated authorization (T-016):** owner decision on 1 November 2026: no delegated access
   is needed for v1. Keep it in the backlog at P3 (very low priority), with no target date.
   T-007 covers owner-authorized registration and OAuth only; delegated access is no longer
   a v1 acceptance gate. This does not establish delegated support or authorize implementation.
2. **Recovery (T-008):** the isolated Mac results are accepted. Next cover the interactive CLI
   with isolated fixtures and present what that proves. Do not destroy a healthy connection to
   test revocation. Explain residual live-service uncertainty and ask the owner to decide whether
   it is an acceptable documented limitation or needs a separately authorized live exercise.
3. **Clock and dependency risk:** maintainer first investigates and recommends concrete fixes or
   dispositions. Do not ask the owner to judge code or to accept an unexplained technical risk.
   The rejected TypeScript 7 upgrade must not be forced through incompatible lint tooling.
4. **Interim alpha.2:** finish its reconciliation if publishing it provides a useful checkpoint.
   Otherwise proceed toward rc.1 without creating or moving an alpha tag. The owner decides
   publication only when the chosen artifact is concrete.

Delegated-access deferral above is approved. The remaining proposed dispositions are not waivers.
T-007/T-008 remain In Progress until their actual criteria are fulfilled or explicitly revised.
T-012 tracks delivery through the release gate; T-009/T-010 stay Done.

## Immediate next work

Produce the T-007/T-008 acceptance matrix and review the timing/expiry paths against fabricated
clock/transport cases. Bring back a concise recommendation for the remaining recovery decision above
while continuing independent offline engineering. Prepare the isolated interactive CLI coverage
once its fixture and storage boundary are reviewed. No new live requests, credential reads,
resets, reauthorization, native test runs, release tags or publication are authorized by this plan.

## Final handoff to the owner

The final release decision should fit on one page: what v1 does, exact version/commit, what passed,
what remains untested, risks and their dispositions, installation/update instructions, and how to
return to the prior release without discarding connection state. The owner evaluates product
behavior and stated limits; the maintainer owns technical review and truthful evidence.
