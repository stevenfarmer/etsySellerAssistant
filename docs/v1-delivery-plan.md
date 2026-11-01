# Current delivery status to v1

Updated 1 November 2026. The [phase-gated plan](v1-phase-gates.md) is the single sequence of
small deliverables and exit gates. The [work checkpoint](work-checkpoint.md) records where to
resume. Use the [current matrix](requirements-and-acceptance.md) for requirements/acceptance
and the connected tracker for execution state.

| Phase                             | State                            | Tasks / result                                                                                                               |
| --------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Read/setup/recovery foundation    | Delivered within recorded limits | Existing accepted evidence retained; final T-008 limitations review remains.                                                 |
| 1. Private playbooks              | 1A and 1B Done                   | T-026 storage/template Done; T-027 implementation/STDIO checks and actual Codex discovery/default-generic invocation passed. |
| 2. Useful recommendations         | 2A delivered; 2B Next            | T-023 In Progress: 2A workflow/validators delivered, 2B broader evaluation/private owner playbook Next.                      |
| 3. Editing design/security        | In Progress                      | T-011 detailed API/scopes/tool/approval/audit/recovery review before phase 4.                                                |
| 4. Guarded editing                | Next                             | T-024 umbrella; T-028 proposal/approval, T-029 audit, T-030 apply/reconciliation.                                            |
| 5. Measurement and Mac acceptance | Next                             | T-025 aggregate measurement; T-031 concrete separately authorized Mac/usefulness/live-edit acceptance.                       |
| 6. Release-ready and publication  | In Progress (planning only)      | T-012 exact candidate, checks, risk disposition/docs reconciliation, then separately authorized publication.                 |

**Next chunk: 2B/T-023.** Chunk 2A delivers the generic review sequence/brief, local draft
validator and [fabricated worked review](review-workflow-example.md). Full validation passed
234 offline tests, including 12 new draft tests and actual alpha STDIO. It checks copy rules,
not facts/sales/approval, and uses no live/private/credential data. T-023 stays In Progress for
broader evaluation and a separately stored private owner playbook. No extra client restart gate
is invented here; prior 1B acceptance remains scoped to its tested version. Stop after 2A.

Development version `1.0.0` is unpublished and incomplete for v1. No stable publication target
is selected; published `v0.1.0-alpha.1` is unchanged. The reusable MCP design remains client-neutral;
v1 runtime acceptance remains macOS/Codex Desktop, with other clients afterward. T-020/T-021/T-022
remain Backlog/P2; assess their relevance to the final write-capable product at release review.
Delegated access remains low-priority backlog. No website/setup detour or destructive recovery
exercise is introduced by this plan.
