# Project tracking and change process

Owner instruction, 1 November 2026: adding, removing or changing project work must update the
project tracker and local tracking documentation as part of the change. This applies throughout
development, not only before releases.

## Current sources

- Approved scope/decisions: connected steering document and applicable ADRs.
- Task execution: connected Project Tracker, with stable T- identifiers.
- Current local requirements, use cases, acceptance/evidence and task snapshot:
  [requirements-and-acceptance.md](requirements-and-acceptance.md).
- Release summary/evidence: [v1 readiness](v1-readiness.md), exact candidate PR and release checklist.
- Historical plans/notes: explicitly labelled snapshots; never use them to reopen completed work.

The local matrix and tracker must agree. A status update is not complete while only one is current.

## Required change workflow

1. Identify the affected requirement/use case and tracker task before implementation. Reuse an
   existing task when appropriate. Add a task for genuinely new work, with priority, owner,
   scope, observable acceptance criteria, dependencies and relevant requirement IDs.
2. For additions, removals or scope changes, update the active requirements, use cases and
   acceptance criteria together. Remove obsolete work from the active plan. Retire/defer its
   tracker entry with rationale and replacement links rather than deleting accepted evidence
   or reusing its ID. A removal must not remain an accidental release blocker.
3. Deliver code/tests and affected operator/security/architecture documentation in the same
   focused PR. Update the local matrix/delivery status and the connected task's criteria,
   evidence, status and date. A documentation/process change also updates its relevant task.
4. Keep implementation, verification and owner acceptance distinct. Done requires the task's
   actual criteria/evidence; In Review names the outstanding decision. An untested scenario
   is a disclosed limitation or follow-up, not automatically a newly invented feature gate.
5. Record the actual verification result and linked evidence. Preserve historical version/date
   labels. Add follow-up tasks for unfinished engineering work rather than leaving it only
   in prose; do not duplicate an existing active task.
6. Read back connected edits and check local links/status consistency before reporting completion.
   The PR lists affected task/requirement IDs and tracking links, or explains why an existing
   record needed no semantic change. Connection/access failure leaves tracking explicitly
   incomplete; do not claim synchronization.
7. Merge only through required checks. For releases, the merged documentation changes the
   full-repository candidate SHA even if runtime is identical. Refresh the exact target and
   check evidence before requesting the separately authorized publication decision.

## Status rules

- Done: stated implementation/verification/acceptance criteria actually satisfied.
- In Progress: substantive implementation or investigation remains active.
- In Review: deliverable/evidence exists; a specified review/acceptance decision remains.
- Backlog/Deferred: inactive/future work, with priority and rationale; not a v1 gate by default.
- Retired/removed work: remove it from the active plan and use a supported inactive tracker
  state plus a clear retirement reason. Preserve traceability and avoid silently deleting history.

Final product acceptance and publication are never inferred from passing checks, a documentation
request or a direction to continue development. Existing limits on credentials, live Etsy actions,
read-only scope and published tags remain in force.

## PR completion check

- Relevant tracker task(s) added/updated/retired and read back.
- Current local matrix/use cases/acceptance/delivery notes agree with those task states.
- Affected guides and release material updated; historical material labelled.
- Actual verification evidence linked; pending acceptance and follow-ups explicit.
- No new scope/permission/live action or publication inferred from tracking work.

## Token-aware delivery checkpoints

Follow the [gated plan](v1-phase-gates.md): normally one numbered chunk/PR per continuation,
then stop. Update [the checkpoint](work-checkpoint.md), affected matrix/acceptance/status docs
and connected tasks/decisions together. Preserve exact PR/commit/CI evidence in task records;
keep the checkpoint concise with completed/current/next work and the precise restart step.
If interrupted, document uncommitted/branch work and failures without marking completion.
Recheck live sources when resuming. Split an oversized chunk into named subchunks before
expanding scope. Usage budgets/reset times are not guaranteed or a reason to bypass checks.
Private playbook contents never belong in checkpoint, tracking or connected project documents.
