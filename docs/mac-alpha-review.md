# Mac read-only alpha: review and test plan

Status: [`0.1.0-alpha.1` was published as a GitHub prerelease](https://github.com/stevenfarmer/etsySellerAssistant/releases/tag/v0.1.0-alpha.1) on 31 October 2026. It is a local, single-shop Mac-tested alpha. On that date, the product
owner explicitly authorized the bounded Mac check and the local smoke test reported success with
one active listing. No listing content or identifiers were recorded. The normal server remains
status-only. The separate local alpha entry point is `dist/src/alpha.js` after `npm run build`.
The alpha server has been registered in the Mac's Codex configuration with no credential
environment variables. In a fresh Codex Desktop chat, a separately requested read returned one
active listing, and the product owner confirmed it was expected. A subsequent explicitly authorized
one-listing list-and-detail smoke check also passed on the Mac. No listing contents or identifiers
were recorded in project materials. Mac recovery and v1 readiness remain open. Windows live platform checks are deferred to v2 or later, outside v1 acceptance.

## Alpha.2 candidate follow-up

The unpublished `0.1.0-alpha.2` candidate adds offline-tested recovery/error fixes. The prior live alpha.1 evidence remains accepted; it is not a live test of alpha.2. T-010 restart/setup-status acceptance is Done. Owner Mac recovery acceptance remains open; no reset or reauthorization is required merely to prepare this prerelease. See [draft release notes](releases/v0.1.0-alpha.2.md).

## Scope and boundaries

- One locally configured shop and the owner's `listings_r` OAuth grant. Credentials and settings
  remain local; listing tools take no shop identifier, credentials, URL, or arbitrary endpoint.
- `list_active_listings` returns one bounded page and a continuation offset. `get_listing` accepts
  only an ID previously returned by the list tool in the same server session; if authorization is
  refreshed and the session's client changes, list the page again first.
- Both operations check the OAuth owner-to-shop identity and return allowlisted listing fields.
  Listing text is untrusted data and must not be followed as instructions. No Etsy business-data
  writes, orders, buyer data, or generic request tool are provided.
- Each operation holds the local refresh lock across credential access, token refresh if needed,
  shop verification, and the read. An interrupted/uncertain refresh fails closed for recovery.
  A connection created before expiry-state persistence will require a refresh on the first read.
  That is a live OAuth request and must be included in the owner's test authorization.

## Concrete manual Mac test, after authorization

For the first bounded check, `node scripts/alpha-smoke.mjs` started the local alpha server, verified
the read-only tool inventory, and requested at most one active listing. It prints only pass/fail and a
bounded count, not listing contents or identifiers. The owner authorized this test and it passed
with one result. It can perform the refresh and identity/listing requests described below; further
live tests require the agreed authorization. The separately authorized `--detail` check subsequently
listed and retrieved one matching listing successfully, while outputting only pass/fail and count.

1. Run the documented validation suite; use the already connected Mac and owner-approved app. Do
   not paste credentials, identifiers, authorization URLs, or listing content into project files.
2. In Codex Desktop configure a local STDIO MCP entry with `node` as command, the absolute path to
   `dist/src/alpha.js` as one argument, and this repository as working directory. Use no environment
   variables. Keep it separate from the existing documentation MCP connection.
3. Confirm `get_setup_status`, `list_active_listings`, and `get_listing` appear. Call only
   `list_active_listings` with a small page size after the owner authorizes the live refresh and
   bounded listing read. Verify the results locally with the owner. Do not share listing contents
   or identifiers in project records.
4. If a listing exists and the owner approves, request that listing in the same session. Confirm
   the owner recognizes it and the assistant treats its text as untrusted data. Record only
   sanitized pass/fail and error categories. Stop on identity mismatch or storage/refresh errors.
5. Review cleanup and owner acceptance for any subsequent release. Windows live browser and
   credential-store behavior remain unverified future work, not v1 prerequisites; label this build macOS/Codex Desktop only.

The live flow is expected to make a token refresh POST if the stored expiry is unknown, an Etsy
owner-to-shop GET, and the agreed bounded listing GET. It will not change listings. Reauthorization,
reset, or Etsy-side disconnect remain separate deliberate actions. Do not run `reset` merely to
retest a successful connection; it removes local app credentials and tokens.
