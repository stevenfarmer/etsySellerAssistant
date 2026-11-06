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
- T-035 confirmation UX is complete. The seller form now says Accept approves the exact update and
  the assistant will apply it to Etsy and verify the result; the untrusted-listing safety rule stays
  in tool guidance. The owner reviewed and accepted the revised Mac prompt with a test-only proposal.
  A fresh read confirmed the listing stayed unchanged because no apply call was made. PR #44 merged
  as `333e6af9275c5af602bdee2e3e7112684a828ac9`; CI run 42132738820 passed all five checks.
- T-034 is In Review / Now. The functional proposal is in
  [private-guidance-setup-design.md](private-guidance-setup-design.md). It proposes a disclosed,
  optional AI-led interview, owner-checked draft, exact host confirmation, fixed-path local save,
  safe explicit replacement, tailored research, and a separate in-chat private-mode opt-in. The
  owner requested research modeled on topics in the private guidance; research details remain private.
  No code or file-writing tool has been implemented. T-025 remains deferred and is not a current
  release gate.
- PR #46 merged the T-034 design proposal to `main` as
  `acb045dbf71b1c72d2898c69c6abc3d4727b063e`; PR #47 synchronized the checkpoint as
  `6b22cc707af2e141b2d05fee5ce495877da16c5f`. Their CI runs 42137972888 and 42139113603 each
  passed all five checks, including macOS and Windows on Node 24 and 26 and the secret scan. The
  owner approved a separate explicit in-chat opt-in after save and requested tailored research based
  on topics in the private guidance. Revised proposal is in PR #48 from
  `codex/t034-research-activation`, head `a9b67752f031cbddd53e3f8497a9b0c8b511b02a`. It adds an
  owner-approved research plan, dated citations, generalized non-identifying queries, concise
  options/trade-offs rather than operational instructions by default, findings in the private
  draft, and separate save / turn-on / explicit retrieval steps. No implementation has started.
  PR CI run 42141458665 passed all five checks, including Node 24/26 on macOS/Windows and the secret
  scan. T-034 remains In Review pending owner review of this revised flow. T-025 remains deferred.
- T-036 tracks the separate pre-v1 security follow-up. Current CI scans Git history for secrets and
  runs `npm audit`; weekly Dependabot updates are configured. No CodeQL workflow was found, and
  GitHub's repo-level secret-scanning, push-protection, and Dependabot-alert switches could not be
  verified through the connected API. Add code scanning and verify those settings before v1; do not
  describe the existing controls as complete security coverage.
- The PR #48 tracker updates, including T-034's new design scope and T-036, were read back. The
  owner clarified that research should provide concise decision support, not draft business-specific
  operating procedures unless requested. Exact next action: update the proposal/checkpoint, run
  CI, then review PR #48 with the owner. If accepted, merge the design update; implementation still
  requires that acceptance and separate verification work.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
