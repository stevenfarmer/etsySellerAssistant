# Gated delivery plan to release-ready v1

Updated 1 November 2026. Owner-approved direction: useful sales-oriented recommendations,
guarded approved title/description/tag edits, and a reusable connector with separately stored
private guidance. Deliver in small resumable chunks to accommodate token limits. This plan
authorizes planning and normal offline development/PR work, not live Etsy/credential actions
or release publication. See [current requirements](requirements-and-acceptance.md),
[private playbook decision](decisions/0006-private-playbooks-and-delivery-checkpoints.md),
[review requirements](intelligent-listing-review.md) and [tracking process](project-tracking.md).

## Starting point

Live main verified at `db9858098a27afb684dc725add9521a15a94b43c` (PR #19), with all five
main checks passing and no open PRs at planning start. Local checkout was clean. The connected
steering document and tracker agree: reads/setup/recovery foundation delivered; intelligence
and editing remain incomplete. Recheck live state when resuming; this is dated evidence.

Only `v0.1.0-alpha.1` is published and must remain unchanged. Development version `1.0.0`
is unpublished and is not a completed v1 candidate. Existing Mac owner/read/restart and scoped
isolated recovery acceptance remain valid; no need to repeat destructive recovery exercises.
The last runtime baseline passed 200 offline tests. New chunks must record their actual results.

## Chunk size and stopping rules

- Default: one numbered chunk per continuation, normally one focused PR. Stop after its
  validation, review/merge, CI and documentation/tracker checkpoint. A phase can span several
  chats or token windows; do not automatically start the next chunk.
- Size by one independently testable outcome, not a promised token count or time estimate.
  Usage quotas/reset times are not reliably observable here. If a chunk grows, split it into
  named subchunks in the plan/tracker before expanding implementation.
- Reserve the end of each work session for checks and documentation. Prefer a smaller finished
  deliverable to starting additional features. Required validation/security gates still apply.
- A failed check, unavailable source or unfinished review leaves the chunk open. Record branch,
  PR/head, failures, changed files and exact next action; never merge to manufacture a checkpoint.
- At an explicit pause, save current evidence and stop. Work resumes only when the owner asks.
  If a usage limit interrupts abruptly, inspect actual Git/PR/CI state and the checkpoint before
  changing files; a missing final chat message is not evidence of completion.

## Phases, deliverables and gates

Chunk 1A storage is implemented in its focused PR; see [the storage contract](private-playbooks.md)
and [checkpoint](work-checkpoint.md) for evidence. Chunk 1B implementation and automated STDIO checks are delivered, and actual Codex discovery/default-generic
invocation passed after restart on 1 November 2026 (T-027 Done). Later chunks remain planned. Each includes relevant automated coverage for
code changes, `npm run validate`, focused review, required CI and synchronized tracking.

| Phase / chunk                                       | Task                | Small deliverable                                                                                                                                                                                                                                     | Gate to the next chunk / phase                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1A — Private playbook storage                       | T-026               | Generic tracked template plus explicit private-file configuration outside the repository; safe bounded loader, clear missing/invalid-file behavior and no overwriting custom content.                                                                 | Fabricated temporary-file tests cover valid/missing/oversized/unsafe inputs; private content excluded from Git, logs, errors and public artifacts. Storage design and data disclosure documented.                                                                                                                |
| 1B — Standard guidance interface                    | T-027               | Read-only MCP guidance delivery using one interoperable contract; no arbitrary path input. Confirm Codex discovery/invocation with fabricated guidance; optional native prompt/resource support only where verified.                                  | Guidance is actually available to the supported client; loading is explicit, startup/status does not read it. Custom text cannot bypass server safety/approval rules. No claim that every client automatically loads it.                                                                                         |
| 2A — Useful review workflow                         | T-023               | Public generic workflow/brief structure and proposed-copy validation; listing facts, buyer context, reasons, uncertainty, keep-unchanged option and unknown-fact questions.                                                                           | One complete fabricated listing review produces clear actionable drafts without invented facts/metrics. Relevant hard constraints validated against current API documentation.                                                                                                                                   |
| 2B — Recommendation evaluation and private playbook | T-023               | Fabricated evaluation cases/rubric, source-date maintenance and a private local owner playbook developed separately from the generic template.                                                                                                        | Grounding, hostile content, sparse/conflicting facts and already-good listings evaluated. Public diff contains generic instructions only; private file remains excluded and is not copied into test fixtures, PRs or connected docs. Record technical results separately from later owner usefulness acceptance. |
| 3A — Editing design/security review                 | T-011               | Concrete OAuth/tool contracts, permission transition, approved fields, human approval binding, stale/replay/concurrency rules, audit durability and uncertain-outcome recovery; current Etsy API/terms review.                                        | Record the reviewed design, findings and resolutions. No unresolved blocking issue before ANY phase-4 write-access implementation. Owner read-only risk acceptance is not a waiver for new capabilities; any required owner policy decision is explicit.                                                         |
| 4A — Proposal and approval                          | T-028 (under T-024) | Deterministic exact before/after proposal, identity/field binding, expiry/replay handling and an explicit approval mechanism. No live transport.                                                                                                      | Fabricated positive/negative/stale/replay tests show an AI instruction or changed proposal cannot confer approval. Only approved values can reach the apply boundary.                                                                                                                                            |
| 4B — Local audit durability                         | T-029 (under T-024) | Append-only JSONL intent/outcome records at the already agreed ignored Drive-sync location; single writer, permissions and monthly rotation.                                                                                                          | Temporary-directory tests cover crash/write/rotation/concurrency failures; failed pre-write audit prevents mutation. Outcome-record failure is reported without hiding a successful/uncertain Etsy result. No real audit data in Git.                                                                            |
| 4C — Guarded apply and reconciliation               | T-030 (under T-024) | Fixed write adapter/orchestration, reviewed least-privilege authorization transition, identity/stale recheck, approved-field apply, verification and uncertain-outcome reconciliation/manual restoration.                                             | Offline integrated tests cover success, denial, stale data, wrong shop, missing audit, lost response and verification failure. No blind retries; existing healthy connection unchanged. Document residual API race limits and disable incomplete live paths.                                                     |
| 5A — Measurement workflow                           | T-025               | Optional owner-provided aggregate Stats baseline/change/comparison with correct metric scope, dates and confounders; useful without Stats.                                                                                                            | Fabricated examples avoid invented analytics, unsupported causality and sales guarantees. No orders/buyer-data or automatic analytics API access. Waiting for actual sales uplift is not a v1 gate.                                                                                                              |
| 5B — Authorized Mac acceptance                      | T-031               | Review useful output in Codex with the private playbook; run only a concrete separately authorized scope/credential/live-edit drill after offline gates. Prepare exact listing/fields/values, before-state capture, recovery and cleanup steps first. | Record owner usefulness and Mac edit/verification acceptance with sanitized pass/fail evidence. Confirm audit/recovery behavior and limits. Without required authorization/evidence this gate stays open; passing offline tests does not claim live write acceptance. No routine destructive recovery retest.    |
| 6A — Release-ready candidate                        | T-012               | Versioned exact candidate; locked-install/build rehearsal, full validation/CI/secret scan, current audits, risk dispositions, operator/update/recovery guides and complete documentation/steering/tracker reconciliation.                             | All required features accepted; T-008 limits and T-020/T-021/T-022 risks explicitly dispositioned for the changed write-capable product. Fix blocking issues; retain justified follow-ups. No unresolved release discrepancy; owner judges business usefulness, maintainer owns technical evidence.              |
| 6B — Authorized publication                         | T-012               | Show exact version/commit, release notes and remaining limits; publish only with concrete owner authorization, then verify tag/artifact/install guidance and connected records.                                                                       | Stable v1 exists at the authorized commit and post-publication checks are recorded. Preserve all already published tags. Without publication authorization, stop at release-ready.                                                                                                                               |

Phase 3 may be investigated earlier if needed, but its approval does not bypass unfinished
phase-1/2 gates. The default sequence above keeps each continuation predictable. T-024 is an
umbrella acceptance record; T-028/T-029/T-030 carry its separate implementation chunks.

## Definition of release-ready

A seller can configure private guidance, review grounded proposed copy, explicitly approve and
apply only title/description/tag changes, inspect a reliable audit/outcome and understand recovery.
Mac/Codex acceptance, required automated checks and security/design review are complete. The
exact candidate, docs, risks and connected records agree. Publication is a separate final step.

The standard MCP design remains client-neutral. Supported v1 acceptance is macOS/Codex Desktop;
installation/acceptance of other clients follows v1. Do not add vendor-specific assumptions that
prevent later use. Delegated access stays low-priority backlog. Premium-playbook licensing,
payments, hosted services, automated analytics and guaranteed sales results are outside this plan.

## Resume and progress record

[Work checkpoint](work-checkpoint.md) contains the completed/current/next chunk, open work,
verification and exact next action. It contains no private guidance or seller data. The tracker
holds task state and linked PR/commit evidence; the matrix holds requirements/acceptance.
Update all affected records within each chunk and read back connected edits before claiming done.

To resume, the owner can simply say **“Continue the next v1 chunk.”** That requests one chunk,
starting with live verification of main/PRs/CI and the connected steering/tracker, then the
checkpoint. Do not require a lengthy handoff prompt or routine merge approval.
