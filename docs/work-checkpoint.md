# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Prior completed plan: PR #20, `e8d5531aca9f5e009b4c1617ff9766368b0a7c73`;
  live main/PRs/CI, steering and tracker verified at chunk 1A start. No open PRs then.
- Current deliverable: **1A / T-026 private playbook storage**. Read-only bounded loader,
  resolver, generic template and Git-ignore defense implemented. No runtime/CLI/MCP integration,
  actual private strategy file creation/read or Etsy/credential action. See [storage contract](private-playbooks.md).
- Actual validation: `npm run validate` passed **212 offline tests** and static checks,
  including 12 new private-playbook cases. The implementation PR and T-026 record exact
  reviewed/merged commits, final CI, connected readbacks and checkpoint completion. Check those
  live records before treating the merge gate as passed.
- **Next chunk after this PR is merged and checkpointed: 1B / T-027 — standard MCP guidance
  delivery.** Read the storage contract; design one explicit read-only client-neutral contract,
  then integrate the bounded reader, explicit source labeling and safe missing/error handling.
  No arbitrary path input, startup/status content reads or safety override. Verify supported
  Codex discovery/invocation with fabricated content. Do not implement editing or the private
  owner strategy in 1B; those remain later chunks.
- Current feature branch: `codex/private-playbook-storage`; final PR/merge/head and clean-main
  status are recorded in T-026 and that PR. This source checkpoint cannot embed its own merge SHA.
- Blocking owner action: none. Stop after 1A checks/merge/tracking; do not start 1B automatically.
  Future live/credential and publication steps retain concrete authorization gates.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
