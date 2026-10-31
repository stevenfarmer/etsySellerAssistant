# Development guide

## Supported setup

Use Node.js 24 LTS for the baseline development environment. Node.js 26 LTS is also tested. Both Windows and macOS are first-class supported platforms.

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
- Confirm CI on both Windows and macOS.
- If an environment prevents a check from running, say so explicitly in the pull request instead of claiming success.

## Troubleshooting

- **Node is not found:** restart Codex Desktop after installing Node, or configure the full Node executable path.
- **The MCP server does not start:** run `npm ci`, then `npm run build`; check that the configured argument points to `dist/src/index.js`.
- **The server appears to hang in a terminal:** that is expected; an STDIO MCP server waits for its client. Stop it with Ctrl+C.
