# etsySellerAssistant

A local-first MCP assistant for reviewing listings in one owner-authorized Etsy shop. Codex Desktop communicates with the local server over STDIO. No listing changes are available in the read-only alpha.

## Current release

[`v0.1.0-alpha.1`](https://github.com/stevenfarmer/etsySellerAssistant/releases/tag/v0.1.0-alpha.1) is a public GitHub prerelease of a local, single-shop tool. The shop owner completed OAuth on a Mac; an owner-confirmed Codex Desktop listing read and a separate bounded list-and-detail check passed. CI tested macOS and Windows with Node 24 and 26, but Windows live credential storage and browser authorization remain unverified. v1 targets macOS with Codex Desktop only; Windows manual acceptance is deferred. The owner accepted the isolated Mac recovery drill; final v1 product/limits acceptance and publication remain pending.

There are two server entry points:

| Entry point         | Behavior                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `dist/src/index.js` | Default status-only scaffold; no Etsy requests.                                                                               |
| `dist/src/alpha.js` | Opt-in read-only alpha; status, bounded active-listing pages, and listing detail for IDs returned in the same server session. |

In the unpublished development candidate, alpha `get_setup_status` starts with
`etsyAccess: not_checked`. After a complete successful listing read, it reports
`verified_this_session` and a `connection` object containing the verified numeric owner/shop IDs
and `lastVerifiedAt` (UTC). This is evidence from that read, not a live health check.
A later pending or failed read clears it; restarting starts fresh. Status itself reads no
credentials/settings and makes no Etsy request. Outside changes to authorization or configuration
are not detected until a listing read or restart. The default scaffold's status remains unchanged.

The Etsy documentation MCP and this project’s shop-connected local MCP are separate connections. Starting the alpha server does not itself contact Etsy; listing tools may refresh a token, verify shop identity, and read listings. Listing content is untrusted data. No writes, orders, buyer data, or generic API tool are exposed.

## Work toward v1

The development version still reads `1.0.0`, but the current read-only build is **not a complete v1 candidate**. On 1 November 2026 the owner confirmed that v1 must include intelligent, sales-oriented listing recommendations and applying approved title, description and tag edits. Publication of the read-only build as stable v1 is on hold. See [ADR 0005](docs/decisions/0005-v1-intelligence-and-guarded-edits.md) and the [review workflow requirements](docs/intelligent-listing-review.md). No write capability or broader permissions have been implemented or enabled. Published alpha.1 installation remains below.

For the small deliverables and gates to stable v1, see the [phase-gated plan](docs/v1-phase-gates.md) and [current checkpoint](docs/work-checkpoint.md). Work proceeds one chunk per continuation by default. The plan also separates a public generic guidance template from a private customizable playbook outside the repository; the storage foundation and [generic template](templates/playbook.example.md) are implemented in chunk 1A, while MCP delivery remains chunk 1B. No private file is loaded by the existing server. See [the storage contract](docs/private-playbooks.md). See [ADR 0006](docs/decisions/0006-private-playbooks-and-delivery-checkpoints.md).

## Version roadmap

- **v1:** macOS with Codex Desktop, local STDIO, owner-authorized listing reads, evidence-based recommendations, guarded approved title/description/tag edits, local audit history, Keychain storage, and repeatable setup/recovery. Reads are delivered; the expanded intelligence/editing workflow remains to be built and reviewed.
- **Very low-priority backlog:** delegated access, with no target date; v1 uses owner authorization only.
- **After v1:** package and document installation as a local STDIO MCP server for other agents, apps, and IDEs; verify each supported client on macOS.
- **v2 or later:** Windows setup, Credential Manager, browser authorization, recovery, and client acceptance.
- **Exploratory:** Linux, subject to a credential-store design and explicit platform acceptance; no version commitment.

The server already uses standard MCP over STDIO. Other clients need installation and compatibility acceptance work. Existing Windows adapters and CI remain regression coverage, not a support claim. The editing requirement does not authorize live writes or credential changes; scope and security/design review must precede implementation of write access. [ADR 0004](docs/decisions/0004-v1-platform-scope.md) retains the platform decision; ADR 0005 changes the v1 feature boundary.

## First-time Mac alpha setup

1. Install Git and Node.js 24 or 26 with npm 10 or later. Verify with `git --version`, `node --version`, and `npm --version`.
2. Clone the project and select the prerelease:

   ```sh
   git clone https://github.com/stevenfarmer/etsySellerAssistant.git
   cd etsySellerAssistant
   git checkout v0.1.0-alpha.1
   npm ci
   npm run validate
   npm run build
   ```

   Validation uses fabricated data and makes no Etsy requests. The checkout points to a fixed tag; use a separate branch for development. The published tag has its own historical documentation; current corrections and release process are on the main branch.

3. Register an Etsy Seller App using an eligible account and configure the callback shown in the [registration guide](docs/etsy-registration-verification.md). Use the approved app for the intended shop. Never share keys, secrets, tokens, callback query strings, or shop details in project materials or chat.
4. Run `npm run local -- guided` in an interactive terminal. Enter the shop URL or name and app credentials at the hidden prompts. Input, including pasted text, is not displayed. Type `LOOKUP` when prompted to permit one read-only shop search. Setup stores credentials in the OS credential store and the shop setting locally. No email is required.
5. Run `npm run local -- connect`. Type `CONNECT` at the hidden prompt, then complete Etsy consent using the shop owner’s account. This requests `listings_r` and verifies the owner and configured shop. Do not share the authorization or callback URL. If either command fails, see [development and recovery](docs/development.md).
6. Add one local server in Codex Desktop using STDIO:

   | Field                                 | Value                                                               |
   | ------------------------------------- | ------------------------------------------------------------------- |
   | Name                                  | `etsySellerAssistant`                                               |
   | Command                               | `node` (or the full Node executable path)                           |
   | Arguments                             | One argument: the absolute path to `dist/src/alpha.js` in the clone |
   | Working directory                     | The absolute path to the repository root                            |
   | Environment variables and passthrough | Leave empty                                                         |

   Use separate command and argument fields. If Codex cannot find Node, run `command -v node` and use the resulting executable path. Restart Codex if Node was installed while it was open.

7. Open a fresh chat and confirm `get_setup_status`, `list_active_listings`, and `get_listing` are available. After owner authorization, request a small active-listing page and check it locally. To get details, use a listing returned in the same server session. The status tool alone does not prove a live shop connection.

Windows is future work, tentatively v2 or later, and has not been manually tested. It is not a v1 acceptance requirement. For a status-only setup use `dist/src/index.js` as the server argument; it needs no Etsy credentials or OAuth.

## Updating, troubleshooting, and cleanup

For development updates, switch to the intended branch, pull its changes, and run `npm ci`, `npm run validate`, and `npm run build`. Rebuild after changes and update the MCP path if the checkout moves. A Git checkout at a release tag will not follow later documentation corrections automatically.

To correct a shop selection or repeat setup, stop local app instances and follow the deliberate `npm run local -- reset` procedure in the [development guide](docs/development.md). Reset deletes this computer’s stored app credentials, tokens, and shop setting; it does not delete the Seller App or revoke Etsy authorization. Do not reset merely to retry a successful connection. For a stuck refresh or lock, follow the recovery guidance before removing anything.

If the server does not start, check the Node path, working directory and selected entry point, then run `npm ci` and `npm run build`. An STDIO server started manually waits for a client; stop it with Ctrl-C. Remove the local server using the client’s MCP settings when no longer needed.

## Project documentation

- [Architecture and diagrams](docs/architecture.md)
- [Seller App registration and OAuth verification](docs/etsy-registration-verification.md)
- [Mac alpha review and test plan](docs/mac-alpha-review.md)
- [Development and recovery](docs/development.md)
- [Current requirements, use cases and acceptance](docs/requirements-and-acceptance.md)
- [Required tracking process](docs/project-tracking.md)
- [v1 readiness evidence](docs/v1-readiness.md)
- [Release checklist](docs/release-checklist.md)
- [Next-phase plan](docs/next-phase-plan.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Decision records](docs/decisions/)

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
