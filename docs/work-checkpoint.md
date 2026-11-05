# Resumable v1 work checkpoint

Updated 5 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Current main is `248545eba5bce8ac3ac7fa55eb0c66b65bce625d` (PR #34, T-032 checkpoint closeout).
  PR #34 is merged; no open PR was found. T-011, T-028 and T-032 are complete.
- T-032 delivered the readable single-choice confirmation flow. The owner accepted it on Mac; a
  fresh listing read confirmed no listing change. All five PR checks passed and the local
  validation run passed 248/248 offline tests. No apply tool or update transport exists.
- Current chunk: **T-033 client-neutral product wording and editorial cleanup**, on branch
  `codex/t-033-client-neutral-editorial`, based on current `main`. The README, package description,
  architecture, setup/review guides, agent instructions and active delivery records are being
  aligned. The server is described as an MCP/STDIO service; Codex Desktop/macOS remains the current
  v1 acceptance target. No cross-client support claim or runtime behavior change is intended.
- Local verification: `npm run validate` passed format, lint, typecheck, build and **248/248 offline
  tests** when run with loopback permitted for callback tests. `git diff --check` passed. No Etsy
  requests, listing changes, credential/scope changes or publication occurred.
- Exact next action: finish the T-033 documentation review, synchronize the connected tracker and
  steering record, then commit and open a focused PR. Await CI/review before merge. T-029 audit
  durability remains the next numbered implementation chunk after T-033 closes.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
