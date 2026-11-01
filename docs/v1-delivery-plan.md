# Current delivery status to v1

Updated 1 November 2026. The [phase-gated plan](v1-phase-gates.md) is the single sequence of
small deliverables and exit gates. The [work checkpoint](work-checkpoint.md) records where to
resume. Use the [current matrix](requirements-and-acceptance.md) for requirements/acceptance
and the connected tracker for execution state.

| Phase                             | State                            | Tasks / result                                                                                                                |
| --------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Read/setup/recovery foundation    | Delivered within recorded limits | Existing accepted evidence retained; final T-008 limitations review remains.                                                  |
| 1. Private playbooks              | 1A Done; 1B client check pending | T-026 storage/template Done; T-027 implementation/STDIO checks complete; In Review for actual Codex invocation after restart. |
| 2. Useful recommendations         | Next                             | T-023 workflow/validators, then fabricated evaluation and private owner playbook.                                             |
| 3. Editing design/security        | In Progress                      | T-011 detailed API/scopes/tool/approval/audit/recovery review before phase 4.                                                 |
| 4. Guarded editing                | Next                             | T-024 umbrella; T-028 proposal/approval, T-029 audit, T-030 apply/reconciliation.                                             |
| 5. Measurement and Mac acceptance | Next                             | T-025 aggregate measurement; T-031 concrete separately authorized Mac/usefulness/live-edit acceptance.                        |
| 6. Release-ready and publication  | In Progress (planning only)      | T-012 exact candidate, checks, risk disposition/docs reconciliation, then separately authorized publication.                  |

**Current gate: finish 1B/T-027 Codex discovery/default-generic invocation after app restart.**
The tool and client-neutral contract are implemented; full validation passed 222 offline tests
including generic/private/missing/error alpha STDIO checks. Do not call that real Codex acceptance.
No Etsy/credential request or actual private file is needed. After that check is recorded, chunk
2A/T-023 is next. Stop at the 1B checkpoint; do not start recommendation implementation here.
Default one chunk per continuation, with actual checks/review/CI/merge and synchronized records.

Development version `1.0.0` is unpublished and incomplete for v1. No stable publication target
is selected; published `v0.1.0-alpha.1` is unchanged. The reusable MCP design remains client-neutral;
v1 runtime acceptance remains macOS/Codex Desktop, with other clients afterward. T-020/T-021/T-022
remain Backlog/P2; assess their relevance to the final write-capable product at release review.
Delegated access remains low-priority backlog. No website/setup detour or destructive recovery
exercise is introduced by this plan.
