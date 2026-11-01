# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Completed: **1B / T-027 guidance interface**, implemented in PR #22,
  `dad5cca9d93cb00d2d447f7522939034dd3d4088`. Live main/PRs/steering/tracker verified at
  client-check resumption; checkout clean, no open PRs.
- Real Codex client check passed 1 November 2026 after the app restart: the host advertised
  `get_review_guidance`; invocation with `{}` succeeded with `source: generic`,
  `selection: generic_mode`, `schemaVersion: 1` and nonempty guidance. No Etsy, credential or
  private-file read. This closes the specific pending phase-1 client gate, not owner acceptance
  of advanced recommendations or live edits. Private-mode coverage remains fabricated STDIO.
- Prior implementation validation: `npm run validate` passed 222 offline tests/static checks;
  all five PR/main checks passed. This documentation-only acceptance record has its own PR/CI
  evidence in T-027. No runtime behavior changed or private contents copied into records.
- **Next chunk: 2A / T-023 — useful review workflow and validators.** Read the review requirements;
  use bounded facts and generic buyer-brief structure to produce grounded proposals with reasons,
  uncertainty and keep-unchanged option. Validate relevant constraints using current API docs.
  Use fabricated inputs only. Real private strategy/evaluation expansion stays chunk 2B.
- T-026 and T-027 Done; T-012 In Progress. Final acceptance-record PR/head/merge/CI and local
  clean-main status live in T-027; this source file cannot embed its own merge SHA.
- Blocking owner action: none. Stop after recording this passed 1B gate; do not start 2A here.
  Live/credential and publication actions retain separate concrete authorization requirements.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
