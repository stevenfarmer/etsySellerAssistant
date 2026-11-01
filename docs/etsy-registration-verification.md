# T-007: Seller App registration and OAuth verification

Status: Seller App approved, callback saved, and owner-authorized Mac connection reported
successful; bounded Mac listing and detail reads passed. Last reviewed on 31 October 2026.
Final task acceptance remains open. Windows live verification is deferred to v2 or later and is not a v1 requirement. Further live credential handling
and Etsy requests remain separately gated. The default MCP server remains status-only; the
separate opt-in alpha entry point exposes bounded read-only listing tools.

## Latest portal evidence: Seller App approved

The first owner-consent test reached the registered HTTP localhost callback, but the verifier rejected
the response because Etsy included an issuer parameter not yet allowed by the validator. The code
now accepts only the expected Etsy issuer when present and rejects duplicate or mismatched issuer
values. The authorization code was not exchanged in that attempt. On the fresh retry, the operator
reported `Local operation connected` on the Mac. The implemented verifier reports this only after a
token exchange, the exact `listings_r` grant check, the configured-shop owner identity check, and
local token storage. This is reported live evidence for those checks; it is not a listing-read test.
No callback values, credentials, or shop identifiers are recorded here.

On 31 October 2026, the operator supplied a dashboard screenshot showing **App approved!** and an
**Approved** status under **Seller Apps**, following registration from the owner login. This is
evidence of completed registration and Etsy app approval. A later owner-authorized connection was
reported successful as described above. No credential values or
screenshots are copied into the repository or tracker.

A subsequent menu screenshot shows **Edit callback URLs**, **Rotate shared secret**, and
**Go to Webhook portal**. The supplied **Edit Your App → Callback URLs** screenshot states that
callback URLs must start with `http://` or `https://`, the host must be a domain name, and IP addresses
such as `127.0.0.1` are not allowed. It shows **Add callback URL** and **Save**, with no callback entry
visible. This is evidence of the portal's displayed registration rules, not acceptance of `localhost`
or an HTTP authorization redirect.

The subsequent screenshot shows the exact Quick Start callback,
`http://localhost:3003/oauth/redirect`, without a visible field-validation error. The operator then
confirmed that it **persists** after saving and reopening. This establishes portal acceptance and
save/readback of that exact URL. It does not establish successful OAuth redirection or token exchange.
Do not start a live OAuth flow without explicit authorization for that step and the outstanding
review. The local connection command has since succeeded with a live owner grant on the Mac.

## Earlier portal evidence: owner reaches Seller App form

On 31 October 2026, the operator supplied a screenshot reported to be from the owner login. It shows
**Create a Seller App** with **App name** (140-character limit) and **Why do you want to use the API?**
(500-character limit). No Website URL field appears in the supplied form. This establishes access to
the owner registration form, not app submission, approval, callback acceptance, or OAuth success.

## Earlier portal evidence: Shared Access registration rejected

On 31 October 2026, a supplied screenshot of **Create a Seller App** showed the rejection:
**You need an active Etsy shop to create a seller app.** The operator had confirmed the session used
a separate Shared Access account. The tested account therefore cannot register a Seller App through
this flow. The owner subsequently reached the form and registered an approved Seller App. This
registration rejection does not establish an OAuth delegation
result; no delegated OAuth test has occurred.

The operator also reported adding an Etsy MCP plugin; its connection diagnosis is recorded below.

## Earlier portal evidence: Personal App form

On 31 October 2026, the operator confirmed using a separate Shared Access account and choosing
**Create a personal app**. Supplied screenshots show access to a **Create a New App** form with a
required Website URL, app description, audience, commercial-use, and capability fields. They do not
show submission, approval, a callback configuration, or successful shop authorization. No screenshots
or account/shop identifiers are stored in the repository.

This establishes access to Personal App registration only. It does not establish Seller App
eligibility or OAuth access to the shop through Shared Access. The website requirement applies to
this observed Personal App form; it is not evidence about the Seller App form.

The tested [Seller App registration page](https://www.etsy.com/developers/register-seller-app)
rejected the Shared Access account as described above. Do not submit the Personal App form solely
to test Seller App eligibility. The
[Personal App registration page](https://www.etsy.com/developers/register) is a distinct route.
If a Personal App is considered instead, review its approval conditions, owner consent, and project
scope before treating it as the chosen approach. Registration alone never proves shop access.

The observed form also warns against instructing other users to generate API keys. Earlier wording
about every adopter registering their own app must not be treated as an approved distribution or
onboarding model. Resolve its applicability with Etsy before offering that workflow to other sellers.
The current investigation concerns the initial authorized installation only. Describe AI-assisted
listing review accurately in any eventual application purpose, and review the
[current API Terms](https://www.etsy.com/legal/api/) before submission or live API use. App approval
has now been observed; permitted-use questions and approval of later purpose changes remain open.

## Owner instructions: registration first

1. On your own computer, open the [Etsy Developer Portal](https://www.etsy.com/developers/).
   Sign in directly to Etsy using the shop owner's account. Keep the password and two-factor codes
   private. Shared Access members cannot access shop Apps/settings; do not share the owner's login.
2. Choose **Create a seller app**, then **Get started**. Confirm the portal describes access to your
   own shop only. If you already have a registered app or the portal reports an eligibility problem,
   stop and report the generic status rather than creating a different app type.
3. Enter a seller-neutral app name accepted by Etsy. Suggested intended-use wording to review:

   > A private assistant for managing my own Etsy shop, using a local MCP server and Codex Desktop.
   > Development will begin with AI-assisted listing review and suggestions. Planned expansion
   > includes owner-confirmed listing updates and other shop-management workflows as needs are
   > defined. Access will be limited to the permissions required for each approved feature. It will
   > not serve other sellers.

   Read Etsy's terms yourself before submitting. This guide does not accept terms or submit the
   registration for you. This historical registration wording described planned use; the opt-in alpha now has read-only Etsy access.
   The description is 394 characters when pasted as one paragraph. Disclosing the later phase does
   not authorize writes or change the read-only MVP. Etsy's
   [API Terms, section 3](https://www.etsy.com/legal/api/) require prior approval of application
   purpose and updates; the later write phase remains subject to Etsy review, the project's separate
   owner-approved design, and the necessary OAuth scope authorization.

   Roadmap clarification (31 October 2026): the operator wants the long-term private-shop tool to
   remain extensible. Orders, receipts, buyer information, payments, and messages are not permanently
   ruled out by the registration description. No such feature is currently approved or implemented;
   the existing MVP exclusions and data-minimization rules remain in effect until a concrete scope
   change is agreed and documented. Do not request speculative permissions now. The firm audience
   boundary is one authorized shop; the tool will not serve other sellers.

4. Note whether the Seller App form asks for a website URL. The official Seller App guide currently
   lists app name and intended use, with no initial website field. A required website was observed
   on the Personal App form, so keep the routes distinct. If one appears on the Seller App form,
   report its generic requirement/help text. Do not invent a website or assume the GitHub repo is accepted.
5. Complete registration if the form and terms fit the intended use. Check the resulting app status
   in Etsy. Report only **not submitted**, **pending**, **approved/active**, or **rejected**, plus any
   non-sensitive requirement that prevents progress. Never copy keys or secrets into chat or Drive.
6. Inspect the app settings for callback/redirect fields and their help text. Report whether a field
   exists and whether it requires HTTPS or domain verification. Do not start consent or change a
   callback to a public service at this stage. The local callback and connection command are tested
   with mocks and was subsequently verified with an owner-authorized live connection on the Mac.

Do not send credential/settings screenshots, full authorization URLs, callback query strings, API
responses, account identifiers, shop names/URLs/IDs, or listing data. Keep generated credentials private on the owner's
computer; credential setup and storage belong to the separately reviewed T-008 design. Do not put
them in this repository, synced project notes, Codex MCP configuration, or GitHub.

## Current scope decision — 1 November 2026

The owner deferred delegated access to the very low-priority backlog (T-016/P3), with no target date. It is not required for v1 and remains untested. T-007 now concerns owner-authorized registration and OAuth only. Its remaining owner-path criteria still require evidence reconciliation; this decision alone does not mark T-007 Done. The evidence table and completion history below retain their original observations.

## Evidence and remaining gates

| Gate                      | Official evidence reviewed                                                                                                                          | Evidence still needed                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| App model                 | Owner-login registration produced an approved Seller App. The separate Shared Access account was rejected by Seller App registration.               | Owner-authorized Mac connection reported successful; delegated OAuth and alternative app models remain unverified.         |
| Registration and approval | Portal dashboard shows App approved and Approved under Seller Apps after owner-login registration.                                                  | Registration/approval milestone met; owner-authorized Mac connection reported successful.                                  |
| Website                   | Owner-login Seller App screenshot shows app name and API-use fields, with no Website URL field. Earlier Personal App form requires Website URL.     | Confirm any later settings or domain-validation requirements after registration.                                           |
| Authorizer                | Shared Access excludes Apps/settings. This does not establish a supported delegated OAuth route.                                                    | Owner performs registration and initial consent; any alternative requires explicit Etsy confirmation.                      |
| Callback                  | Portal accepts and persists `http://localhost:3003/oauth/redirect`, confirmed by operator save/readback. IP-address hosts are prohibited by the UI. | Controlled OAuth redirect/token verification or Etsy clarification; save/readback does not resolve authorization behavior. |
| Permissions               | MCP endpoint checks show `getListingsByShop` requires `listings_r`; `getListing` and `getShopByOwnerUserId` list app-key authentication only.       | Review this proposed minimum with the owner; verify actual granted scopes and enforce one-shop guards.                     |

Sources: [Seller App registration](https://help.etsy.com/hc/en-gb/articles/41918478450967-How-to-Register-a-Seller-App-with-Etsy-s-API),
[app models](https://developers.etsy.com/documentation/),
[Shared Access](https://help.etsy.com/hc/en-us/articles/43600112070807-Shared-Access-for-Etsy-Shop-Owners),
[Authentication](https://developers.etsy.com/documentation/essentials/oauth2/),
[Quick Start](https://developers.etsy.com/documentation/tutorials/quickstart/), and
[API reference](https://developers.etsy.com/documentation/reference/).

## Etsy Dev MCP connection diagnosis

The [official Etsy Dev MCP](https://developers.etsy.com/documentation/mcp_server/devmcpserver/)
documents Streamable HTTP at `https://mcp.api.etsycloud.com/mcp`. The operator's plugin-settings
screenshot matches that URL and shows no authentication configured. The installed local wrapper
references the remote app; it contains no local MCP transport or credentials. Its absence from the
local `mcp_servers` table alone does not establish a configuration error.

A direct, unauthenticated protocol check on 31 October 2026 returned:

- `initialize`: HTTP 200, server `etsy-openapi-mcp` version `1.0.0`.
- `notifications/initialized`: HTTP 202.
- `tools/list`: HTTP 200, eight advertised tools.
- `tools/call` for `learn_etsy_api` with empty arguments: HTTP 200, documentation returned, no tool error.

These checks initially demonstrated server availability from the operator's computer while the
operator reported that **Refresh tools** completed without exposing tools. The custom plugin inherits
the default permission for low-risk actions, with no plugin-specific restriction found. The original
client or account-side cause was not identified.

As a recovery path, the verified endpoint was added to this host's Codex configuration using the
official CLI:

```sh
codex mcp add etsyDeveloperDocs --url https://mcp.api.etsycloud.com/mcp
codex mcp get etsyDeveloperDocs
```

CLI readback confirms `enabled: true`, `transport: streamable_http`, the expected URL, and no bearer
token or headers. The existing custom plugin was left unchanged. On a later tool-catalog check on
31 October 2026, both **Etsy MCP Tool** and **etsyDeveloperDocs** exposed callable tools.
`learn_etsy_api` returned documentation successfully through each connection with no tool error.
Endpoint lookups through the plugin also succeeded. Both connections are now verified for
documentation use; the exact cause of the earlier discovery failure remains unknown.
At the operator's request for one connection, `codex mcp remove etsyDeveloperDocs` removed the
duplicate direct configuration on 31 October 2026. Configuration readback confirms it is absent;
the retained **Etsy MCP Tool** plugin still returns guides successfully. Keep that single working
documentation connection. Old tool names may remain in an already-loaded session until its catalog
reloads; they are not an additional saved configuration.
See [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Do not change the endpoint URL, add shop credentials, or treat direct protocol success as native
plugin success. No shop API call or shop data was involved. This documentation service does not
replace the project's future owner-authorized Etsy connection.

## Proposed OAuth approach for review

Use owner consent through Etsy's browser flow with Authorization Code + PKCE S256 and a
cryptographically random, single-use state value. Use an exact registered redirect URI, validate state
before token exchange, and keep OAuth material in the local process and protected credential store.
The project's state-validation requirement remains mandatory even where Etsy describes it as
recommended. Windows Credential Manager/macOS Keychain, refresh, revocation, and recovery details
remain T-008 work.

MCP endpoint lookups on 31 October 2026 confirmed the following documentation requirements:

| Operation              | Method and path                                | Documented authentication                                           |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| `getListingsByShop`    | `GET /v3/application/shops/{shop_id}/listings` | App key and OAuth `listings_r`                                      |
| `getListing`           | `GET /v3/application/listings/{listing_id}`    | App key; owner-only optional features may have further requirements |
| `getShopByOwnerUserId` | `GET /v3/application/users/{user_id}/shops`    | App key                                                             |

This supports `listings_r` as the proposed minimum for the selected read-only workflow, subject to
owner acceptance and actual grant verification. App-key access alone does not prove owner consent
or enforce the project's one-shop boundary. Do not copy tutorial permissions wholesale. Do not add `shops_r`, profile/email,
transaction, address, write, or delete scopes without an endpoint-backed need and the applicable scope
review. In particular, `listings_w` and `listings_d` are outside the read-only release. Local identity
checks must still fail closed for an unexpected shop, even with a Seller App.

## Callback verification: a separate reviewed step

`http://localhost:3003/oauth/redirect` is now **saved and persistent in the portal**, based on operator
confirmation and the owner-authorized Mac OAuth round trip. The live portal explicitly excludes
IP-address hosts; do not substitute `127.0.0.1`. Another port,
path, scheme, or trailing slash would be a different callback. Do not send an authorization code to
an unowned domain or a callback inspection service.

The portal's HTTP/HTTPS help text and successful save/readback establish HTTP localhost acceptance
for registration; the operator subsequently reported a successful HTTP localhost authorization.

After registration, agree a concrete manual verification method and review its security before
running it. Any temporary receiver must be confined to loopback, short-lived, validate state, avoid
logging callback queries/codes, and handle cancellation and timeout. Register and use exactly the
same scheme, host, port, path, and trailing slash. Record separately whether the portal saved the
callback and whether the authorization redirect actually reached the reviewed receiver. Report only
pass/fail and sanitized error categories, never OAuth material. The owner-authorized Mac verification
was reported successful.

If Etsy rejects local callbacks or requires an incompatible domain, obtain Etsy clarification first.
An HTTPS callback bridge would add hosting, trust, and maintenance obligations and needs a scope
decision before implementation. Do not silently introduce a tunnel, external relay, hosted service,
or disabled TLS verification.

## Completion record

On 30 October 2026, the operator reported: app **not created**, owner **needs instructions**, portal
website/callback fields **not checked**. On 31 October, the operator reached the **Personal App** form
using a **separate Shared Access account** and supplied form-field evidence. A subsequent Seller App
page screenshot showed that account rejected for lacking an active Etsy shop. A later owner-login
screenshot reached the Seller App form with app name and API-use fields and no visible website field.
The subsequent dashboard screenshot showed the Seller App approved. Registration and approval are
verified by portal evidence. The operator confirmed the exact HTTP localhost callback persists after
save/readback. The duplicate Etsy documentation MCP connection was removed; the Etsy MCP Tool
plugin remains. The owner-authorized Mac connection was reported successful after the verifier's
grant and shop identity checks. A separately authorized Mac listing and detail read has passed;
delegated OAuth remains unverified.
T-007 final acceptance remains open. The T-008 connection design and T-009 read-only alpha
have been implemented and exercised on the Mac; this does not establish final task acceptance
or Windows live compatibility. The historical implementation gates described above must not
be read as a claim that these features are still unimplemented.

Record only seller-neutral results in the project tracker: app type/status, owner availability,
website/callback requirements, generic callback test outcome, permission decision, evidence date,
and remaining blockers. Store actual shop identity only in future ignored local configuration.
Mark T-007 complete only after its registration, website, callback, permissions, and authorizer
criteria have evidence and product-owner acceptance. A checklist or documentation review alone does
not close the gate.

## Optional Etsy support question

On 31 October 2026 the product owner accepted the unresolved terms risk for now and chose not to
contact Etsy at this time. The question below is retained for possible future use; it is not a
current prerequisite. It contains no shop identifier or credentials; add any details Etsy requires
only through its official support channel. The separate technical and live-access gates still apply.

> We have an approved Seller App for a single shop. We are developing a local tool that, with the
> shop owner's OAuth consent, reads that shop's listing data through the Etsy API and supplies
> selected listing text to an AI assistant for review and suggested edits. The first version makes
> no listing changes and serves no other sellers. Do API Terms sections 5.24–25 or any other Etsy
> terms require separate written permission for this workflow, including using the listing text in
> an AI prompt? If so, what approval process and conditions apply? Does Seller App approval itself
> authorize this specific use? Also, is an HTTP localhost callback supported for a local OAuth app?
