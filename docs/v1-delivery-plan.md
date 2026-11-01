# Current delivery status to v1

Updated 1 November 2026. The [phase-gated plan](v1-phase-gates.md) is the single sequence of
small deliverables and exit gates. The [work checkpoint](work-checkpoint.md) records where to
resume. Use the [current matrix](requirements-and-acceptance.md) for requirements/acceptance
and the connected tracker for execution state.

| Phase                             | State                            | Tasks / result                                                                                                               |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Read/setup/recovery foundation    | Delivered within recorded limits | Existing accepted evidence retained; final T-008 limitations review remains.                                                 |
| 1. Private playbooks              | 1A and 1B Done                   | T-026 storage/template Done; T-027 implementation/STDIO checks and actual Codex discovery/default-generic invocation passed. |
| 2. Useful recommendations         | 2A and 2B delivered              | T-023 Done for development deliverables; owner usefulness/private-mode/client/edit acceptance remains T-031.                 |
| 3. Editing design/security        | In Progress                      | T-011 detailed API/scopes/tool/approval/audit/recovery review before phase 4.                                                |
| 4. Guarded editing                | Next                             | T-024 umbrella; T-028 proposal/approval, T-029 audit, T-030 apply/reconciliation.                                            |
| 5. Measurement and Mac acceptance | Next                             | T-025 aggregate measurement; T-031 concrete separately authorized Mac/usefulness/live-edit acceptance.                       |
| 6. Release-ready and publication  | In Progress (planning only)      | T-012 exact candidate, checks, risk disposition/docs reconciliation, then separately authorized publication.                 |

**Paused after 2B at the owner's request. Next on explicit resumption: 3A/T-011.**
Chunk 2B adds [eight fabricated cases, evaluation checks/rubric and recorded evidence](review-evaluation.md)
and an initial private local playbook outside Git. Eight private reviews passed declared checks
and self-review threshold; that same-assistant run is not an independent model benchmark or
owner acceptance. Full validation passed 242 offline tests; actual private file load/permissions
verified separately, not in CI. No private contents/project data copied to Git or connected records,
no settings/scope/credential/Etsy changes, no automatic private-mode activation. T-023 is Done
for its development criteria; later product/usefulness/edit/release gates remain. Do not start 3A
until the owner resumes.

Development version `1.0.0` is unpublished and incomplete for v1. No stable publication target
is selected; published `v0.1.0-alpha.1` is unchanged. The reusable MCP design remains client-neutral;
v1 runtime acceptance remains macOS/Codex Desktop, with other clients afterward. T-020/T-021/T-022
remain Backlog/P2; assess their relevance to the final write-capable product at release review.
Delegated access remains low-priority backlog. No website/setup detour or destructive recovery
exercise is introduced by this plan.
