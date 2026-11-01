# Contributing

## Before changing code

Read [AGENTS.md](AGENTS.md), [the architecture guide](docs/architecture.md), and the applicable decision records. Keep every change generic and safe for reuse by other Etsy sellers.

## Development workflow

1. Create a feature branch from `main`.
2. Make a focused change with tests and documentation.
3. Run `npm ci` and `npm run validate`.
4. Open a pull request with the purpose, behavior changes, security impact, and verification results.
5. Wait for cross-platform CI and maintainer review before merge.

Do not commit credentials, local config, generated files, Etsy exports, shop identifiers, buyer data, or audit logs. Use fabricated fixtures only. Automated checks must never call live Etsy endpoints.

## Pull requests

Every code change must include or update automated tests. Explain any platform-specific behavior and show that Windows and macOS remain supported. Do not add Etsy write capabilities, additional OAuth scopes, telemetry, or hosted services without an approved requirements change.

Before every release, complete the [release checklist](docs/release-checklist.md), including the README, security policy, diagrams, decision records, tracker, steering document and release notes. An unresolved documentation mismatch blocks publication.
