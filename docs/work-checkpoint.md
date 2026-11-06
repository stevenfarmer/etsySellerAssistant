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
  optional AI-led interview, owner-checked draft, owner-approved research plan, exact host
  confirmation, fixed-path local save, safe explicit replacement, and a separate in-chat
  private-mode opt-in. No code or file-writing tool has been implemented. T-025 remains deferred.
- PR #46 merged the T-034 design proposal to `main` as
  `acb045dbf71b1c72d2898c69c6abc3d4727b063e`; PR #47 synchronized the checkpoint as
  `6b22cc707af2e141b2d05fee5ce495877da16c5f`. Their CI runs 42137972888 and 42139113603 each
  passed all five checks, including macOS and Windows on Node 24 and 26 and the secret scan. The
  owner approved a separate explicit in-chat opt-in after save and requested tailored research based
  on topics in the private guidance. Revised proposal is in PR #48 from
  `codex/t034-research-activation`, head `6e2ba30ffeb016388be7e50c68fee15fde03ae7d`. It adds an
  owner-approved research plan, dated citations, generalized non-identifying queries, concise
  concise findings/options/trade-offs rather than business-specific operating instructions or
  finished copy unless requested, and separate save / turn-on / explicit retrieval steps. No
  implementation has started. PR CI run 42142428469 passed all five checks, including Node 24/26 on macOS/Windows and the secret
  scan. T-034 remains In Review pending owner review of this revised flow. T-025 remains deferred.
- T-036 tracks the separate pre-v1 security follow-up. Current CI scans Git history for secrets and
  runs `npm audit`; weekly Dependabot updates are configured. No CodeQL workflow was found, and
  GitHub's repo-level secret-scanning, push-protection, and Dependabot-alert switches could not be
  verified through the connected API. Add code scanning and verify those settings before v1; do not
  describe the existing controls as complete security coverage.
- PR #48's latest scope commit is `812d4ded86a2cedad770a049fbdf1e85c6e1a6ab`; CI run 42145207012
  passed all five checks, including the secret scan and Node 24/26 validation on macOS/Windows.
  The current PR also includes checkpoint sync commit `5a31e03b2cb880b19f317d42858f911391553a18`,
  which passed run 42144737868. Markdown Prettier and `git diff --check` passed; this was
  docs/planning only, so no runtime tests were run. The connected steering document and tracker
  were updated and read back. A final checkpoint-only sync follows this scope commit; recheck the
  exact PR head and CI before resuming or merging.
  The owner clarified V1: complete listing drafts from owner-provided product photos; separate
  recommendations for each selected existing listing; and on-request research for comparable
  prices, seasonal sales and marketing/video/theme ideas. Broader listing/pricing management is
  future vision; no automatic creation, publishing or price change is implied. M9/M10 and T-037
  (photo-based drafts) / T-038 (requested research) are added. Exact next action: owner review of
  PR #48, especially the interactive listing-draft experience and field coverage, research
  source/comparability presentation, and the private-guidance save/update/activation flow. Do not implement T-034,
  T-037 or T-038 before their scope/design gates are accepted.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
