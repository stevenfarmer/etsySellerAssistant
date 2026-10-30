# ADR 0002: Etsy access is gated; read-only first

- Status: Accepted
- Date: 2026-10-30

## Decision

The initial foundation does not connect to Etsy. Etsy app registration, callback behavior, app approval, and minimum scopes must be confirmed before OAuth implementation. The first Etsy-enabled release will be read-only. Any future listing mutation requires a separate stakeholder-approved design and explicit per-change confirmation.

## Context

The current project is a reusable public template for an operator-authorized shop. Etsy API rules and app eligibility must be verified against current Etsy documentation and the developer portal. A read-only first release limits the impact of authentication, API, and tool-description mistakes.

## Consequences

- The current MCP server reports setup status only and requests no secrets.
- No write method, delete, publishing, order access, or buyer/customer data access is exposed.
- Automated tests use fabricated data or mocked responses and never mutate a live shop.
- Future write operations need an allowlist, before/after preview, stale-data check, verification, and an append-only local audit record.
