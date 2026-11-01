# macOS / Codex Desktop v1 readiness

Reviewed on 31 October 2026. This is development evidence, not a published v1 release or completed manual recovery acceptance. The candidate changes are on `codex/v1-macos-codex-scope`; published `v0.1.0-alpha.1` is unchanged. Platform sequencing follows [ADR 0004](decisions/0004-v1-platform-scope.md).

## Accepted evidence

- Owner-authorized Mac OAuth, configured-shop identity, Codex Desktop listing retrieval, and a separate bounded list-and-detail check passed. T-009 remains Done; no repeat live listing check is needed to establish that result.
- The registered alpha's `get_setup_status` returned application `etsySellerAssistant`, version `0.1.0-alpha.1`, `etsyAccess: not_checked`, and `readOnly: true` during this review. This tool does not contact Etsy or verify current authorization.
- Local environment: macOS 27.0.1, Node.js 24.11.1, npm 11.6.2. The running host is ChatGPT 26.1027.30824 (build 22943), with an embedded Codex helper reporting 156.0.8078.48 (build 8078.48), verified from the running executable locations and bundle metadata. These are the observed host/runtime versions, not an inferred standalone Codex Desktop release number.
- Offline recovery checks cover refresh concurrency across processes, uncertain refresh, incomplete token pairs, replacement-token persistence failures, lock ownership, interrupted-state preservation, and deliberate reset. They use fabricated stores and temporary directories, not the operator's connection.
- Listing tools now return distinct, sanitized guidance for contention and recovery-required failures instead of suggesting a retry for an uncertain refresh. Tool names, inputs, read-only permissions, and Etsy scopes are unchanged.

## Local validation result

`npm run validate` passed on this working tree after the recovery changes: formatting, lint, TypeScript, build, and all 163 offline tests. The sandbox-only attempt could not bind callback listeners; the complete rerun with loopback binding available passed. `git diff --check` also passed. This is local Node 24 evidence, not candidate CI or Node 26 evidence.

## Remaining acceptance and release work

- Complete owner acceptance of the documented Mac setup/recovery behavior using the recorded host/runtime versions. No live revocation, reset, or credential removal was performed during this review; do not destroy a working connection to fill an evidence checkbox.
- Review the candidate diff, run `npm run validate`, and obtain current candidate CI/security results through the normal protected-branch process. Successful checks on another commit are not candidate evidence.
- Current main at `dcdf675563d01de75457728542a3429489f15dd5` had a Windows/Node 24 failure during lock-directory rename on release in [run 41255898713](https://github.com/stevenfarmer/etsySellerAssistant/actions/runs/41255898713). Mac jobs passed. Underlying OS cause and Windows fix remain unconfirmed. Existing branch checks still apply; Windows manual runtime acceptance is deferred to v2 or later.
- Choose the exact v1 release candidate and version only after review. Reconcile all release materials with it and record check results in the [release checklist](release-checklist.md). This work does not publish or retag a release.

Other local STDIO clients follow v1. Windows follows that client milestone; Linux remains exploratory. Neither is a v1 manual acceptance gate. Etsy writes and broader scopes remain separately gated.
