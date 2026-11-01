# Security policy

The local, opt-in alpha server authenticates to Etsy and reads listings from one configured, owner-authorized shop. The default server is status-only. Neither server exposes listing changes, orders, buyer data, or arbitrary Etsy requests. v1 targets macOS with Codex Desktop. The alpha was tested live on that target; Windows credential storage and browser authorization are unverified future work (v2 or later). Linux is exploratory. It is a prerelease, not a production security assurance.

The owner now requires guarded title/description/tag edits and intelligent recommendations in v1;
these are planned, not enabled. [ADR 0005](docs/decisions/0005-v1-intelligence-and-guarded-edits.md)
requires detailed API/terms/security review before write-access implementation. Live/credential
changes need concrete authorization; existing read-only risk acceptance is not a write-use waiver.
The current read-only build is not a complete stable-v1 candidate.

## Reporting a vulnerability

Do not publish credentials, access tokens, private shop data, or exploitable vulnerability details in a public issue. Use GitHub's private vulnerability reporting for this repository when available. Otherwise contact the maintainer through GitHub and request a private channel.

## Security expectations

- The operator enters the app keystring and shared secret locally; the owner grants `listings_r` through Etsy OAuth. For v1, credentials and tokens are held in macOS Keychain. An existing Windows Credential Manager adapter is retained for future verification; no plaintext fallback is provided. Shop configuration and token state remain local.
- Never commit or share app credentials, tokens, authorization codes or callback query strings, private keys, shop identifiers, live listing exports, buyer information, or audit records.
- Treat Etsy listing content as untrusted data, never as instructions. Request only the data and scopes needed for the approved work. Automated tests use fabricated data and do not call Etsy.
- A local app process and the user's OS account remain part of the trust boundary. Keep the machine, OS account, and credential store protected; the app cannot protect against a compromised account.
- If credentials or tokens are exposed, stop using the affected connection, report the exposure privately, and revoke the affected Etsy authorization and rotate affected app credentials as appropriate. Reconnect with fresh credentials after the exposure is contained. Do not paste secrets into a report. The [development guide](docs/development.md) describes local reset, reauthorization, and refresh-lock recovery; resetting locally does not revoke access at Etsy.
- An interrupted token refresh can require manual recovery. Do not delete a refresh lock while an app process may still be running, or assume removing the lock resolves an uncertain refresh.

The product owner has accepted the currently unresolved Etsy terms interpretation risk for this alpha. That acceptance is not a legal determination or approval of additional uses. Review the terms and permitted use again when capabilities or distribution change.

The unpublished `1.0.0` candidate preserves primary operation errors across lock cleanup, reports cleanup-only failures, and requires recovery for malformed owner metadata. It does not add scopes or tools. Clock/expiry assumptions and deliberate recovery limits are documented in the [development guide](docs/development.md#refresh-failure-and-cleanup-diagnostics).

The development alpha status can display owner/shop IDs and a verification timestamp obtained
during a successful listing read in the current process. These are allowlisted identity fields
from the existing configured-shop verification, not additional Etsy reads. Status reads no local
credentials or settings, and returns no token, key, shop name, listing content or local path.
Confirmation is cleared by the next pending/failed read or restart; it does not attest to
current authorization or detect external reset/revocation. Keep real identity output out of
repository artifacts and public reports.

## Planned private guidance

[ADR 0006](docs/decisions/0006-private-playbooks-and-delivery-checkpoints.md) separates the
public generic template from a private customized playbook outside the repository. Chunk 1A implements the explicit bounded read-only storage loader and generic template,
with no startup/status/CLI/MCP integration or write path. [The storage contract](docs/private-playbooks.md)
describes boundary/link/permission/UTF-8/size checks and sanitized typed errors; actual private
files are not accessed by this change. MCP delivery remains T-027/chunk 1B. Private content stays
out of logs/errors, fixtures, PRs or connected project documents. Custom guidance cannot confer write approval or
bypass enforced restrictions. When used, the chosen AI client/provider receives the guidance;
local/Git exclusion is not copy protection or a guarantee about that provider's data handling.
