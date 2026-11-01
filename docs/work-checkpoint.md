# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Prior completed chunk: 1A/T-026, PR #21, `e6ef85fc40eeaa26697c2016db6deba4c5570fe0`.
  Live main/PRs/CI and steering/tracker verified at 1B start; local checkout clean, no open PRs.
- Current deliverable: **1B / T-027 guidance interface**. Alpha now exposes strict no-argument
  `get_review_guidance`, generic by default, private only through explicit client settings.
  Source labels, bounded schema/results, sanitized errors and no invalid-private fallback.
  Default scaffold unchanged; startup/status/discovery never invoke guidance. See [contract](private-playbooks.md).
- Actual validation: `npm run validate` passed **222 offline tests** and static checks, including
  9 new guidance tests, actual alpha STDIO scenarios and the optional read-only smoke inventory
  regression. No real private guidance/credentials/Etsy requests. Implementation PR/T-027 hold
  exact head/merge/CI and connected readback evidence; compare live records before assuming merge.
- **Pending gate: real Codex client discovery/default-generic invocation.** The running host still
  advertises the old three-tool inventory. After merged build, quit/reopen the app to reload its
  MCP process, return to this chat, discover `get_review_guidance` and invoke with `{}` in default
  generic mode. Record sanitized pass/fail in T-027 and connected/local docs. Do not read private
  content or Etsy. Automated STDIO success does not replace this planned client acceptance.
- **Next implementation chunk after that gate: 2A / T-023** review workflow/validators.
  Do not start it during this continuation. The real private sales playbook remains chunk 2B.
- Feature branch: `codex/mcp-guidance-interface`; final PR/head/merge/clean-main status in T-027.
  This source checkpoint cannot embed its own merge SHA. T-027 stays In Review until client check.
- Required owner action after technical work: restart the app and return here for the guidance-only
  check. No credential change, live Etsy request, reset or release publication is authorized.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
