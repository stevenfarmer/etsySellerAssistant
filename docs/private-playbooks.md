# Private playbook storage — chunk 1A

Implemented foundation: a generic [starter template](../templates/playbook.example.md), local
path resolver and explicit read-only loader in `src/local/private-playbook.ts`. The loader is
not connected to CLI, server startup, status or MCP tools yet. Chunk 1B/T-027 adds guidance
delivery; this chunk does not create the owner's actual strategy file or read existing files.

## Storage contract

- Private filename: `playbook.private.md`. Keep a separate private copy; never edit the tracked
  template into a private version. Updates have no write path and cannot overwrite customization.
- Default Mac directory: `~/Library/Application Support/etsySellerAssistant/guidance`.
  `resolvePrivatePlaybookDirectory()` resolves the location without accessing the filesystem.
  An explicit absolute `directory` option selects that directory directly. Paths are trusted
  application configuration, not a model-supplied file argument or a changed shop/token schema.
  No environment variable, CLI command or client setting is wired up in chunk 1A.
- `createPrivatePlaybookReader({ directory, repositoryDirectory })` is inert. Only `read()`
  performs filesystem I/O. `repositoryDirectory` must name the installation checkout, not an
  arbitrary model-selected exclusion root. Each read reloads the file; there is no content cache.
- On macOS/POSIX, the final directory and file must belong to the current user and grant no
  group/other permissions (normally directory `0700`, file `0600`). The loader does not create
  directories, adjust permissions or try to repair a file. Future setup must use no-clobber
  creation and preserve user changes; there is no setup writer in this chunk.
- Reject placement within the configured checkout, including resolved aliases, or beneath an
  ancestor `.git` marker (ordinary checkout/worktree). Reject symlink final directories/files,
  hard-linked files, non-regular targets and invalid absolute paths. Ancestor path aliases such
  as a platform temp-directory alias are resolved before boundary checks. Known permission,
  identity and metadata changes fail closed. The OS account and its filesystem remain trusted;
  this does not defeat a malicious same-user process or detect every nonstandard Git work tree.
- Maximum file size: **65,536 bytes**, enforced both before and during a bounded read. Require
  nonblank valid UTF-8; an optional UTF-8 BOM is accepted/removed. LF, CR and tab are allowed;
  other ASCII control characters are rejected. Unicode and Markdown remain supported.

## Results and errors

`read()` returns text on success or `undefined` only for an absent guidance directory/file.
It creates nothing and does not implicitly return or load the generic template. Chunk 1B must
label generic versus private guidance explicitly; invalid private guidance must not silently
fall back to generic content. Missing/invalid installation paths and unexpected I/O fail closed.

`PlaybookError.code` is one of `invalid_path`, `unsafe_path`, `unsafe_permissions`, `too_large`,
`invalid_content`, `changed_file`, or `io_failed`. Messages contain no private path/content,
native exception cause or raw filesystem error. The path resolver retains the existing
`LocalConfigError` validation/platform semantics. Errors do not alter connection state.

Handles close on success and failure. A primary read/validation error survives a simultaneous
close failure; a close-only failure reports `io_failed`, not successful guidance delivery.
Concurrent edits may require saving a stable file and explicitly reading again. There are no
automatic retries, log output or background reads.

## Privacy and use

The conventional private filenames are ignored by Git as defense in depth, and automated checks
confirm that rule while permitting the generic template. Outside-repository storage and public
diff review are the main protection. Ignore rules do not protect an already tracked or forcibly
added file, and no scanner can reliably recognize every business secret. Keep private contents,
seller-specific drafts and real briefs out of tests, logs, PRs, audit records and connected
project documents. Back up private content separately from public Git if desired.

When the later interface supplies guidance to an AI, that client/provider receives the text.
This is not DRM, a commercial licensing system or a guarantee about provider data handling.
Guidance is preferences, not permission to change listings or override server safety rules.
Listing text stays untrusted. Current server tools/scopes and the healthy connection are unchanged.

## Verification and next gate

Fabricated temporary-directory tests cover absence, exact/oversized byte bounds, strict text
validation, reload/non-overwrite, checkout/link/permission rejection, bounded growth, metadata
changes, sanitized failures and cleanup error precedence. Existing offline inventory/status
coverage remains required. See the [checkpoint](work-checkpoint.md) for actual aggregate results
and the [gated plan](v1-phase-gates.md) for chunk 1B. Native private file use is not acceptance
evidence from these tests; no real guidance file is accessed or created in this chunk.
