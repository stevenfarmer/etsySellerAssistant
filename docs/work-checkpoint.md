# Resumable v1 work checkpoint

Updated 3 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Prior completed chunk: 2B/T-023, PR #25 merged as
  `4300b849d33ea115a7ee295ff486185c54f92eb0`; 242 offline tests and all five PR checks
  passed. See [evaluation evidence](review-evaluation.md).
- Current chunk: **3A / T-011 guarded-edit design and security review**. The owner explicitly
  resumed this chunk on 3 November. Conditional technical baseline is in
  [guarded-edit-design-review.md](guarded-edit-design-review.md), merged in PR #26 as
  `2263e722f6e790bb31fa1883d1655d69ba32af99`. The corresponding requirements, phase-gate,
  ADR, listing-review, and connected records were updated and read back.
- Verification: `npm run validate` passed formatting, lint, typecheck, build, and **242/242
  offline tests** after the sandboxed run could not bind loopback for 9 callback tests.
  `git diff --check` passed. All five PR checks passed on the reviewed head. No test contacts
  Etsy or mutates a shop.
- Blocking finding: Etsy API Terms sections 3, 5.18, 5.24, and 5.25 create an unresolved
  written-authorization/app-purpose question for AI analysis and transfer of API-sourced
  listing content, as well as the proposed write capability. This is not a legal conclusion.
  No Etsy contact was made. Do not begin phase 4 or send Etsy data to an AI provider until
  written Etsy guidance and owner disposition are recorded. Codex's exact approval UX must
  also be verified before relying on MCP elicitation. T-011 remains In Progress.
- No runtime, OAuth scope, credentials, live Etsy access, or publication changed. PR #26 is
  merged as `2263e722f6e790bb31fa1883d1655d69ba32af99`; its five checks passed. The
  checkpoint-only PR #27 then merged as `16d028bb76ba9fb7cec152bb3d466b1fdd67e824` (tree
  `090f1e2cb8de0d2b5cffc61f1a91abd9289d1c74`).
- At the final checkpoint sync, local branch `codex/guarded-edit-design-review` was at
  `3608c75b073aaea78e7f2f2b67303d8d0e6ae12b`; its tree matched the PR #27 merge tree. Local
  and GitHub commit IDs differ because shell GitHub access could not resolve the host. The
  connected GitHub integration confirmed both merges. Recheck and synchronize the local
  checkout to live main before further repository work.
- Exact next action: obtain written Etsy guidance/approval covering the intended app purpose,
  `listings_w`, and AI-provider data flow; record the owner's disposition; verify Codex's
  exact host-mediated confirmation behavior. Recheck main/PRs/CI and connected records before
  resuming. Phase 4 remains closed until every gate passes. Stop after this 3A chunk.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
