# Current delivery plan to v1

Updated 1 November 2026. The owner confirmed editing and intelligent sales-oriented recommendations
are expected in v1. The prior read-only publication recommendation is superseded by
[ADR 0005](decisions/0005-v1-intelligence-and-guarded-edits.md). Use the
[current matrix](requirements-and-acceptance.md) for acceptance and the
[tracking process](project-tracking.md) for every change.

| Stage                                        | State            | Next deliverable                                                                                                                                                                |
| -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mac/Codex owner read foundation              | Delivered        | Retain accepted OAuth/list/detail/restart and isolated recovery evidence. T-007/T-009/T-010/T-018/T-019 Done; T-008 final disclosed-limits review remains.                      |
| Intelligent recommendation workflow — T-023  | Next / P1        | Repeatable client workflow using facts, owner brief and dated Etsy guidance; prioritized exact drafts with reasons/uncertainty; fabricated evaluation and validation.           |
| Guarded-write design/security review — T-011 | In Progress / P1 | Review API/scope and permitted use, tool contracts, approval binding, stale/concurrent edits, audit durability and uncertain outcomes before write-access implementation.       |
| Guarded-edit implementation — T-024          | Next / P1        | After T-011 review: title/description/tags prepare/approve/apply/verify, audit-before-write, recovery guidance and offline failure-path tests.                                  |
| Measurement and usefulness — T-025           | Next / P1        | Optional owner-supplied aggregate Stats baseline/comparison, fabricated examples and owner review of useful recommendations. No sales-uplift guarantee or mandatory sales wait. |
| Exact candidate and publication — T-012      | In Progress / P1 | After expanded M4/M6/M7 delivery/acceptance: reconcile exact source/version/docs, validate, review limits, obtain separate publication authorization.                           |

## Immediate work

Start the intelligent review workflow and detailed editing design. The
[review requirements](intelligent-listing-review.md) define inputs, outputs and acceptance.
Develop using fabricated data and temporary directories; keep the healthy connection intact.
The product owner judges usefulness and business fit; the maintainer owns technical review.
Live tests, credential/scope changes and publication need concrete authorization when ready.

Development version still reads `1.0.0`; that unpublished literal is not a completed v1 release.
No stable publication target is selected. Published `v0.1.0-alpha.1` remains unchanged.
T-020 expiry reliability, T-021 development advisory and T-022 extra terminal recovery coverage
remain Backlog/P2 with disclosed limits. T-016 delegated access stays Backlog/P3 outside v1.
No website/setup detour or destructive recovery exercise is introduced by this scope change.
