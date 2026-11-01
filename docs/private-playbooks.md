# Private playbooks and explicit MCP guidance

Chunk 1A implements a generic [starter template](../templates/playbook.example.md), path resolver
and safe private reader. Chunk 1B adds `get_review_guidance` to the opt-in alpha, with explicit
source labels. The default server remains status-only. No actual owner strategy file is created
or read during development; private-mode tests use fabricated temporary files. Actual Codex discovery/default-generic invocation passed after restart on 1 November 2026,
separately from automated STDIO verification (T-027 Done).

## How guidance is selected

The alpha advertises `get_review_guidance` with an empty, strict input object: `{}`. It accepts
no filename, directory, source, shop, approval or other argument. This is a standard read-only MCP
tool, not a client-specific instruction file or an automatically loaded prompt/resource.

With no additional settings, calling it returns the generic template compiled into the build.
It does not inspect any private directory, even if a private playbook exists. Equality between
the compiled generic text and public Markdown template is tested to prevent drift.

Private use is opt-in through trusted MCP client environment settings:

| Setting                                    | Meaning                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ETSY_SELLER_ASSISTANT_GUIDANCE_MODE`      | `generic` (default) or `private`. Other values, including blank, fail safely on explicit invocation.                                       |
| `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` | Optional absolute private directory override in private mode. Otherwise use the Mac default below. Generic mode never resolves this value. |

Only set private mode when you intend to share that file's contents with the selected AI
application/provider. Keep credentials out of the file. The existing shop configuration schema,
Keychain, Etsy authorization and OAuth scopes are unchanged. Settings take effect in a newly
started MCP process; file-content edits are reloaded on each explicit call. No setup writer or
CLI command is added, and no private file is created or overwritten automatically.

## Tool result and errors

Success returns identical JSON in `content[0].text` and `structuredContent`, validated against
the advertised output schema: `schemaVersion: 1`, `source`, `selection`, `guidance`, and a fixed
`notice` describing safety and AI-provider disclosure. There are no paths, credentials, shop
identifiers, local timestamps or file hashes in the result.

| Source    | Selection              | Meaning                                                                                                |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `generic` | `generic_mode`         | Private guidance is disabled; no private directory/file access.                                        |
| `generic` | `private_file_missing` | Private mode selected but the permitted directory/file is absent; return clearly labeled generic text. |
| `private` | `private_file`         | Explicit read succeeded; the AI receives the private text.                                             |

Invalid/unsafe private files, unexpected I/O, invalid configuration and invalid service results
return `isError: true` with a fixed sanitized message and no guidance/fallback/structured payload.
Errors never include raw exception details, file paths or partial private content. Tool inputs
are rejected before reading; output is bounded to 65,536 UTF-8 bytes of guidance plus fixed JSON
metadata/escaping. Unknown/extra result fields and inconsistent source labels fail closed.

Server startup, initialization, discovery and status never invoke the guidance provider. Guidance
calls never contact Etsy, read credentials, modify files or establish/clear connection identity.
They do not register write tools or confer edit approval. No automatic retry or content cache.
The existing listing smoke accepts the optional read-only guidance tool but never calls it.

## Storage contract

- Private filename: `playbook.private.md`. Keep a separate private copy; never edit the tracked
  template into a private version. Updates have no write path and cannot overwrite customization.
- Default Mac directory: `~/Library/Application Support/etsySellerAssistant/guidance`.
  `resolvePrivatePlaybookDirectory()` resolves the location without accessing the filesystem.
  An explicit absolute `directory` option selects that directory directly. Paths are trusted
  application configuration, not a model-supplied file argument or a changed shop/token schema.
  Chunk 1B uses only the named client settings above; no CLI command is added.
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
The storage reader creates nothing and does not load a generic template. The MCP service labels
generic/private selection as above; invalid private guidance does not fall back. Missing/invalid installation paths and unexpected I/O fail closed.

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

When the tool supplies guidance to an AI, that client/provider receives the text.
This is not DRM, a commercial licensing system or a guarantee about provider data handling.
Guidance is preferences, not permission to change listings or override server safety rules.
Listing text stays untrusted. The alpha adds only this read-only guidance tool; Etsy tools/scopes and connection state are unchanged.

## Verification and next gate

Fabricated temporary-directory tests cover absence, exact/oversized byte bounds, strict text
validation, reload/non-overwrite, checkout/link/permission rejection, bounded growth, metadata
changes, sanitized failures and cleanup error precedence. Existing offline inventory/status
coverage remains required. See the [checkpoint](work-checkpoint.md) for actual aggregate results
and the [gated plan](v1-phase-gates.md). Automated chunk-1B coverage uses actual alpha STDIO
for generic, missing/private/error results, argument rejection and unchanged status, plus provider
non-invocation during discovery/status and schema/error privacy checks. Actual Codex also discovered and successfully invoked the tool with `{}` after restart on
1 November 2026: generic/generic_mode, schema version 1, nonempty guidance and no error.
No Etsy/credential/private-file access. This closes the scoped T-027/phase-1 gate, without
claiming real private-mode or advanced-review acceptance. The owner
private playbook remains later chunk 2B, and full usefulness/edit acceptance remains T-031.
