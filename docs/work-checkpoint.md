# Resumable v1 work checkpoint

Updated 4 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Prior completed chunk: 2B/T-023, PR #25 merged as
  `4300b849d33ea115a7ee295ff486185c54f92eb0`; 242 offline tests and all five PR checks
  passed. See [evaluation evidence](review-evaluation.md).
- Completed chunk: **3A / T-011 guarded-edit design and security review**. The technical
  baseline is in [guarded-edit-design-review.md](guarded-edit-design-review.md), merged in PR
  #26 as `2263e722f6e790bb31fa1883d1655d69ba32af99`. Requirements, phase gates, ADR, listing
  review, and connected records were synchronized. T-011 is Done for the design review.
- Verification: `npm run validate` passed formatting, lint, typecheck, build, and **242/242
  offline tests**. The first sandboxed run could not bind loopback for 9 callback tests; the
  rerun with local loopback access passed. `git diff --check` passed. All five PR checks passed.
  No test contacts Etsy or mutates a shop.
- No runtime, OAuth scope, credentials, live Etsy access, or publication changed. PR #27 and
  PR #28 contain checkpoint-only synchronization; all five checks passed on each. PR #29
  aligned project requirements and records with the tool's scope; it merged as
  `ef6c5f9944472e8d0027bbd85995c8ccbe56bfe6` after all five checks passed. Connected tracker
  and steering updates were read back on 4 November.
- At the final local check, branch `codex/project-record-scope-cleanup` was clean at
  `4cd11870d8247338cbe2ae53710f843785a4acb8`; its tree contains the PR #29 changes. Recheck
  and synchronize local main before further repository work.
- Exact next chunk: **4A / T-028 proposal and approval implementation**, beginning offline.
  Verify host-mediated confirmation behavior before relying on it; keep write capability
  closed until the Phase 4A–4C technical tests/reviews pass. Any concrete credential, scope,
  live-write, or publication step still requires separate authorization. Stop after one chunk.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
