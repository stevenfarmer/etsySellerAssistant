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

## v1.0.0 candidate

- Runtime baseline: PR #17, `6dc9c3b`, identical to reviewed head `c26ba1c`; all five PR/main checks passed. Fresh exported checkout on the existing Mac passed locked install, build and validation with 200 offline tests.
- Documentation reconciliation changes the full repository candidate. Its PR/T-012 record the exact merged target and required checks. Runtime/version remain unchanged; previous publication-target wording is superseded.
- Requirements/use cases/acceptance: [single current matrix](requirements-and-acceptance.md). Task execution states must match the connected tracker under the [every-change process](project-tracking.md).
- Implementation and verification of M1–M5 are recorded; M4 is a worked demonstration, with owner usefulness acceptance still pending. Scoped isolated recovery is accepted; live/interactive limitations remain explicit.
- Last actual audit: production-only exited 0 with zero findings; full audit exited 1 with 11 moderate development findings and no high/critical findings. Remediation is T-021/Backlog; no fix or waiver is claimed.
- Security, guides, diagrams, ADRs, versions and final notes are reconciled; historical phase/alpha.2/rc.1 records are explicitly historical. Neither intermediate version was published.
- Final owner product/limits acceptance and exact-commit publication authorization remain pending. No v1 tag/release exists; published alpha.1 remains unchanged.
- Candidate publication must use the exact reconciled target and its checks, never an obsolete SHA merely because the runtime is unchanged.

## Historical candidate milestones

Unpublished alpha.2 and rc.1 notes remain under [releases/](releases/v0.1.0-alpha.2.md) and
[rc.1](releases/v1.0.0-rc.1.md). Their past pending statements and check counts preserve history;
they are not the current checklist or extra publication gates.

### v0.1.0-alpha.2 candidate

Historical unpublished milestone only; see its [notes](releases/v0.1.0-alpha.2.md) and prior PR
evidence. The current checklist and candidate are above.

### v1.0.0-rc.1 candidate

Historical unpublished rehearsal only; see its [notes](releases/v1.0.0-rc.1.md).
