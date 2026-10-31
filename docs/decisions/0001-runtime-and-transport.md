# ADR 0001: Node.js, TypeScript, and local STDIO MCP

- Status: Accepted
- Date: 2026-10-30

## Decision

Use TypeScript on supported Node.js LTS releases and the official MCP TypeScript server SDK. Launch the server as a local STDIO process from Codex Desktop. Support Windows and macOS as first-class development and runtime environments.

## Context

The product owner selected Codex Desktop local STDIO to avoid setting up OpenAI Platform API access or hosting a public MCP endpoint. The stakeholder wants to develop on a Windows machine and also run the tool from a MacBook. A typed runtime, strict compiler settings, dependency lockfile, automated tests, and cross-platform CI improve maintenance and reduce platform-specific surprises.

## Consequences

- Each user runs the process locally; no project-hosted service or database is needed for the MVP.
- Etsy credentials remain on the authorized operator's machine.
- The project must avoid shell-specific scripts and hard-coded local paths.
- CI checks both Windows and macOS.
- Node and package dependencies need routine security updates.
