# Security policy

The local, opt-in `0.1.0-alpha.1` server authenticates to Etsy and reads listings from one configured, owner-authorized shop. The default server is status-only. Neither server exposes listing changes, orders, buyer data, or arbitrary Etsy requests. v1 targets macOS with Codex Desktop. The alpha was tested live on that target; Windows credential storage and browser authorization are unverified future work (v2 or later). Linux is exploratory. It is a prerelease, not a production security assurance.

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
