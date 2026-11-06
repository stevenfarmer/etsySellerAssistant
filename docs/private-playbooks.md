# Private playbooks and explicit MCP guidance

Chunk 1A implements a generic [starter template](../templates/playbook.example.md), path resolver
and safe private reader. Chunk 1B adds `get_review_guidance` to the opt-in alpha, with explicit
source labels. Chunk 2B creates an initial private owner playbook outside Git using no-clobber
creation and private permissions. T-039 adds the generic setup interview/research prompt and
`save_private_guidance`, which is called only after the assistant shows the full draft in chat and
the owner chooses Save. The tool requires `ownerConfirmed: true` and creates the fixed file only
when it does not already exist. The server cannot independently verify the chat reply. T-040 adds
natural-language setup/update entry points, reviewed replacement with a private recovery copy,
manual editing instructions, and a separate in-chat activation/deactivation choice. Activation
does not read the file; later delivery still requires an explicit `get_review_guidance` call. The default server remains
status-only. Tests use fabricated temporary files and never read any actual owner playbook.
Actual Codex discovery/default-generic invocation passed after restart on 1 November 2026,
separately from automated STDIO verification (T-027 Done).

## How guidance is selected

The alpha advertises `get_review_guidance` with an empty, strict input object: `{}`. It accepts
no filename, directory, source, shop, approval or other argument. This is a standard read-only MCP
tool, not a client-specific instruction file or an automatically loaded prompt/resource.

With no additional settings, calling it returns the generic template compiled into the build.
It does not inspect any private directory, even if a private playbook exists. Equality between
the compiled generic text and public Markdown template is tested to prevent drift.

Private use is off by default. The alpha records an explicit in-chat activation choice in a
separate local settings file. A saved choice takes precedence over the legacy environment mode;
before any in-chat choice is recorded, the environment setting remains available for existing
installations:

| Setting                                    | Meaning                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ETSY_SELLER_ASSISTANT_GUIDANCE_MODE`      | `generic` (default) or `private`. Other values, including blank, fail safely on explicit invocation.                                       |
| `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` | Optional absolute private directory override in private mode. Otherwise use the Mac default below. Generic mode never resolves this value. |

The activation file is `private-guidance-state.json` in the local application-support directory;
it stores only the on/off choice. Activation itself never reads the guidance text. Turning guidance
on makes it available only when the assistant later calls `get_review_guidance` explicitly. Turning
it off prevents future calls from returning the private file. Keep credentials out of the file.
The server cannot verify a chat reply, so create, replace and activation tools rely on the connected
agent to wait for the owner's explicit choice. Environment settings take effect after the MCP
process starts; text edits are loaded on each explicit retrieval. Etsy authorization and scopes are
unchanged.

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
  template into a private version. The agent can create it or replace it only through the reviewed
  tools; manual editing is also supported.
- Default Mac file: `~/Library/Application Support/etsySellerAssistant/guidance/playbook.private.md`.
  To edit it in Finder, choose **Go → Go to Folder…**, paste
  `~/Library/Application Support/etsySellerAssistant/guidance`, then open
  `playbook.private.md` in a text editor. If the MCP connection has an explicit
  `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` override, use that configured folder instead.
  The separate activation setting is stored at
  `~/Library/Application Support/etsySellerAssistant/private-guidance-state.json`.
  `resolvePrivatePlaybookDirectory()` resolves the location without accessing the filesystem.
  An explicit absolute `directory` option selects that directory directly. Paths are trusted
  application configuration, not a model-supplied file argument or a changed shop/token schema.
  Chunk 1B uses only the named client settings above; no CLI command is added.
- `createPrivatePlaybookReader({ directory, repositoryDirectory })` is inert. Only `read()`
  performs filesystem I/O. `repositoryDirectory` must name the installation checkout, not an
  arbitrary model-selected exclusion root. Each read reloads the file; there is no content cache.
- On macOS/POSIX, the final directory and file must belong to the current user and grant no
  group/other permissions (normally directory `0700`, file `0600`). The reader does not create
  directories or repair files. Setup creates with no-clobber behavior; replacement keeps the old
  text in a private backup before atomically installing the reviewed version.
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
claiming real private-mode or advanced-review acceptance. The initial private playbook was created in chunk 2B with a 0700 guidance directory and
0600 file, verified through the safe reader, without changing client settings or accessing Etsy
or credentials. Its contents and private evaluation outputs stay out of Git/project records.
Generic mode remains the default: file presence alone never enables private reads. This is a
strategy baseline with no invented owner/product facts; actual buyer/product context can be
added privately when supplied. See [the evaluation evidence](review-evaluation.md). Full owner
owner usefulness and Mac edit acceptance completed in T-031. The T-034 guided setup design and
T-039 setup/save implementation are complete. T-040 adds agent-guided updates, separate in-chat
activation, and manual edit instructions. Supported-client acceptance is still required; automated
checks do not prove that a connected agent will select tools from ordinary natural-language
requests. See the [setup design](private-guidance-setup-design.md).
