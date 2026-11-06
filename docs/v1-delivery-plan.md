# Current delivery status to v1

Updated 6 November 2026. The [phase-gated plan](v1-phase-gates.md) is the single sequence of
small deliverables and exit gates. The [work checkpoint](work-checkpoint.md) records where to
resume. Use the [current matrix](requirements-and-acceptance.md) for requirements/acceptance
and the connected tracker for execution state.

| Phase                               | State                            | Tasks / result                                                                                                                                                                                                                |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read/setup/recovery foundation      | Delivered within recorded limits | Existing accepted evidence retained; final T-008 limitations review remains.                                                                                                                                                  |
| 1. Private playbooks                | 1A and 1B Done                   | T-026 storage/template Done; T-027 implementation/STDIO checks and actual Codex discovery/default-generic invocation passed.                                                                                                  |
| 2. Useful recommendations           | 2A and 2B delivered              | T-023 Done for development deliverables; owner accepted review usefulness in T-031. Cross-client acceptance remains T-015.                                                                                                    |
| 3. Editing design/security          | Done                             | T-011 design review completed in PR #26.                                                                                                                                                                                      |
| 4. Guarded editing                  | T-024 and T-035 complete         | T-028 proposal/approval, T-032 confirmation, T-029 audit and T-030 apply/reconciliation are complete. T-031 owner acceptance and T-035 Mac confirmation review passed.                                                        |
| 5. Measurement and Mac acceptance   | T-025 Backlog; T-031 Done        | Owner deferred T-025 on 5 November 2026 because repeat-item sales comparisons do not fit one-off handmade inventory. T-031's private-guidance review and authorized guarded-edit Mac acceptance are complete.                 |
| 5C. Guided private-guidance setup   | T-034 Done (design)              | Owner approved and merged the interview/research/save/activation design in PR #48.                                                                                                                                            |
| 5C1. Setup prompt and safe creation | T-039 In Review / Now          | PR #50 includes the disclosed interview/research prompt and exact-confirmed, fixed-path create-only save. Local validation passed; CI and supported-client confirmation are pending.                                            |
| 5C2. Update and activation          | T-040 Open / Now                 | Add safe reviewed replacement/recovery and separate explicit in-chat activation/deactivation; activation must not retrieve private text.                                                                                      |
| 5D. Automated code scanning         | T-036 Open / Now                 | Existing CI scans repository history for secrets and runs `npm audit`; weekly Dependabot updates are configured. CodeQL and GitHub alert/push-protection settings remain to be verified. Complete before v1.                  |
| 5E. Guided photo-based drafts       | T-037 Open / P1                  | Define the complete field set and deliver a conversational, form-like workflow with suggestions, focused questions, seller corrections/feedback and an iterative reviewable draft. No automatic Etsy creation or publication. |
| 5F. Requested market research       | T-038 Open / P1                  | On request, research comparable prices and seasonal/marketing options with sources, dates, reasons and limitations. No automatic price or campaign changes.                                                                   |
| 6. Release-ready and publication    | In Progress (planning only)      | T-012 exact candidate, checks, risk disposition/docs reconciliation, then separately authorized publication.                                                                                                                  |

**Current status:** T-031 Mac usefulness and guarded-edit acceptance is complete. The owner found the private-guidance review useful; an exact approved edit was applied, verified, and audited. T-035 confirmation wording and follow-through passed Mac owner review and merged in PR #44; the test-only proposal was not applied. T-025 remains deferred. The owner approved T-034's interview/research/save/activation design, merged in PR #48. T-039 implements the generic setup prompt and safe create-only save; T-040 covers safe replacement and the separate in-chat activation action. The owner clarified V1 also includes complete photo-based listing drafts, separate reviews of existing listings, and on-request comparable pricing and seasonal/marketing research. T-037/T-038 track those workflows; broad listing/pricing management remains longer-term vision. T-012 final product acceptance and publication preparation remain open.
Chunk 2B adds [eight fabricated cases, evaluation checks/rubric and recorded evidence](review-evaluation.md)
and an initial private local playbook outside Git. Eight private reviews passed declared checks
and self-review threshold; that same-assistant run is not an independent model benchmark or
owner acceptance. Full validation passed 242 offline tests; actual private file load/permissions
verified separately, not in CI. No private contents/project data copied to Git or connected records,
no settings/scope/credential/Etsy changes, no automatic private-mode activation. T-023 is Done
for its development criteria; later product/usefulness/edit/release gates remain. Do not start 3A
until the owner resumes.

Development version `1.0.0` is unpublished and incomplete for v1. No stable publication target
is selected; published `v0.1.0-alpha.1` is unchanged. The server design remains client-neutral;
current v1 acceptance is macOS/Codex Desktop. Other clients have not been verified. T-020/T-021/T-022
remain Backlog/P2; assess their relevance to the final write-capable product at release review.
Delegated access remains low-priority backlog. No website/setup detour or destructive recovery
exercise is introduced by this plan.
