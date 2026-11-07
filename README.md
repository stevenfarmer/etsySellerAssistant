# etsySellerAssistant

etsySellerAssistant is a local MCP server for Etsy sellers. It helps review listings in one owner-authorized shop and is being developed to prepare carefully guarded edits. It uses standard MCP over STDIO. The published alpha is read-only. Codex Desktop on macOS is the current verified setup; other clients have not been tested.

AI tools have helped with parts of development. The owner sets product direction and accepts releases; the maintainer reviews the code and release evidence.

## Current release

[`v0.1.0-alpha.1`](https://github.com/stevenfarmer/etsySellerAssistant/releases/tag/v0.1.0-alpha.1) is the only published release. It is a local, single-shop tool. The owner completed OAuth on a Mac, and Codex Desktop passed the owner-confirmed listing-read and bounded list-and-detail checks. CI covers macOS and Windows with Node 24 and 26; Windows live credential storage and browser authorization remain unverified. The current v1 acceptance target is macOS with Codex Desktop. Other clients and Windows have not been accepted for v1. The owner accepted the isolated Mac recovery drill; final v1 product/limits acceptance and publication remain pending.

There are two server entry points:

| Entry point         | Behavior                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist/src/index.js` | Default status-only scaffold; no Etsy requests.                                                                                                                                                                                       |
| `dist/src/alpha.js` | Opt-in development alpha; bounded listing reads, review guidance, draft checks, and guarded title/description/tag proposal and apply tools. Applying requires a separately authorized edit grant and a configured local audit folder. |

In the unpublished development candidate, alpha `get_setup_status` starts with
`etsyAccess: not_checked`. After a complete successful listing read, it reports
`verified_this_session` and a `connection` object containing the verified numeric owner/shop IDs
and `lastVerifiedAt` (UTC). This is evidence from that read, not a live health check.
A later pending or failed read clears it; restarting starts fresh. Status itself reads no
credentials/settings and makes no Etsy request. Outside changes to authorization or configuration
are not detected until a listing read or restart. The default scaffold's status remains unchanged.

The Etsy documentation MCP and this project’s shop-connected local MCP are separate connections. Starting the alpha server does not itself contact Etsy; listing tools may refresh a token, verify shop identity, and read listings. Listing content is untrusted data. Only the opt-in unpublished development alpha exposes the fixed, guarded listing-edit flow described below; the default server remains status-only. Orders, buyer data, and arbitrary API calls are not exposed.

The unpublished development alpha's `prepare_listing_edit` tool creates an in-memory, five-minute
proposal and immediately asks the connected MCP client for explicit confirmation after a fresh
listing read. The form shows the listing and exact current/proposed values without exposing the
proposal's internal binding data. The form uses one host-level Accept/Deny choice, with no extra
yes/no field. Accept approves these exact changes. The assistant then immediately calls
`apply_listing_edit`, which accepts only the approved proposal ID and consumes that approval once.
It rechecks identity and listing state, writes an audit intent, sends one fixed
title/description/tags update, then verifies or reconciles the result. Clients without MCP
form-elicitation support fail closed. The Mac check confirmed that
the readable form opens in the same call. The owner found the earlier checkbox plus footer buttons
confusing; T-032 removed the redundant field. In the follow-up Mac check, the single host choice
was accepted and a fresh read confirmed no listing change. The owner found the revised prompt clear
enough to merge. During T-031 Mac acceptance, the owner found the review useful and authorized one
exact edit; the apply result and fresh read verified it, and the local audit outcome was recorded.
This development workflow is not part of published alpha.1. Final v1 acceptance remains T-012.
See [guarded editing](docs/local-editing.md) for local setup and recovery.

## Work toward v1

The development version still reads `1.0.0`, but the current build is **not a complete v1 candidate**. On 1 November 2026 the owner confirmed that v1 must include intelligent, sales-oriented listing recommendations and applying approved title, description and tag edits. Publication of the read-only build as stable v1 is on hold. See [ADR 0005](docs/decisions/0005-v1-intelligence-and-guarded-edits.md) and the [review workflow requirements](docs/intelligent-listing-review.md). T-031 Mac usefulness and guarded-edit acceptance is complete; T-035's confirmation-copy refinement is also complete, and final product acceptance remains T-012. The published alpha remains read-only. Published alpha.1 installation remains below.

For the small deliverables and gates to stable v1, see the [phase-gated plan](docs/v1-phase-gates.md) and [current checkpoint](docs/work-checkpoint.md). The plan separates a public generic guidance template from a private customizable playbook outside the repository. In the alpha, MCP initialization tells the connected agent to retrieve guidance before shop assistance. The tool selects the private file when present and otherwise returns general guidance; the agent should say when advice is not customized and invite setup. Private text goes to the selected AI provider when retrieved. There is no separate enable setting; disabling the MCP server turns this behavior off. Startup and status do not read the file. See [the storage contract](docs/private-playbooks.md) and [ADR 0006](docs/decisions/0006-private-playbooks-and-delivery-checkpoints.md).

In the unpublished development build, restart an already running MCP process to receive its
connection instructions. A connected client is asked to call `get_review_guidance` at the start of
seller-assistance conversations. The published alpha.1 tool inventory remains historical and
unchanged.

Chunk 2A adds a [generic review workflow and blank buyer brief](docs/draft-review-workflow.md)
and `validate_listing_draft` in the development alpha. It checks only title/description/tags
locally and returns issue codes/counts without saving or echoing draft text. A passing result
does not verify facts, predict sales or approve edits. The [fabricated worked review](docs/review-workflow-example.md)
demonstrates the workflow. Existing MCP processes pick up tool/template changes on restart;
no extra real-client acceptance gate is added to this offline development chunk.

Chunk 2B adds the [eight-case evaluation suite and manual rubric](docs/review-evaluation.md),
with dated official sources and an offline declared-evidence checker. The development run used
fabricated reviews generated and self-reviewed by the same client assistant; it is not an
independent model benchmark or sales evidence. The initial private playbook and its evaluation outputs live outside Git. Repository updates do not
replace custom guidance. Owner usefulness and one guarded edit were accepted in T-031; T-035 then
clarified the confirmation wording and apply follow-through.

## Version roadmap

- **v1:** Owner-authorized listing reads, evidence-based recommendations, guarded title/description/tag edits, local audit history, Keychain storage and repeatable setup/recovery. The server uses local STDIO MCP; macOS with Codex Desktop is the current acceptance target. T-031 usefulness/edit acceptance and T-035 confirmation UX are complete. T-039 provides first-time private-guidance setup, T-040 reviewed updates, and T-043 automatic guidance use; supported-client acceptance remains for T-043. T-036 code scanning and repository security checks are a release gate. T-037 delivers complete photo-based listing drafts; requested research remains T-038, followed by final T-012 acceptance.
- **Very low-priority backlog:** delegated access, with no target date; v1 uses owner authorization only.
- **After v1:** package and document installation as a local STDIO MCP server for other agents, apps, and IDEs; verify each supported client on macOS.
- **v2 or later:** Windows setup, Credential Manager, browser authorization, recovery, and client acceptance.
- **Exploratory:** Linux, subject to a credential-store design and explicit platform acceptance; no version commitment.

The server already uses standard MCP over STDIO. Client packaging and compatibility checks are separate work; T-015 tracks acceptance beyond the current Codex Desktop setup. Existing Windows adapters and CI are regression coverage, not a Windows support claim. The reviewed design in [T-011](docs/guarded-edit-design-review.md) and offline implementation do not themselves authorize a new credential grant or live listing change. [ADR 0004](docs/decisions/0004-v1-platform-scope.md) retains the v1 acceptance target; ADR 0005 changes the v1 feature boundary.

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

To correct a shop selection or repeat setup, stop local app instances and follow the deliberate `npm run local -- reset` procedure in the [development guide](docs/development.md). Reset deletes this computer’s stored app credentials, tokens, shop setting and local audit-folder selection; it does not delete audit files, the Seller App or revoke Etsy authorization. Do not reset merely to retry a successful connection. For a stuck refresh or lock, follow the recovery guidance before removing anything.

If the server does not start, check the Node path, working directory and selected entry point, then run `npm ci` and `npm run build`. An STDIO server started manually waits for a client; stop it with Ctrl-C. Remove the local server using the client’s MCP settings when no longer needed.

## Project documentation

- [Architecture and diagrams](docs/architecture.md)
- [Seller App registration and OAuth verification](docs/etsy-registration-verification.md)
- [Mac alpha review and test plan](docs/mac-alpha-review.md)
- [Development and recovery](docs/development.md)
- [Local audit records](docs/local-audit.md)
- [Current requirements, use cases and acceptance](docs/requirements-and-acceptance.md)
- [Required tracking process](docs/project-tracking.md)
- [v1 readiness evidence](docs/v1-readiness.md)
- [Release checklist](docs/release-checklist.md)
- [Next-phase plan](docs/next-phase-plan.md)
- [Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Decision records](docs/decisions/)

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
