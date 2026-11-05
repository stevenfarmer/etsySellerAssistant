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
- Current numbered chunk: **4B / T-029 durable local audit records** on
  `codex/t-029-audit-durability`, based on clean `main` at `979efe9881319f3b297c152decb986d6b43d2e44`.
  No PR yet. The isolated store, local path setting/CLI, operator guide and temporary-directory tests
  are in progress. The store is not connected to Etsy calls; no live edit or real audit record was
  created. No owner action is currently required.
- Pre-change `npm run validate` passed formatting, lint, types, build and **248/248 offline tests**
  with loopback enabled. In this managed environment callback tests require loopback permission;
  run future validation with loopback enabled from the outset. PR #35's final head
  `e1a18e267992b0f9313ea125b9c5089fc206be19` passed all five checks in run 41986463564.
- T-029 is In Progress in the connected tracker; the steering document has been updated. Readback
  and final verification remain. Exact next action: finish audit safety tests/docs, run full
  `npm run validate` with loopback enabled, review, then open and complete a focused PR with checks,
  merge and synchronize final evidence. Do not start T-030 automatically.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
