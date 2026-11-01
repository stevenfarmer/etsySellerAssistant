# Development guide

## Supported setup

Use Node.js 24 LTS for the baseline development environment. Node.js 26 LTS is also tested. v1 supports macOS with Codex Desktop. Windows runtime acceptance is deferred to v2 or later; other local STDIO clients come first, and Linux remains exploratory.

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
- Confirm the configured CI checks. Windows CI remains regression coverage, not Windows live acceptance or a v1 manual-test requirement.
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
do not remove or overwrite them without deliberate recovery. Mac recovery procedures and connection integration still require v1 review. Windows native behavior and live acceptance are deferred; retained Windows guidance is for future development.

For a stale lock, first stop every instance of the local CLI and MCP server on that computer and
verify that none is still running. The app's local support folder is `~/Library/Application
Support/etsySellerAssistant` on macOS or `%LOCALAPPDATA%\\etsySellerAssistant` on Windows. Only
then may the owner remove the `refresh.lock` directory. Do not remove a lock based solely on its
age or PID, since a slow process or a reused PID can make that unsafe. A `token-state.json` entry
marked `refreshing` means the outcome of a refresh may be unknown; removing the lock does not fix
it. Keep the state and credentials intact until the owner deliberately completes a reviewed
reauthorization and cleanup procedure. Do not paste the support folder contents into chat.

## Listing-read recovery

The alpha now distinguishes a busy local operation from a connection requiring recovery. Busy or timed-out lock acquisition means wait for the other operation to finish; never delete its lock. Other refresh-coordination failures stop listing retries and direct the operator here. These messages contain no token values, shop identifiers, or local paths. Unexpected errors retain the generic sanitized response.

For interrupted refresh, revoked authorization, partial credential writes, or an invalid token state:

1. Stop every local MCP server and connection CLI instance. Keep existing credentials and state intact while investigating; do not retry a possibly rotated refresh token.
2. If a stale `refresh.lock` prevents local commands, verify that no app instance remains before deliberately removing only that lock directory as described above. Removing the lock alone does not repair token state.
3. If reauthorization is needed, deliberately run `npm run local -- reset` and confirm `RESET` locally. This removes app credentials, tokens, token state, and the shop setting on this computer. A partial reset reports failure; resolve protected-store access and repeat reset before setup. It does not revoke Etsy-side authorization.
4. Run `npm run local -- guided` with locally entered credentials, then `npm run local -- connect` and complete owner consent. These steps require explicit authorization for the lookup, token exchange, and identity check. Restart the MCP server after recovery; a later listing-detail request requires listing the page again in that server session.

Do not reset a healthy connection as an acceptance test. Use fabricated stores and temporary directories for automated failure drills. The failed Windows/Node 24 main run was traced to lock-directory rename during release; its underlying OS error was sanitized, so the cause is unconfirmed. A deterministic regression verifies that a failed release preserves ownership and keeps contenders blocked. That safety check does not establish Windows support or prove the CI issue fixed.

## Troubleshooting

- **Node is not found:** restart Codex Desktop after installing Node, or configure the full Node executable path.
- **The MCP server does not start:** run `npm ci`, then `npm run build`; check that the configured argument points to `dist/src/index.js`.
- **The server appears to hang in a terminal:** that is expected; an STDIO MCP server waits for its client. Stop it with Ctrl+C.

## Refresh failure and cleanup diagnostics

Lease-owning token, listing-read, and CLI operations preserve the primary failure if lock release
also fails. If the operation succeeds but release fails, the request still fails; CLI success
output is emitted only after release succeeds. Errors remain typed and sanitized. A failed release
rename leaves the lock in place and blocks contenders. A successful rename ends ownership even
when deletion of the resulting `.refresh-released-*` tombstone fails: that failure is reported,
but a new lock can be acquired. Tombstones are not active locks; never interpret them as permission
to remove a current `refresh.lock`.

Missing, incomplete, malformed, or oversized owner metadata reports `recovery_required` once the
bounded wait ends. Briefly incomplete metadata can occur during initialization. A valid owner
still present at the deadline reports `timeout` (or `busy` for a non-waiting caller). None of these
cases authorizes automatic lock removal.

A wrong-owner or malformed refresh grant fails validation and leaves `token-state.json` marked
`refreshing`. Later requests require recovery without another refresh attempt or reuse of the old
refresh token. Follow the deliberate recovery procedure above; do not clear the marker to retry.

Clock assessment: lock waits and persisted expiry currently use wall-clock time. Backward clock
adjustments can extend waits or apparent freshness; forward adjustments can shorten them. The
60-second freshness margin and strict expiry comparison cover ordinary boundary conditions, not
arbitrary clock jumps. This follow-up retains that timing model; monotonic waits and a conservative
expiry anchored before transport need a separate focused design and tests. No automatic lock
stealing is justified by age, expiry, or clock changes.

## Isolated Mac recovery drill

See [Mac recovery acceptance](mac-recovery-acceptance.md) for the offline drill and the exact, separately authorized test-only Keychain actions. Neither mode reads the healthy connection. Native mode is manual only; CI tests inject a fabricated backend.
