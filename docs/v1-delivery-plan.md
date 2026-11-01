# Current delivery status to v1

Updated 1 November 2026. The plan has reached final candidate review; it is no longer a list
of unimplemented product features. Use the [current requirements/use cases/acceptance matrix](requirements-and-acceptance.md)
for feature details and the [tracking process](project-tracking.md) for every change.

| Stage                                            | Current state                                             | Evidence / remaining action                                                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner-only v1 boundary                           | Decided                                                   | macOS/Codex Desktop, local STDIO, one owner-authorized shop, read-only. Delegated access is T-016/P3 backlog with no target date.                                                                |
| Listing, authorization and safety implementation | Complete                                                  | Accepted historical Mac owner OAuth/list/detail/restart checks; fixed scopes/endpoints and read-only inventory. T-007/T-009/T-010 Done.                                                          |
| Recovery and focused diagnostics/status fixes    | Implemented and verified                                  | Isolated Mac recovery accepted; monotonic retry wait, actionable diagnostics and session identity implemented. T-018/T-019 Done; T-008 final limits review pending.                              |
| Useful review demonstration                      | Demonstrated                                              | Fabricated facts and worked suggestions are recorded; usefulness acceptance is part of T-012 final review.                                                                                       |
| Candidate install/build/test and reconciliation  | Runtime rehearsal complete; documentation reconciled here | PR #17 runtime baseline passed a fresh-checkout install/build and 200 offline tests, plus five PR/main checks. This docs-only change has its own required checks and updated publication target. |
| Final acceptance and publication                 | In Review — T-012                                         | Owner accepts usefulness and disclosed limits, then separately authorizes the named version/commit. No v1 tag or release exists.                                                                 |

Development version is `1.0.0`, unpublished. Alpha.2 and rc.1 were intermediate source milestones,
never published; publishing them is not required. Published `v0.1.0-alpha.1` remains unchanged.

## Next action

Finish the final review using the [candidate notes](releases/v1.0.0.md) and current evidence.
Do not restart implementation already verified, revive speculative website checks, require
destructive live recovery, or add a new feature gate from a supporting engineering idea.

Tracked engineering follow-ups are T-020 (expiry reliability), T-021 (development advisory),
and T-022 (additional isolated terminal recovery coverage). They remain Backlog/P2.
T-011 writes/audit and T-015 other clients/platforms remain Deferred. Scope changes require
the existing authorization and design/review boundaries.

The owner is being asked to judge usefulness and explained limits, not certify source code.
The maintainer owns technical review, truthful evidence and exact-candidate consistency.
Publication remains a separate explicit decision after this documentation reconciliation.
