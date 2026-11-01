# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Last completed feature/scope record: PR #19, `db9858098a27afb684dc725add9521a15a94b43c`.
  Read foundation delivered; expanded intelligence/editing not implemented. All five main checks
  passed at plan start. Accepted historical Mac/recovery evidence remains scoped as documented.
- Current deliverable: gated plan and private-playbook requirements, tracked under T-012 and
  T-026/T-027. Its PR and connected records hold final merge/check evidence. This is planning,
  not completion of phase 1.
- **Next chunk: 1A / T-026 — private playbook storage.** Read ADR 0006 and the M8/UC-11 criteria.
  Define exact local configuration/file contract; add only the generic public template and
  fabricated loader/tests. Do not write the real private sales playbook in this first chunk.
- Open implementation branch/PR at planning start: none. No implementation begun in this change.
- Actual local planning validation and final CI results: recorded in the planning PR/T-012.
  Prior baseline: 200 offline tests; do not claim those verify future features.
- Blocking owner action now: none. Later concrete live/credential and publication authorizations
  remain separate. No current token reset, live read or connection reset is needed.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
