# Contributing

## Before changing code

Read [AGENTS.md](AGENTS.md), [the architecture guide](docs/architecture.md), and the applicable decision records. Keep every change generic and safe for reuse by other Etsy sellers.

## Development workflow

1. Create a feature branch from `main`.
2. Make a focused change with tests and documentation.
3. Run `npm ci` and `npm run validate`.
4. Open a pull request with the purpose, behavior changes, security impact, and verification results.
5. Wait for configured CI and maintainer review before merge. Existing Windows CI is regression coverage; v1 runtime acceptance targets macOS/Codex Desktop.

Do not commit credentials, local config, generated files, Etsy exports, shop identifiers, buyer data, or audit logs. Use fabricated fixtures only. Automated checks must never call live Etsy endpoints.

## Pull requests

Every code change must include or update automated tests. Explain platform-specific behavior and verify the macOS/Codex Desktop v1 target. Preserve portable interfaces and existing Windows regression coverage; Windows live acceptance is deferred to v2 or later. Do not add Etsy write capabilities, additional OAuth scopes, telemetry, or hosted services without an approved requirements change.

Before every release, complete the [release checklist](docs/release-checklist.md), including the README, security policy, diagrams, decision records, tracker, steering document and release notes. An unresolved documentation mismatch blocks publication.
