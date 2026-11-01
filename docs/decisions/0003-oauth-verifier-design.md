# ADR 0003: Bounded OAuth verification design

- Status: Accepted; separately authorized Mac alpha verification has since passed. See the release addendum below.
- Date: 2026-10-31

## Boundary

The owner approved a bounded verifier to complete T-007 after security review. The existing MCP
server remains status-only until T-007 and T-008 are accepted. The verifier may eventually perform
the agreed token exchange and limited identity/listing reads only after explicit authorization for
the live step. Tests use fabricated data and never contact Etsy. The fixed registered candidate is
`http://localhost:3003/oauth/redirect`; Etsy's authentication guide still says HTTPS while Quick Start
uses HTTP localhost, so the authorization outcome is unknown.

## Security review and contracts

- Use PKCE S256 with a cryptographically random verifier (43–128 unreserved characters) and a
  cryptographically random, single-use state. Bind each pending attempt to its own verifier and state.
- Bind only loopback addresses, never wildcard or a public interface. Handle localhost's IPv4/IPv6
  resolution and fail closed if the callback cannot be served safely. Fix port 3003 and the exact path;
  close partial listeners on bind failure. Validate the remote address, Host, method, raw path, request
  size, query parameter count, and duplicate or ambiguous callback parameters.
- Validate state before handling either success or denial; atomically consume the pending attempt
  before exchange so concurrent requests cannot replay it. Close listeners after success, denial,
  cancellation, or timeout. Keep authorization URLs, codes, state, verifiers, token values, and raw
  OAuth error content out of logs, chat, MCP responses, and project files.
- Keep API keystring, shared secret, access token, and refresh token in protected OS storage only.
  A narrow async store contract exposes get/set/delete for a closed set of keys; absence, access
  denial, and backend failure must be distinguishable. No plaintext fallback is authorized.
- Review native adapter provenance, build/architecture support, licenses and deletion semantics
  before selecting a package. A candidate has documented failure-handling concerns; tests must
  verify deletion by reading back absence and distinguish backend errors. Mock tests do not prove
  Keychain or Credential Manager behavior.
- Propose `listings_r` only for the selected listing-read workflow. Verify the effective granted
  scope set and reject missing, unexpected, or unverifiable grants. One-shop checks must happen
  before reads; a public shop lookup alone does not prove OAuth consent.
- To discover an unknown shop ID, the local CLI may make one explicitly confirmed, bounded
  `findShops` GET with locally entered app credentials and a locally entered shop name. It accepts
  only one exact-name match and displays the ID only locally. It does not save the name or output
  raw responses; the later owner-granted OAuth identity check remains mandatory.
- Token exchange and refresh use a dedicated HTTPS transport with form-encoded requests, typed
  sanitized failures, and no blind retry. Serialize refresh and persist replacement tokens safely.
  Never accept credentials in command arguments, environment variables, MCP calls, or logs.

## Credential-store dependency review

The offline implementation selects the pinned MIT-licensed `@napi-rs/keyring` 2.1.2 adapter behind
the narrow store contract. Its published optional native packages include macOS arm64/x64 and
Windows x64. The reviewed 2.1.2 macOS deletion path reports underlying Keychain errors; the wrapper
also verifies absence after deletion. No plaintext fallback is provided. On macOS, a manual test
using a random test-only service name and fabricated value passed read and deletion checks. Windows
Credential Manager behavior and the full supported Node/platform matrix remain unverified.

The local CLI and coordinated token helper have been built against mocks, but the production MCP
server remains status-only. Before enabling shop reads, integrate a fresh-token provider with every
read, verify that every relevant process uses the same lock and state, and review recovery from
partially persisted credentials. The local settings implementation assumes trusted per-user
parent directories and, on Windows, inherited ACLs; it does not eliminate parent-directory symlink
or replacement races. The CLI takes a common lock during setup and connection; direct use of lower
level modules must not bypass it. These limitations must be resolved or accepted in a specific
security review before enabling shop-reading tools.

A fixed loopback start URL redirects the browser to Etsy without passing the authorization URL to
the operating-system launcher; the browser may still retain it in history or diagnostics. The start
route checks loopback, host, and replay, and its cleanup is covered by offline tests. A per-user
local lock and atomic non-secret expiry state coordinate refreshes. Stale-lock recovery is manual:
checking a PID and then renaming a lock can race with a new owner, so no automatic lock stealing is
implemented. Both approaches require cross-platform tests and security review before live use.

## Read-only Mac alpha review

The candidate alpha exposes two fixed listing GET tools through a separate opt-in STDIO entry
point. Tool inputs cannot select a shop, supply credentials, or specify an endpoint. Each operation
holds the common lock across reading local setup, obtaining a fresh token, verifying the OAuth
owner's shop, and completing the listing read. Listing IDs must first come from that shop in the
current server session, outputs are allowlisted, and raw API errors are replaced by generic errors.
Listing text is untrusted. The ordinary server remains status-only. Offline MCP, token lifecycle,
wrong-shop, and redaction tests support this review; live listing behavior and the Windows platform
remained unverified at the time of this review. A successful owner-authorized OAuth connection is recorded separately.

The existing Mac connection had no persisted expiry from its initial grant. Its first alpha read
therefore required a token refresh before identity and listing GETs. An interrupted or uncertain
refresh leaves a recovery marker and is not retried automatically. The owner must authorize that
specific refresh and read before the live test. This Mac alpha review did not mark the cross-platform
T-008 task complete.

The npm audit on 31 October 2026 reported zero production findings and 11 moderate development
dependency findings, including the minimatch glob-amplification advisory
([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). The suggested fixes
include incompatible major changes; review updates rather than applying automatic forced fixes.
Do not run repository tooling against untrusted repository configuration without reviewing it.

## Outstanding review before live use

Verify the selected OS adapter on Windows and the supported Node versions, and reconcile Etsy's
HTTP/HTTPS guidance. Prepare a specific owner-consent
test with sanitized pass/fail evidence and request authorization for that concrete step. A port
hijacker can still cause denial of service; PKCE reduces code-redemption risk but does not prevent
local malware from observing a callback. Do not introduce a hosted bridge without a requirement
change. A saved URL does not establish a successful authorization.

As reviewed on 31 October 2026, sections 5.24–25 of Etsy's
[API Terms](https://www.etsy.com/legal/api/) restrict specified automated access and requests for
analytics, machine learning, or AI training without express written authorization. Their application
to this one-shop, AI-assisted listing-review workflow is unresolved; app approval alone is not
evidence of written authorization for a specific use. Etsy's separately published
[future Terms of Use](https://www.etsy.com/legal/terms-of-use) take effect 16 December 2026 and
contain additional language concerning AI prompting with content obtained from its services. On
31 October 2026 the product owner accepted this unresolved risk for the time being and chose not to
contact Etsy now. This decision is not a determination of compliance or a waiver of Etsy's terms.
The independent technical review and explicit live-access authorization gates remain in place.

## Release addendum — 31 October 2026

The owner subsequently authorized the bounded Mac checks. OAuth, the configured-shop identity check, a Codex Desktop listing read, and a separate list-and-detail smoke test succeeded. The merged Mac-tested `v0.1.0-alpha.1` was published as a GitHub prerelease. CI covered macOS and Windows on Node 24 and 26, but Windows live credential storage and browser handoff remain unverified. T-007 delegated authorization and T-008 cross-platform and recovery acceptance remain open. The default entry point remains status-only; read-only tools are available through the separate alpha entry point.
