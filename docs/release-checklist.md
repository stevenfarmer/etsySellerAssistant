# Release checklist

Complete this checklist for every release, including prereleases. A release is blocked while an applicable item is incomplete or the materials disagree with the candidate. Record evidence in the release PR and tracker without including shop data or secrets.

## Before publication

- Identify the exact candidate commit and version. Check the package version and lockfile agree, and that setup instructions describe that version and its actual entry points.
- Reconcile the README, security policy, operator/setup and recovery guides, diagrams, relevant decisions and agent instructions with the implemented behavior. Clearly distinguish current features, historical decisions, planned work, known risks, and unverified platforms.
- Update the project steering document and tracker, including release status, acceptance evidence, outstanding tasks, accepted risks, and links. Confirm they agree with the repository.
- Prepare release notes describing scope, installation, verification, limitations and breaking changes. Keep all project materials seller-neutral and free of credentials and live shop data.
- Run `npm run validate`; verify macOS on the supported Node versions and secret scanning on the exact candidate. Retain configured regression checks and protected-branch requirements; Windows manual acceptance is not a v1 release gate. Any CI/ruleset change must be explicit and consistent with ADR 0004. Automated tests must remain offline from Etsy. Record actual results and any separately authorized manual verification; do not present CI as live platform acceptance.
- Review the diff and outstanding security, dependency, recovery, and policy risks. Resolve discrepancies or postpone publication; record explicit product-owner acceptance where required.
- Merge through protected-branch checks, then confirm the release tag points to the intended commit and the release notes describe the published artifact.

## After publication

- Verify the release page, prerelease status, links, tracker and steering document. Record any remaining limitations accurately. Do not move or replace an already published tag; correct release notes and prepare a subsequent release if the shipped artifact needs correction.

## v0.1.0-alpha.2 candidate

- Version: `0.1.0-alpha.2`; unpublished, macOS/Codex Desktop read-only prerelease.
- Exact source SHA: record the immutable head of the release PR after its final change. Any later change invalidates candidate check evidence.
- Reconciled: README, SECURITY.md, development/recovery guide, readiness, Mac review, historical next-phase plan, and draft release notes.
- Architecture diagrams and ADR 0004 retain the existing local STDIO, status-only default and opt-in read-only boundaries. Agent rules remain applicable without changes.
- Prior evidence: PR #8/main `4f0761e`, 174 offline tests and five successful checks; candidate results must be recorded separately.
- Latest executable evidence: PR #10/main `87c6023` passed all five checks; local formatting, lint, type checking, build and 178 offline tests passed. The authorized Keychain drill passed all eight stages and verified cleanup. Evidence-only documentation changes must pass their own required CI. Dependency audit exits 0 at the high threshold, with 11 moderate development findings still open; no forced upgrade applied. Final candidate CI and secret scan evidence belongs in the release PR.
- Steering and tracker: reconcile with the release PR and its final check results before publication.
- Owner acceptance: isolated Mac recovery results accepted on 1 November 2026. T-008 remains In Progress for broader recovery criteria; no live credential/Etsy action or publication was authorized.
- Timing follow-up: monotonic lock retry waits address the reproduced backward-clock wait issue; persisted expiry assumptions remain separate. The current readiness record contains the T-007/T-008 acceptance matrix.
- Open limitations: live revocation/reauthorization and interactive CLI recovery, wall-clock/transport expiry assumptions, and accepted unresolved Etsy terms interpretation risk. This candidate does not claim stable v1 acceptance.
- Delegated access: owner deferred it to T-016/P3 on 1 November 2026; it is untested and outside v1 acceptance, with no implementation authorization.
- Publication: blocked pending completed candidate checks, owner disposition of applicable open gates, and explicit authorization for the exact candidate. No tag has been created or moved.
