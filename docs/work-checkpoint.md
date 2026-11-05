# Resumable v1 work checkpoint

Updated 5 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- T-033 merged in PR #35 as `265995f1a08da916c09c1f831de27c58fa86a701`. T-011, T-028, T-032 and
  T-033 are complete.
- T-033 updated the README, package description, agent guidance, architecture, setup/review docs,
  active delivery records and steering summary. The project describes a local STDIO MCP server;
  Codex Desktop/macOS remains the current v1 acceptance target. Other clients are not claimed as
  verified. No runtime behavior changed.
- T-029 durable local audit records completed in PR #37, squash commit
  `e6a71f704fa938248b7e938115ea316d96eb398c`. The implementation includes the isolated audit store,
  local path setting/CLI, operator guide and temporary-directory safety/failure tests. The store is
  not connected to Etsy calls; no live edit or real audit record was created.
- Local `npm run validate` passed formatting, lint, types, build and **260/260 offline tests** with
  loopback enabled; focused audit/config/command tests passed 25/25. PR #37 head
  `bc1c8b5fd52bd608692119825fd7487c31d589b2` passed all five checks in run 41992904637: secret scan
  and Node 24/26 validation on macOS/Windows. A Windows-only test fixture was made deterministic;
  runtime behavior did not change. PR #35's final head also passed all five checks in run 41986463564.
- Current branch: `codex/t-029-closeout`, based on main at `e6a71f704fa938248b7e938115ea316d96eb398c`;
  documentation closeout is uncommitted and no PR is open yet. The local requirements mark T-029
  Done; the connected tracker row and steering summary also mark it Done and were read back. No owner
  action is required. Exact next action: review and commit this focused docs diff, open its PR, merge
  after all checks pass, then stop. Next chunk is T-030; do not start it automatically.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
