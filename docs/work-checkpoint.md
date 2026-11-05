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
- Local `npm run validate` passed formatting, lint, types, build and **248/248 offline tests** with
  loopback enabled for callback tests. PR #35's final head `e1a18e267992b0f9313ea125b9c5089fc206be19`
  passed all five checks in run 41986463564 (secret scan and macOS/Windows validation on Node 24/26).
  No Etsy requests, listing changes, credential/scope changes or publication occurred.
- The tracker and steering document record T-033 Done and PR #35's merge/check evidence; both have
  been read back. Next numbered chunk: **4B / T-029 durable local audit records**. Do not start it
  automatically. No live listing mutation is part of T-029.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
