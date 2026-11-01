# ADR 0004: macOS and Codex Desktop for v1

- Status: Accepted by product owner
- Date: 2026-10-31
- Supersedes: ADR 0001 platform scope and cross-platform acceptance requirements in the earlier phase plan.

## Decision

v1 targets macOS with Codex Desktop only, using the existing local STDIO MCP server. Windows has not been manually tested and is deferred to v2 or later. Linux is exploratory, with no committed release. After v1, first package and document local STDIO installation for other agents, apps, and IDEs, and verify those clients on macOS; then address additional operating systems.

## Acceptance and scope

v1 requires repeatable Mac/Codex setup, Keychain protection, owner-authorized read-only listing review, fact-grounded suggestions, recovery review, offline automated tests, and the normal security/release checks. Successful Mac OAuth, listing, and detail reads remain accepted evidence; T-009 remains Done. Remaining evidence must be identified specifically rather than reopening completed listing work.

Windows live credential, browser, and recovery checks are future work and do not block v1 acceptance. Preserve existing Windows code, portable interfaces, CI coverage, and branch protections. Retaining CI does not claim Windows runtime support. A failing configured check still requires triage and the normal reviewed merge process; this scope decision does not silently bypass it. The latest main run at decision review failed the Windows/Node 24 concurrent-refresh test with `ownership_lost`; whether that exposes shared logic or Windows behavior remains to be investigated.

The runtime already uses MCP over STDIO. The later client milestone concerns installation, packaging, documentation, and compatibility acceptance, not adding a new transport. Linux needs a separately reviewed protected-store approach before any support claim.

## Consequences

Update the steering document, tracker, README, agent instructions, security policy, development/release guides, and diagrams to distinguish v1 support from historical cross-platform plans. Retain published alpha tags and their historical evidence. Do not bump the version or publish a release merely to record this roadmap.

This decision changes platform and client sequencing only. The local-first, one-shop, read-only boundary, minimum OAuth scope, credential protection, and explicit gates for future writes remain in force.
