# Resumable v1 work checkpoint

Updated 5 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- T-030 guarded apply/reconciliation is complete. PR #39 merged to `main` as
  `dd77876d52c0a93db48bf95d61d0ca25f248f817` from head
  `3909c0cc13d1714dd28c337fd81776beac71acfa`. It adds a fixed listing update adapter, separate
  edit-scope token storage and refresh state, explicit enable/disable commands, one-use apply
  orchestration and audit-backed reconciliation. Approval is requested during proposal preparation;
  the later apply call consumes that approval once without opening a second form.
- `npm run validate` passed with loopback enabled: formatting, lint, TypeScript, build and
  **287/287 offline tests**. CI run 42084391803 passed all five checks: secret scan and Node 24/26
  validation on macOS/Windows. The initial Windows-only file-identity fixture issue was corrected
  and covered by the rerun. No OAuth grant, live Etsy request or listing change was performed.
- Documentation and tracking closeout merged in PR #40 as `8496625073a83d65bb8108489a29a25bd435b109`
  from head `4d6991a87c0ae73d47f6e3c32498b8223bf48398`. Its CI run 42086762473 passed all five
  checks; Prettier and `git diff --check` passed locally. Main is synchronized at `8496625`.
- The T-030 tracker row is Done and links PR #39; its evidence and the current steering record were
  read back. The local matrix, README, operator guides, readiness/phase plan and this checkpoint
  agree that T-030 implementation/verification is complete and T-031 owner acceptance is separate.
  No owner action was needed for T-030.
- Next planned chunk: Phase 5A/T-025 measurement; T-031 Mac/usefulness acceptance follows. Do not
  infer live acceptance or publication from repository checks.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
