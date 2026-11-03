# Resumable v1 work checkpoint

Updated 3 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Prior completed chunk: 2B/T-023, PR #25 merged as
  `4300b849d33ea115a7ee295ff486185c54f92eb0`; 242 offline tests and all five PR checks
  passed. See [evaluation evidence](review-evaluation.md).
- Current chunk: **3A / T-011 guarded-edit design and security review**. The owner explicitly
  resumed this chunk on 3 November. Conditional technical baseline is in
  [guarded-edit-design-review.md](guarded-edit-design-review.md), with corresponding
  requirements, phase-gate, ADR, and listing-review updates. No runtime, scope, credentials,
  live Etsy access, or publication changed.
- Blocking finding: Etsy API Terms sections 3, 5.18, 5.24, and 5.25 create an unresolved
  written-authorization/app-purpose question for AI analysis and transfer of API-sourced
  listing content, as well as the proposed write capability. This is not a legal conclusion.
  No Etsy contact was made. Do not begin phase 4 or send Etsy data to an AI provider until
  written Etsy guidance and owner disposition are recorded. Codex's exact approval UX must
  also be verified before relying on MCP elicitation.
- Validation: an ordinary sandboxed `npm run validate` reached 233/242 tests; 9 loopback
  callback-server tests could not bind. The same required command then passed with approved
  local loopback access: formatting, lint, typecheck, build, and all **242/242 offline tests**.
  `git diff --check` passed. No test contacts Etsy or mutates a shop.
- Current branch: `codex/guarded-edit-design-review`, based on live main
  `4300b849d33ea115a7ee295ff486185c54f92eb0`. The design/docs/checkpoint edits are locally
  committed locally; push, PR, and final CI are pending. Connected tracker/steering
  updates and their readback are also pending. Keep T-011 In Progress until the external
  blocker and client evidence are resolved.
- Exact next action: review the complete local diff, commit the documentation-only 3A
  baseline on this feature branch, push/open a focused PR, and wait for required review/CI.
  Then update Work Tracker T-011 and the current steering record with the PR and actual
  evidence, read both back, and finalize this checkpoint. Stop after this chunk; phase 4 is
  closed pending written Etsy guidance/approval and owner disposition.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
