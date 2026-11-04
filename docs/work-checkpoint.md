# Resumable v1 work checkpoint

Updated 4 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Last completed chunk: **3A / T-011 guarded-edit design and security review**. The design baseline
  merged in PR #26 as `2263e722f6e790bb31fa1883d1655d69ba32af99`; see
  [the review](guarded-edit-design-review.md).
- Current chunk: **4A / T-028 proposal and approval**, PR #31, branch
  `codex/phase-4a-proposals`. Implementation commit `4897f077de94adbd9e5247dbacdf65311bd01df7`.
  The checkpoint update is being added to that same PR; use the live PR head for current CI.
- Delivered in the unpublished alpha: bounded in-memory proposals tied to exact changed fields,
  configured identity and listing modification timestamp; fresh identity/value check immediately
  before MCP form elicitation; five-minute expiry; one-use and concurrent-call protection; no apply
  tool or update transport. The default server remains status-only.
- Local verification: `npm run validate` passed format, lint, typecheck, build and **248/248 offline
  tests**; `git diff --check` passed. No external mutation, credential/scope change or publication.
- PR #31 CI at the last live check: repository secret scan and both Windows checks passed; both
  macOS checks remained queued. Do not record queued checks as passed. The connected tracker and
  steering document were updated and read back; T-024 is In Progress and T-028 is In Review.
- Direct Codex Desktop form-confirmation behavior is not yet verified. Unsupported, declined,
  cancelled, stale, expired or replayed proposals fail closed. No apply operation exists.
- Exact next actions: wait for all five checks on the current PR #31 head; review their final
  results; merge only after required checks pass; synchronize this checkpoint with the merged
  commit and read back tracker/steering. Then verify in Codex Desktop that the exact proposal is
  presented and only explicit acceptance returns `confirm: true`. Keep T-028 In Review and do not
  begin 4B until that client check passes. Phase 4B is not started automatically.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
