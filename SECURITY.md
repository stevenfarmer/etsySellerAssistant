# Security policy

This project is an early local-only scaffold. It currently does not authenticate to Etsy or access shop data.

## Reporting a vulnerability

Please do not publish credentials, access tokens, private shop data, or an exploitable vulnerability in a public issue. Use GitHub's private vulnerability reporting for this repository when available. Otherwise, contact the repository maintainer through GitHub and request a private channel.

## Security expectations

- Never commit API keys, OAuth secrets, tokens, authorization codes, private keys, live shop exports, buyer information, or audit logs.
- Treat Etsy listing content as untrusted input.
- Keep automated tests offline from Etsy and ensure CI cannot mutate a live shop.
- Report suspected exposure promptly, revoke affected credentials, and follow the documented recovery steps once Etsy authorization is implemented.
