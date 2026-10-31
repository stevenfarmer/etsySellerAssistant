# ADR 0002: Etsy access is gated; read-only first

- Status: Accepted
- Date: 2026-10-30

## Decision

The initial foundation does not connect to Etsy. The first Etsy-enabled release will be read-only. Any future listing mutation requires a separate stakeholder-approved design and explicit per-change confirmation.

On 2026-10-31 the product owner approved a bounded sequencing refinement: after OAuth and security design review, an offline-tested local verification harness may be implemented to resolve the remaining callback and authorization questions in T-007. Live credential handling, owner consent, and live Etsy requests require explicit authorization for the concrete step. Production MCP shop-reading tools remain disabled until T-007 evidence and the T-008 security design are accepted. The approved Seller App and persisted callback do not establish a successful OAuth round trip.

## Context

The current project is a reusable public template for an operator-authorized shop. Etsy API rules and app eligibility must be verified against current Etsy documentation and the developer portal. A read-only first release limits the impact of authentication, API, and tool-description mistakes.

## Consequences

- The current MCP server reports setup status only and requests no secrets.
- No write method, delete, publishing, order access, or buyer/customer data access is exposed.
- Automated tests use fabricated data or mocked responses and never mutate a live shop.
- Future write operations need an allowlist, before/after preview, stale-data check, verification, and an append-only local audit record.
