# etsySellerAssistant

A local MCP server that gives an AI application a bounded set of tools for assisting with an Etsy shop. The server runs on the user's computer and communicates with MCP clients over STDIO.

AI tools have assisted with development. The project is a seller-assistance tool, not an AI platform.

## What it does

- Reads a bounded page of active listings and details for a listing returned in the current server session.
- Uses general guidance or a separately stored private seller guide when assisting with a shop.
- Guides a photo-based conversation to prepare a complete listing draft, asking for missing product facts and revising from feedback.
- Checks draft title, description, and tags against local format limits.
- Prepares recommendations for existing listings.
- Provides an on-request research workflow for public price comparisons and timely marketing ideas; the connected AI application performs any web search.
- Can apply an explicitly accepted change to a listing's title, description, or tags, then verify the result and record a local audit entry.

The photo conversation stays in the connected AI application. The MCP server does not upload or save photos, create a listing, or publish a draft. Listing edits require separate edit access and an exact host confirmation. The server does not expose orders, buyer records, or arbitrary Etsy API calls.

An AI application's web research may help with current market comparisons or marketing ideas when requested. Research should cite dated sources, explain how examples compare, distinguish asking prices from completed-sale evidence, and state uncertainty. The MCP server itself does not search other marketplaces.

## Releases

The published [v0.1.0-alpha.1 release](https://github.com/stevenfarmer/etsySellerAssistant/releases/tag/v0.1.0-alpha.1) is an earlier read-only build. The current source includes the additional capabilities described above. Check the release notes and source revision you install before using an installation for live shop access.

## Install and connect

The server requires Node.js 24, 25, or 26 and npm 10 or later. The verified desktop setup is macOS with Codex Desktop. Other MCP clients may use the standard STDIO interface, but compatibility has not been verified.

```sh
git clone https://github.com/stevenfarmer/etsySellerAssistant.git
cd etsySellerAssistant
npm ci
npm run validate
npm run build
```

See [development and setup](docs/development.md) for the Etsy connection, MCP client configuration, private guidance, and recovery instructions.

## Guides

- [Architecture and workflows](docs/architecture.md)
- [Development and setup](docs/development.md)
- [Seller App and local authorization](docs/etsy-registration-verification.md)
- [Listing drafts and reviews](docs/draft-review-workflow.md)
- [Recommendations and draft checks](docs/intelligent-listing-review.md)
- [Private seller guidance](docs/private-playbooks.md)
- [Reviewing and applying listing edits](docs/local-editing.md)
- [Local audit records](docs/local-audit.md)
- [Security](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

The project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
