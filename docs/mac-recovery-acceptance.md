# Isolated Mac recovery acceptance

This drill exercises the production recovery modules using fabricated values, a fresh temporary
directory, and mocked authorization/identity responses. It never loads the normal local settings,
opens a browser, binds an OAuth callback, or calls Etsy. It is a scripted integration exercise,
not an interactive CLI, live revocation, or live reauthorization acceptance test.

## Preparation and offline mode

Run `npm run build`, then:

```sh
node --import ./tests/offline-network.mjs scripts/mac-recovery-drill.mjs --offline
```

This uses in-memory credentials. The runner blocks global fetch and supplies fixed mock responses.
It checks uncertain refresh and retry prevention, cancellation, partial reset failure, deliberate
reset and verified absence, incomplete lock preservation, cleanup-only and dual failures, and mock
reconnect with configured-shop identity verification. Only fixed stage results are printed.

## Exact test-only Keychain actions, after authorization

On macOS, the separately authorized command is:

```sh
node --import ./tests/offline-network.mjs scripts/mac-recovery-drill.mjs --keychain
```

The command generates and prints a new service name of the form
`etsySellerAssistant-recovery-drill-<random UUID>`. Through the production protected-store adapter,
every native operation is redirected to that service. Its only accounts are `accessToken`,
`refreshToken`, `appKeystring`, and `appSharedSecret`; every value is fabricated.

The drill writes and reads those entries, verifies cancelled reset leaves them intact, simulates a
deletion denial after one successful deletion, retries deliberate reset and verifies absence,
then stores a mocked replacement connection. Finally it attempts deletion and absence verification
for all four accounts, even if an earlier operation fails, and removes its temporary directory.
No existing service is enumerated or read. The ordinary `etsySellerAssistant` service and application
support directory are never passed to native storage or file operations by this runner.

macOS may request permission for the test-only entries. Stop if a prompt names an unrelated service.
Do not provide a password or screenshot in chat. A failed drill exits nonzero with sanitized output;
do not count it as acceptance. Retain the printed test namespace locally to investigate any
unverified Keychain cleanup. An abrupt process termination can leave fabricated test entries or a
temporary directory; remove only the exact test resources after verifying the drill has stopped.
Never use the production reset command to clean up this drill.

## Evidence and owner review

Record the reviewed PR/head, actual executed source commit, macOS and Node versions, mode, stage
results, and verified cleanup. Keep generated output, random namespaces and local paths outside Git.
Do not record credentials, live shop data or raw native errors.

Current evidence (1 November 2026): offline and separately owner-authorized Keychain modes passed all eight stages and verified cleanup on macOS 27.0.1, Node 24.11.1, npm 11.6.2. Executed drill source matches reviewed PR #10 head `1ecac27ca79c820892fc1d3d0406b8b639be76ec`; subsequent evidence-only documentation edits do not change that executable. All five checks passed on that head. Local validation passed 178 offline tests.
Automated tests cover the complete drill, failure cleanup, explicit mode selection, native adapter
namespace isolation and unique service generation. Keychain mode completed with exit 0 and verified absence of all four fabricated entries and the temporary directory.
On 1 November 2026, after reading the record and receiving the test summary and limitations, the product owner accepted the isolated Mac recovery results as understandable. This accepts the bounded drill and its documented behavior; it does not assert code expertise, live Etsy recovery acceptance, or release authorization.

The owner review of this isolated drill is complete. Keep real Etsy revocation/reauthorization, interactive CLI
prompts, and recovery of the healthy connection explicitly untested by this drill. T-008 may only be
closed to the extent that its acceptance criteria are actually satisfied; any remaining criteria
need explicit owner disposition. Release publication remains a separate authorization.
