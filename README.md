# etsySellerAssistant

A local-first MCP assistant for Etsy sellers to review listings and draft improvements. It is designed for Codex Desktop over local STDIO, with read-only access first and explicit approval required for any future edits.

## Current status

This repository contains the project foundation and a status-only MCP tool. It does not connect to Etsy, request credentials, read shop data, or change listings.

## Supported platforms

- Windows 10/11, x64
- macOS on Apple Silicon or Intel
- Node.js 24 LTS is the baseline. CI also checks Node.js 26 LTS.

The same repository and workflow should work on Windows and macOS. Keep machine-specific paths and secrets in local configuration.

## Requirements

- Node.js 24 or 26 LTS, with npm 10 or later
- Codex Desktop with support for local STDIO MCP servers

## Install and validate

From the repository directory:

```sh
npm ci
npm run validate
```

To build and run the scaffold manually:

```sh
npm start
```

The server waits for a local MCP client on standard input/output. Diagnostic messages go to standard error so they do not corrupt the MCP protocol stream.

## Connect from Codex Desktop

Add a custom MCP server using the **STDIO** transport:

- **Name:** `etsySellerAssistant`
- **Command:** `node`
- **Argument:** the absolute path to this repository's `dist/src/index.js`
- **Working directory:** the repository directory
- **Environment variables:** none required by the scaffold

On Windows, use a Windows absolute path such as `C:\\Users\\you\\code\\etsySellerAssistant\\dist\\src\\index.js`. On macOS, use a path such as `/Users/you/code/etsySellerAssistant/dist/src/index.js`. If Codex cannot find Node on its PATH, set **Command** to the full path of the Node executable on that machine.

Build once with `npm run build` before starting the server from Codex. The current tool inventory contains only `get_setup_status`; it reports that Etsy access is not configured.

## Project documentation

- [Architecture and security boundaries](docs/architecture.md)
- [Development guide](docs/development.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Architecture decisions](docs/decisions/)

## License

GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
