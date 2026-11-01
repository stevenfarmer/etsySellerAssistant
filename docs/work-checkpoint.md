# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Prior completed gate: phase 1/T-026/T-027, acceptance PR #23,
  `a196366993e876626ebd30e9763599074f86e107`. Live main/PRs/CI and connected records verified
  at 2A start; local checkout clean, no open PRs. Retain scoped real Codex generic acceptance.
- Current deliverable: **2A / T-023 workflow and validators**. Generic review sequence, blank
  brief, local three-field draft preflight and complete fabricated manual review. Alpha exposes
  `validate_listing_draft`; default scaffold unchanged. No Etsy/credential/filesystem I/O or
  persistence in the checker; output is counts/issues, not draft text, truth or edit approval.
- Actual validation: `npm run validate` passed **234 offline tests**/static checks, including
  12 new draft tests and actual alpha STDIO integration. Current API character rules and official
  title/tag limits checked through documentation only; application description bound is separately
  labeled. Broader AI evaluation and private playbook not implemented. No actual private strategy
  was read or written. Implementation PR/T-023 hold final head/merge/CI and connected readbacks.
- **Next chunk after 2A checks/merge: 2B / T-023** — broader fabricated evaluation cases/rubric,
  source-date maintenance and a private owner playbook outside Git. Read review requirements and
  the [2A contract](draft-review-workflow.md). Never move private instructions/facts/drafts into
  public template, fixtures, PRs or connected documents. Keep owner usefulness separate from tests.
- T-023 remains In Progress until its 2B criteria are met; T-012 stays In Progress. This source
  checkpoint cannot embed its own merge SHA; verify final PR/task evidence when resuming.
- Feature branch: `codex/review-workflow-validators`; final clean-main status in the PR/T-023.
- Blocking owner action: none. Stop after 2A. The new tool/workflow loads on future process
  restart; no new 2A native-client gate is implied. Live/private credential and publication
  authorizations remain separate. Do not begin 2B automatically.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
