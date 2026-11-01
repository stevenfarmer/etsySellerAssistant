# ADR 0006: private playbooks and resumable delivery

- Status: Owner accepted direction; storage/interface details to be implemented and tested
- Date: 2026-11-01
- Supplements: ADR 0005; retains macOS/Codex v1 acceptance and write/security gates

## Guidance separation

The owner wants a reusable standard connector and customizable guidance, while retaining valuable
seller strategy privately. Keep the public generic template and the actual private playbook as
two separate files. Store the private file outside the repository in explicitly configured local
storage; never replace a tracked file before pushing or rely solely on an ignore rule to protect
an already tracked file. Initial setup/updates must not overwrite customized content.

Public source/docs/examples/tests contain generic instructions and fabricated data only. Private
strategy, buyer/product brief and playbook-derived seller-specific drafts stay out of Git, PRs,
logs, test fixtures, public artifacts and connected project records. Use ignore rules plus a
review/check preventing accidental inclusion; do not claim a scanner can recognize every possible
business secret. No hosted prompt service, licensing, payment or DRM system is added.

Use an explicit read-only standard MCP guidance interface, with a bounded configured file loader
and no arbitrary path argument. Verify the chosen interface with the supported client; do not
assume every MCP client automatically loads prompts/resources or local instruction files. Keep
the interface client-neutral for later clients. Startup/status must not read private guidance.
The detailed path, file safety/size/encoding rules, missing-file/fallback behavior, diagnostics and
reload semantics are phase-1 deliverables, with fabricated temporary-file tests.

Private guidance is trusted only as operator-authored preferences; it cannot confer mutation
approval, authorize extra tools/scopes or override enforced security rules. Listing content is
still untrusted. Explain that guidance is sent to the selected AI client/provider when used:
local storage and Git exclusion do not guarantee model-provider privacy or prevent copying by
someone given the file. Record only generic guidance provenance/version where useful, never
its contents in audit/log output. Any private-file backup must remain separate from public Git.

## Bounded work and phase gates

The owner requests small deliverables so work can pause between token windows. Follow
[the gated plan](../v1-phase-gates.md): one numbered chunk per continuation by default, with
actual tests, review/CI/merge and synchronized documents/tracker before stopping. Each phase
has an observable gate. Routine technical gates do not mean asking the owner for approval.
Required security/design review, concrete live/credential authorization and release publication
authorization retain their existing meaning.

Maintain [the checkpoint](../work-checkpoint.md) with current work, evidence and exact next action.
If interrupted or checks fail, save an incomplete checkpoint without bypassing gates. Recheck
live state on resumption; do not depend on chat memory or promise an exact token/time budget.
Do not begin phase-1 implementation merely because the planning change is finished.
