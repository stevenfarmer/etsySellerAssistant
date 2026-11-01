# Release checklist

Complete this checklist for every release, including prereleases. A release is blocked while an applicable item is incomplete or the materials disagree with the candidate. Record evidence in the release PR and tracker without including shop data or secrets.

## Before publication

- Identify the exact candidate commit and version. Check the package version and lockfile agree, and that setup instructions describe that version and its actual entry points.
- Reconcile the README, security policy, operator/setup and recovery guides, diagrams, relevant decisions and agent instructions with the implemented behavior. Clearly distinguish current features, historical decisions, planned work, known risks, and unverified platforms.
- Update the project steering document and tracker, including release status, acceptance evidence, outstanding tasks, accepted risks, and links. Confirm they agree with the repository.
- Prepare release notes describing scope, installation, verification, limitations and breaking changes. Keep all project materials seller-neutral and free of credentials and live shop data.
- Run `npm run validate`; verify the required Windows/macOS and Node matrix and secret scan on the exact candidate. Automated tests must remain offline from Etsy. Record actual results and any separately authorized manual verification; do not present CI as live platform acceptance.
- Review the diff and outstanding security, dependency, recovery, and policy risks. Resolve discrepancies or postpone publication; record explicit product-owner acceptance where required.
- Merge through protected-branch checks, then confirm the release tag points to the intended commit and the release notes describe the published artifact.

## After publication

- Verify the release page, prerelease status, links, tracker and steering document. Record any remaining limitations accurately. Do not move or replace an already published tag; correct release notes and prepare a subsequent release if the shipped artifact needs correction.
