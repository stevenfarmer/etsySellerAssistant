# etsySellerAssistant

A local-first MCP assistant for reviewing listings in one owner-authorized Etsy shop. Codex Desktop communicates with the local server over STDIO. No listing changes are available in the read-only alpha.

## Current release

[`v0.1.0-alpha.1`](https://github.com/stevenfarmer/etsySellerAssistant/releases/tag/v0.1.0-alpha.1) is a public GitHub prerelease of a local, single-shop tool. The shop owner completed OAuth on a Mac; an owner-confirmed Codex Desktop listing read and a separate bounded list-and-detail check passed. CI tested macOS and Windows with Node 24 and 26, but Windows live credential storage and browser authorization remain unverified. v1 targets macOS with Codex Desktop only; Windows manual acceptance is deferred. Mac recovery and release readiness remain open.

There are two server entry points:

| Entry point         | Behavior                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `dist/src/index.js` | Default status-only scaffold; no Etsy requests.                                                                               |
| `dist/src/alpha.js` | Opt-in read-only alpha; status, bounded active-listing pages, and listing detail for IDs returned in the same server session. |

The Etsy documentation MCP and this project’s shop-connected local MCP are separate connections. Starting the alpha server does not itself contact Etsy; listing tools may refresh a token, verify shop identity, and read listings. Listing content is untrusted data. No writes, orders, buyer data, or generic API tool are exposed.

## Next release candidate

The development version is `0.1.0-alpha.2`; it has not been published. It includes the refresh recovery fixes and current macOS/Codex guidance. See the [draft release notes](docs/releases/v0.1.0-alpha.2.md) and [candidate checklist](docs/release-checklist.md#v010-alpha2-candidate). The installation instructions above and below describe the published alpha.1; candidate verification uses the exact commit recorded in the release PR.

For the staged path from this candidate to stable v1, see the [v1 delivery plan](docs/v1-delivery-plan.md).

## Version roadmap

- **v1:** macOS with Codex Desktop, local STDIO, owner-authorized read-only listing review, Keychain storage, repeatable setup and recovery.
- **After v1:** package and document installation as a local STDIO MCP server for other agents, apps, and IDEs; verify each supported client on macOS.
- **v2 or later:** Windows setup, Credential Manager, browser authorization, recovery, and client acceptance.
- **Exploratory:** Linux, subject to a credential-store design and explicit platform acceptance; no version commitment.

The server already uses standard MCP over STDIO. Other clients need installation and compatibility acceptance work. Existing Windows adapters and CI remain regression coverage, not a support claim. This roadmap does not authorize Etsy writes or broader scopes. See [ADR 0004](docs/decisions/0004-v1-platform-scope.md).

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
- [v1 readiness evidence](docs/v1-readiness.md)
- [Release checklist](docs/release-checklist.md)
- [Next-phase plan](docs/next-phase-plan.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Decision records](docs/decisions/)

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
