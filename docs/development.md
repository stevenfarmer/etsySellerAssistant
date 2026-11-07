# Setup and recovery

This guide configures the local alpha server. The published alpha.1 tag is read-only; current source includes guarded editing. Use only a source revision whose capabilities you have reviewed.

## Requirements

- macOS is the verified runtime platform.
- Node.js 24–26 and npm 10 or later.
- An Etsy Seller App with the local callback address configured as described in [Seller App setup](etsy-registration-verification.md).

The server uses MCP over STDIO. Codex Desktop on macOS is the verified client configuration; other clients must support local STDIO MCP, and have not been verified with this installation.

## Build

```sh
npm ci
npm run validate
npm run build
```

Validation uses offline tests and does not call Etsy. To run the status-only server manually, use `npm start`. The shop-connected alpha entry point is `dist/src/alpha.js`.

## Configure local Etsy access

Run setup in an interactive terminal:

```sh
npm run local -- guided
npm run local -- connect
```

The guided command asks for the shop and app details needed for local configuration. It masks sensitive entry. The connect command opens the Etsy authorization flow and verifies the selected shop. The connection uses the permissions needed for listing reads.

Configuration and credentials remain on this computer. macOS credentials are stored in Keychain; local settings are in the application's support directory. Do not copy credentials or callback URLs into chat, environment files, repository files, or logs.

## Add the MCP server

Configure a local STDIO server in the MCP client:

- **Command:** `node`, or the full path to the Node executable.
- **Argument:** the absolute path to `dist/src/alpha.js` in this checkout.
- **Working directory:** the repository root.
- **Environment:** leave empty unless intentionally configuring a private guidance directory.

For clients with separate command and argument fields, pass the script path as one argument. Restart the MCP client after changing the server configuration. A fresh conversation should discover `get_setup_status`, `list_active_listings`, `get_listing`, `get_review_guidance`, and the draft tools.

## Enable listing edits

Listing reads do not grant write access. To use guarded title, description, or tag edits:

1. Choose a private local audit folder and configure it with `npm run local -- set-audit-directory`.
2. Run `npm run local -- enable-edits` and complete the separate Etsy authorization.
3. Restart the MCP server so it uses the new local authorization.

To remove only the edit authorization, stop the MCP server and run `npm run local -- disable-edits`. Listing-read authorization is separate.

## Configure private guidance

The default private guidance file is stored at:

```text
~/Library/Application Support/etsySellerAssistant/guidance/playbook.private.md
```

Open it in Finder with **Go > Go to Folder…** and enter the path above. To use another private folder, set `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` in the MCP server environment. See [private guidance](private-playbooks.md).

## Recovery

Use `npm run local -- reset` only when you intend to remove this computer's app credentials, tokens, token state, and selected shop. It does not delete audit records or revoke authorization in Etsy. After a reset, repeat the guided setup and connect steps.

If a detail read fails after restart, list the active listings again first; details are limited to listings returned in the current server session. If the server does not start, verify the Node executable, working directory, and entry point, then run `npm ci` and `npm run build`.
