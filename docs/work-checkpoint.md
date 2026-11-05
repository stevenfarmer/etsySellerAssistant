# Resumable v1 work checkpoint

Updated 5 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- T-033 merged in PR #35 as `265995f1a08da916c09c1f831de27c58fa86a701`; T-029 merged in PR #37 as
  `e6a71f704fa938248b7e938115ea316d96eb398c`. Their scoped acceptance evidence is retained above
  in the commit history and requirements matrix.
- T-030 is in progress on `codex/t-030-guarded-apply`, based on `main` at
  `9b5f3bbad36d0b29f9f3c573b2f7a634f00bd5ee`. PR #39 is open at implementation commit
  `24e3b65179b3c56d2975a75872cc347b63b47883`. It adds a fixed listing update adapter, separate
  edit-scope token storage and refresh state, explicit enable/disable commands, one-use apply
  orchestration, audit integration and offline tests. Approval is requested during proposal
  preparation; the later explicit apply call consumes that approval without opening a second form.
- Local `npm run validate` passed after making the private-playbook file identity fixture
  deterministic across platforms: formatting, lint, TypeScript, build and **287/287 offline tests**.
  PR run 42081418077 passed secret scanning and Node 24 macOS; both Windows checks exposed the same
  fixture failure, and Node 26 macOS was canceled by matrix fail-fast. The correction is now
  validated; commit and push it, then monitor the latest PR run. The test preload blocks external
  Etsy calls; no OAuth grant, live Etsy request or listing change was performed.
- The connected tracker row and steering record currently show T-030 In Progress, read back before
  implementation. No owner action is required now. Exact next action: commit and push the validated
  Windows fixture correction, then record the exact PR/head and watch all checks.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
