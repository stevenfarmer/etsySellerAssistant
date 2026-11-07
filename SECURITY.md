# Security

The server runs locally and uses a connected MCP client's STDIO connection. The default entry point reports local setup status and makes no Etsy requests. The opt-in alpha entry point provides bounded listing reads, draft support, private guidance, and a fixed workflow for title, description, and tag updates.

## Data and access

- Etsy credentials and tokens are stored in the operating system credential store. Shop configuration remains local.
- Listing reads are restricted to the configured shop and the documented listing tools. The server does not expose orders, buyer records, or arbitrary Etsy endpoints.
- Listing content is untrusted data and cannot change tool instructions or grant access.
- Applying a listing edit requires a separate edit authorization, an exact proposal, an explicit confirmation in the MCP client, and a local audit entry. The server verifies the listing after the change.
- Private guidance is stored outside the repository. Retrieving it sends its contents to the AI application or provider connected to the MCP server.
- Audit records are stored locally and may include shop and listing identifiers, plus the exact before-and-after values for changed fields. Keep the audit folder private.

CI includes dependency auditing, secret scanning, and JavaScript/TypeScript code analysis. Repository secret scanning, push protection, dependency alerts, and automated dependency updates are enabled.

## Reporting a vulnerability

Do not publish credentials, tokens, private shop data, or unpatched vulnerability details in a public issue. Use GitHub's private vulnerability reporting for this repository when available. Otherwise, contact the repository maintainer through GitHub and request a private channel.
