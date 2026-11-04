# Resumable v1 work checkpoint

Updated 4 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Last completed chunk: **3A / T-011 guarded-edit design and security review**. The design baseline
  merged in PR #26 as `2263e722f6e790bb31fa1883d1655d69ba32af99`; see
  [the review](guarded-edit-design-review.md).
- Current chunk: **4A / T-028 proposal and approval**, implemented on branch
  `codex/phase-4a-proposals` and merged in PR #31 as
  `4b7e49135418d85f4c7c2f97a668944a26c90099` from reviewed head
  `2a4a79c40a1dbbfec77b8e2fad3609a5c93e8890`.
- Delivered in the unpublished alpha: bounded in-memory proposals tied to exact changed fields,
  configured identity and listing modification timestamp; fresh identity/value check immediately
  before MCP form elicitation; five-minute expiry; one-use and concurrent-call protection; no apply
  tool or update transport. The default server remains status-only.
- Local verification: `npm run validate` passed format, lint, typecheck, build and **248/248 offline
  tests**; `git diff --check` passed. All five current-head CI checks passed, including Node 24/26
  macOS and Windows validation and the repository secret scan. Mac checks passed after rerun
  following a GitHub Actions incident.
- Connected Project Tracker and steering document updated and read back on 4 November 2026;
  T-024 is In Progress and T-028 is In Review. No external mutation, credential/scope change or
  publication.
- Direct Codex Desktop form-confirmation behavior remains unverified. The connected Etsy MCP in
  this chat does not expose the proposal/approval tools; the owner must use the local development
  alpha entry point (`dist/src/alpha.js`) in Codex Desktop. The alpha performs listing reads, but
  has no operation that applies an edit.
- Exact next action: in a fresh Codex Desktop chat using the local development alpha, list active
  listings, prepare a proposal for one returned listing, then approve its proposal ID. Confirm the
  form displays the exact listing and before/after values and that explicit acceptance returns
  `status: approved_for_later_apply` with `listingChanged: false`. Decline/cancel must not report
  approval. Keep T-028 In Review and do not begin Phase 4B until this client check passes.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
