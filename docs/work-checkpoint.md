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
  checks; Prettier and `git diff --check` passed locally. Earlier checkpoint PR #41 merged as
  `f23d220f703a1f19631b7e49627b7602dfa3dfb7` from head `c4b2f80bcf714d3c4b3dd71d13a6859a8fb95324`;
  CI run 42088042063 passed all five checks; local `main` then pointed through PR #41.
- The T-030 tracker row is Done and links PR #39; its evidence and the current steering record were
  read back. The local matrix, README, operator guides, readiness/phase plan and this checkpoint
  agree that T-030 implementation/verification is complete and T-031 owner acceptance is separate.
  No owner action was needed for T-030.
- Owner moved T-025 measurement design to the backlog on 5 November 2026 because repeat-item sales
  comparisons do not fit one-off handmade inventory. T-025 is not a current release gate.
- T-031 Mac acceptance is complete. The owner found the private-guidance review useful and explicitly
  authorized the edit grant and exact listing change. The host confirmation succeeded; the fixed
  apply flow reported success, a fresh read verified the approved fields, and the local audit
  outcome was recorded. No seller-specific content or audit record is retained in project files.
- T-035 is the active follow-up from the owner's review of the confirmation screen. Its first draft
  removes the model-safety warning from the seller-facing form and says that Accept approves the
  exact displayed change, after which the assistant immediately applies it to Etsy and verifies it. The tool
  description retains the untrusted-listing-text instruction and tells the assistant not to apply
  after decline, cancellation, unavailable confirmation or stale data. Offline tests and the
  revised Mac prompt review are still required; T-035 is not complete yet.
- T-034 remains Open / Next and follows T-035. It covers design of a user-led first-run interview,
  fact checking, private-document review and safe save/update to the existing fixed location; no
  implementation has started. T-025 remains deferred and is not a current release gate.
- Current branch: `codex/confirmation-copy-workflow`, based on `main` at
  `11dc9732be517646f942cbc75b9d252f0d395698`. T-034/T-035 connected tracker rows were read back;
  T-035 is In Progress and T-034 follows it. Formatting, `npm run validate` with loopback enabled
  and `git diff --check` passed; all 287 offline tests passed. The T-035 code and synchronized
  documentation are uncommitted; no PR exists. Exact next action: review the final diff, commit and
  push the focused branch, open a PR, then wait for CI and owner review of the revised confirmation
  wording before deciding whether T-035 is complete.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
