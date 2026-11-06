# Resumable v1 work checkpoint

Updated 6 November 2026. Follow the [gated plan](v1-phase-gates.md) and
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
- T-035 confirmation UX is complete. The seller form now says Accept approves the exact update and
  the assistant will apply it to Etsy and verify the result; the untrusted-listing safety rule stays
  in tool guidance. The owner reviewed and accepted the revised Mac prompt with a test-only proposal.
  A fresh read confirmed the listing stayed unchanged because no apply call was made. PR #44 merged
  as `333e6af9275c5af602bdee2e3e7112684a828ac9`; CI run 42132738820 passed all five checks.
- PR #48 merged as `23e1a0e0318783ab56240c9566421fa17cad9bfe` after all five checks passed on
  reviewed head `52fde35efe36ff472b9511cd12a74f13f49437ea` (CI run 42146691927). The owner approved
  the revised T-034 setup flow. T-034 is Done for design; T-025 remains deferred. T-036 security
  scanning/settings, T-037 photo-based listing drafts and T-038 requested pricing/marketing research
  remain open.
- T-039 implementation merged in PR #50 as `48f8a273a89b1416812da633b2ed7dcfa3271347`; reviewed
  branch head `76c55c660012daf6a7a6e680c5575e45c52f2a95` is based on main
  `23e1a0e0318783ab56240c9566421fa17cad9bfe`.
  It adds a generic interview/research prompt and a fixed-path, host-confirmed create-only save.
  Loopback-enabled `npm run validate` passed (292/292 tests); formatting, lint, TypeScript, build
  and `git diff --check` passed. The first CI run failed formatting because the requirements file
  was truncated during upload; the complete file was restored. Final CI run 42251072657 passed all
  five checks on reviewed head `76c55c660012daf6a7a6e680c5575e45c52f2a95`. No private guidance, Etsy
  data or credentials were read; no Etsy calls or writes occurred. Save is create-only and does not
  activate guidance.
- Requirements/status closeout merged in PR #51 as `0735b72137df89d857b181efd35d66c05f4f4b2c`;
  all five checks passed in CI run 42253112633.
- T-039 follow-up merged in PR #52 as `e849c1add5f2d976b7d1c4a762633540785d2a45`; all five CI
  checks passed in run 42256015866. Node 24 macOS passed after the original queued job was cancelled
  and retried. Loopback-enabled local validation passed 292/292 tests.
- T-039 remains In Review for supported-client confirmation. The owner selected one in-chat
  Save/Don't save choice after the host form failed to appear. The updated tool requires
  `ownerConfirmed: true`, which records the assistant's assertion and cannot be independently
  verified by the server. The fixed-path save remains create-only. No real guidance was saved.
  Loopback-enabled `npm run validate` passed: formatting, lint, TypeScript, build and 292/292
  tests. PR and CI for the in-chat flow are still pending. Next: open a PR from current main,
  wait for all required checks, merge, restart the local alpha, then test the decline path without
  calling the save tool. Use real guidance only after owner review and an explicit Save choice.
- T-040 remains Open. The owner wants manual editing of the fixed-path file and agent-assisted
  revisions. Agent replacement must be explicitly requested, shown in full, confirmed with one
  Replace/Don't replace choice, and preserve a private recovery copy. The tracker records this
  addition. Separate in-chat activation/deactivation remains in scope; activation must not read
  the file.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
