# Development guide

## Supported setup

Use Node.js 24 LTS for the baseline development environment. Node.js 26 LTS is also tested. Both Windows and macOS are first-class supported platforms.

Install Node.js using the official distribution or a trusted version manager for your operating system. Confirm that both `node` and `npm` are available in the terminal used by Codex Desktop.

## First run

```sh
npm ci
npm run validate
npm start
```

`npm ci` uses the committed lockfile for a clean, reproducible dependency install. `npm run validate` checks formatting, lint, TypeScript types, and automated tests. `npm start` builds and launches the local MCP process.

## Codex Desktop configuration

In the Codex Desktop custom MCP setup, choose STDIO and provide:

- Command: `node`, or the full path to the Node executable if the app has a limited PATH.
- Argument: absolute path to `dist/src/index.js`.
- Working directory: the repository root.
- Environment variables: none for the current status-only scaffold.

Use that machine's native path format. Do not copy a Windows path into the Mac configuration or vice versa. No Etsy credentials should be entered at this stage.

## Change and test loop

- Add tests with each behavior change. Prefer deterministic unit tests and mocked external responses.
- Run `npm run validate` before opening a pull request.
- Keep the test suite offline from Etsy.
- Confirm CI on both Windows and macOS.
- If an environment prevents a check from running, say so explicitly in the pull request instead of claiming success.

The default MCP server is status-only; the separate alpha entry point connects the read-client
components to the local MCP server. A local setup and connection CLI exists, but live credential
handling and Etsy access require separate explicit authorization for that specific step. Do not
run the live flow as part of automated testing.
Automated tests mock Etsy and the OS credential store; the test preload blocks external `fetch`
requests and allows loopback HTTP only for callback tests. It is not a general socket firewall.
Some sandboxed environments do not allow the callback tests to bind localhost; run validation in
an environment where loopback binding is permitted and report the result.

To manually check the native protected-store dependency on a supported computer, run
`node scripts/manual-os-store-smoke.mjs`. The script creates a unique test-only service and
fabricated value, checks the round trip, and deletes it. It does not access the application's real
credential slots. On Windows, local non-secret settings rely on inherited `%LOCALAPPDATA%` ACLs;
POSIX mode bits alone do not enforce Windows ACLs. Windows native-store and Node-version coverage
must be verified independently before claiming platform acceptance.

Once separately authorized for local credential setup, run `npm run local -- guided` in an
interactive terminal. Enter the shop URL or name and app credentials at the hidden prompts; the command
asks for confirmation before one read-only shop search. It uses the exact match to configure the
shop, so the ID and credentials do not have to be entered again. Never put them in chat or command
arguments. The CLI stores credentials in the OS credential store and the ID in the platform's local
application-support directory. It refuses to overwrite an existing setup. Each Mac must be set up
locally by an authorized operator; do not sync credentials or create additional seller apps for
other sellers. `npm run local -- connect` is a separate live operation: it asks for
local confirmation, opens a localhost start page, then requests `listings_r` consent and performs
one shop identity check. Do not run it until the concrete live step is authorized and reviewed.
The browser may retain the Etsy authorization URL in history or diagnostics; do not share it.

All guided prompts hide input, including the shop URL and confirmation words. Paste or type once,
then press Return even though nothing appears. Single-line bracketed paste is supported; multiline
paste is rejected. Ctrl-C cancels the current attempt.

The separate `lookup` and `setup` commands remain available for troubleshooting or if the numeric
ID is already known. A public search result does not prove ownership: the subsequent owner-consented
OAuth flow verifies that the returned owner's shop matches the ID. If lookup fails or is ambiguous,
do not guess. The lookup does not save the shop name.

To retest from a clean local state or correct an incorrect shop selection, stop other local app
instances and run `npm run local -- reset`. The command requires the hidden confirmation `RESET`;
it removes this computer's stored app keystring, shared secret, OAuth tokens, shop ID setting, and
token state. It does not remove the Seller App or revoke Etsy-side authorization, and it does not
affect other computers. If removal fails, it reports failure and may have removed some local values;
retry the reset before starting setup. Then run `npm run local -- guided` to identify the shop again,
followed by `npm run local -- connect` for owner authorization. This is the current way to correct
the shop ID: it deliberately requires a new identity check instead of silently changing a connected
shop. For Etsy-side revocation, use the owner's connected-app settings when the app is listed, as
described in [Etsy's API help](https://help.etsy.com/hc/en-us/articles/360025870013-How-to-Use-Etsy-s-API).

Refresh coordination uses a per-user lock and a non-secret state file. If a process crashes, an
incomplete lock requires manual recovery; never remove it while an owner process might be active.
An interrupted refresh reports recovery required and is not retried automatically, because the
server may already have rotated the token. Partial setup can leave credentials in protected storage;
do not remove or overwrite them without deliberate recovery. Cross-platform native behavior,
recovery procedures, and connection integration still require review before live use.

For a stale lock, first stop every instance of the local CLI and MCP server on that computer and
verify that none is still running. The app's local support folder is `~/Library/Application
Support/etsySellerAssistant` on macOS or `%LOCALAPPDATA%\\etsySellerAssistant` on Windows. Only
then may the owner remove the `refresh.lock` directory. Do not remove a lock based solely on its
age or PID, since a slow process or a reused PID can make that unsafe. A `token-state.json` entry
marked `refreshing` means the outcome of a refresh may be unknown; removing the lock does not fix
it. Keep the state and credentials intact until the owner deliberately completes a reviewed
reauthorization and cleanup procedure. Do not paste the support folder contents into chat.

## Troubleshooting

- **Node is not found:** restart Codex Desktop after installing Node, or configure the full Node executable path.
- **The MCP server does not start:** run `npm ci`, then `npm run build`; check that the configured argument points to `dist/src/index.js`.
- **The server appears to hang in a terminal:** that is expected; an STDIO MCP server waits for its client. Stop it with Ctrl+C.
