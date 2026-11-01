# Resumable v1 work checkpoint

Updated 1 November 2026. Follow the [gated plan](v1-phase-gates.md) and
[tracking process](project-tracking.md). This file is a concise restart record, not a substitute
for verifying live main/PRs/CI and the connected steering/tracker before work resumes.

## Current checkpoint

- Prior completed chunk: 2A/T-023, PR #24, `2ea3a6f13e9e361906d9472033a8232f71108027`.
  Live main/PRs/CI and connected records verified at 2B start; checkout clean, no open PRs.
- Current deliverable: **2B / T-023 evaluation and private playbook**. Eight public fabricated
  scenarios, dated source register, offline declared-evidence helper and manual rubric. Eight
  client reviews passed declared checks and same-assistant self-review threshold (not independent
  or automated model benchmarking). See [evaluation evidence](review-evaluation.md).
- Initial private playbook and evaluation outputs created outside Git using no-clobber creation,
  0700 directory/0600 files; explicit safe-reader load passed. No contents or machine-specific
  path in public records. CI never reads those actual artifacts. Generic mode remains default;
  no connection settings/credentials/scopes/live Etsy actions or publication changed.
- Actual validation: `npm run validate` passed **242 offline tests**/static checks, including
  8 evaluation regression tests and a deliberate semantic-limit example. Actual private artifact
  verification and public-diff exclusion evidence are separate from CI. Final PR/T-023 hold
  head/merge/CI/readback evidence; compare live state before resuming.
- T-023 Done denotes its 2A/2B development criteria. Owner usefulness/private-mode client/live
  editing acceptance remains T-031 and final T-012. Owner/product facts are not invented.
- **PAUSED at owner's explicit request after 2B. Do not continue automatically.**
- **Next on explicit resumption: 3A / T-011** guarded-write design/security/API/terms review.
  First read the existing write requirements/ADRs and recheck live project state. Specify actual
  tool/OAuth/approval/staleness/concurrency/audit/uncertain-outcome contracts and resolve blockers
  before ANY phase-4 write-access implementation. No live/scope/credential action is authorized
  by this checkpoint; prepare concrete authorized steps only when ready.
- Feature branch: `codex/review-evaluation-playbook`; final clean-main status in PR/T-023.
  This file cannot embed its own merge SHA. Stop after final checks/merge/tracking and wait.

## Required replacement at each checkpoint

Keep the current checkpoint short; replace stale entries rather than append chat transcripts.
Record completed chunk/task, merged PR and commit; current branch/PR/head and uncommitted work
if any; actual commands/results/CI; decisions and unresolved findings; connected readback status;
next chunk and exact first action; and any specific required owner action. Link historical evidence
instead of repeating it. Never include private playbook content, credentials, seller facts or logs.

If interrupted mid-chunk, mark it incomplete and record the safe restart step. Never infer that
a planned test ran, a PR merged or an owner accepted behavior merely because this file says so;
compare the claim with actual source/PR/CI and task evidence.
