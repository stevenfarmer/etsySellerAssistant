# Resumable v1 work checkpoint

Updated 4 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). Recheck live main/PRs/CI and connected records before
resuming; historical evidence is valid only within its stated scope.

## Current checkpoint

- Prior design chunk: **3A / T-011 guarded-edit design and security review**. The design baseline
  merged in PR #26 as `2263e722f6e790bb31fa1883d1655d69ba32af99`; see
  [the review](guarded-edit-design-review.md).
- Last completed chunk: **4A / T-028 proposal and approval**, implemented on branch
  `codex/phase-4a-proposals` and merged in PR #31 as
  `4b7e49135418d85f4c7c2f97a668944a26c90099` from reviewed head
  `2a4a79c40a1dbbfec77b8e2fad3609a5c93e8890`.
- Delivered in the unpublished alpha: bounded in-memory proposals tied to exact changed fields,
  configured identity and listing modification timestamp; fresh identity/value check immediately
  before MCP form elicitation; five-minute expiry; one-use and concurrent-call protection; no apply
  tool or update transport. The default server remains status-only.
- Local verification: `npm run validate` passed format, lint, typecheck, build and **248/248 offline
  tests**; `git diff --check` passed. No external mutation, credential/scope change or publication.
- All five current-head CI checks passed, including Node 24/26 macOS and Windows validation and
  the repository secret scan. Mac checks passed after rerun following a GitHub Actions incident.
  PR #32 documentation reconciliation merged as `e40eee7d9658c87fa0f859c1b48cccc1e756852a`.
  No external mutation, credential/scope change or publication.
- Owner-run Mac Codex Desktop check passed on 4 November 2026: the local alpha exposed listing,
  prepare and approve tools; accepting an exact proposal returned
  `status: approved_for_later_apply` and `listingChanged: false`; a separate decline returned no
  approval. Both paths left the listing unchanged. T-028 client confirmation gate is verified.
- The owner identified a usability follow-up: the confirmation form displays raw JSON with
  internal IDs/timestamps, and the assistant needed a separate prompt to request confirmation.
  Track readable before/proposed fields and automatic approval-tool orchestration as T-032.
- The owner clarified the product intent: a local Etsy seller-assistant MCP server for compatible
  clients, with Codex Desktop one currently tested client. T-033 tracks a client-neutral
  documentation/code pass and a natural editorial voice, with transparent AI-use disclosure.
- Last completed chunk: **4A follow-up / T-032 confirmation usability**, merged in
  [PR #33](https://github.com/stevenfarmer/etsySellerAssistant) as
  `3d05711627e839021768cd6daa5e26fa9ef3a572` from reviewed head
  `d026500d4fa1e0ab5bd17f6b44adf5f36ade8cd1`.
- `prepare_listing_edit` now presents readable exact values and requests confirmation in the same
  call, with the host Accept/Deny action as the sole choice. The Mac test returned
  `approved_for_later_apply`/`listingChanged:false`; a fresh read confirmed the listing unchanged.
  The owner found the one-choice prompt clear enough to merge. Local `npm run validate` passed
  248/248 offline tests, and all five CI jobs passed on the reviewed head (run 41948328199).
- T-032 is Done. T-024/T-032 tracker evidence records the Mac check and merge; the final readback is
  being synchronized in this checkpoint closeout. No apply tool or update transport exists.
- Next numbered chunk: **4A follow-up / T-033 client-neutral wording and editorial cleanup**.
  Do not start it automatically. No listing changed, credential/scope change or publication occurred.

## Required replacement at each checkpoint

Keep this checkpoint short; replace stale entries rather than append chat transcripts. Record
completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work; actual
verification/CI; decisions and unresolved findings; connected readback status; next action; and
any specific owner action. Link historical evidence instead of repeating it. Never include
private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that a
planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
