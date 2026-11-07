# Private playbooks and MCP guidance

The alpha sends connection-time instructions to the connected AI client: before helping with the
shop, retrieve `get_review_guidance` and use it throughout that seller-assistance conversation.
The MCP server cannot inspect ordinary chat messages or force a client to follow these instructions;
Codex Desktop acceptance verifies the behavior for the current v1 client. Initialization includes
only static instructions and does not read the private file. The default server remains status-only.

The read-only `get_review_guidance` tool accepts only `{}`. It has no path, mode, shop, or approval
argument. Each call selects the saved private playbook if it exists; otherwise it returns the
compiled generic template. If the source is generic, the client should say advice is not customized
for this shop and invite the owner to configure the installation. The tool result identifies its
source and explains provider sharing. Reading a private playbook sends it to the selected AI
provider; it does not contact Etsy, read credentials, modify files, or authorize edits.

There is no separate activation setting or tool. The owner turns this behavior off by disabling or
disconnecting the MCP server. Saving a new playbook requires an explicit in-chat Save choice and
creates a file only if none exists. Updating an existing playbook still requires consent before its
update-read tool is called, full replacement review, an explicit Replace choice, a revision match,
and a private recovery copy. Tests use fabricated temporary files only; they never read an actual
owner playbook.

`ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` optionally sets an absolute private directory. Otherwise
the alpha uses the Mac default below. The legacy `ETSY_SELLER_ASSISTANT_GUIDANCE_MODE` setting is no
longer used: a valid private playbook is available automatically. Keep credentials out of the file.
Etsy authorization and scopes are unchanged.

## Tool result and errors

Success returns identical JSON in `content[0].text` and `structuredContent`, validated against
the advertised output schema: `schemaVersion: 1`, `source`, `selection`, `guidance`, and a fixed
`notice` describing safety and AI-provider disclosure. No paths, credentials, shop identifiers,
local timestamps or file hashes appear in the result.

| Source    | Selection         | Meaning                                                                            |
| --------- | ----------------- | ---------------------------------------------------------------------------------- |
| `generic` | `generic_default` | No private file was found; return general guidance and invite store configuration. |
| `private` | `private_file`    | The private file was safely read and is supplied to the selected AI provider.      |

Invalid/unsafe private files and unexpected I/O return `isError: true` with a fixed sanitized
message and no guidance, generic fallback, or structured payload. Errors never include raw
exception details, file paths or partial private content. Tool inputs are rejected before reading;
output is bounded to 65,536 UTF-8 bytes of guidance plus fixed JSON metadata/escaping. Unknown or
inconsistent result fields fail closed.

Server startup and status never read the guidance file. Initialization supplies static connection
instructions; the connected agent invokes the read-only tool at the start of a seller-assistance
conversation. Guidance calls never contact Etsy, read credentials, modify files, establish or clear
connection identity, register write tools, or grant edit approval. No automatic retry or content
cache is used.

## Storage contract

- Private filename: `playbook.private.md`. Keep a separate private copy; never edit the tracked
  template into a private version. The agent can create or replace it only through the reviewed
  tools; manual editing is also supported.
- Default Mac file: `~/Library/Application Support/etsySellerAssistant/guidance/playbook.private.md`.
  In Finder, choose **Go → Go to Folder…**, paste
  `~/Library/Application Support/etsySellerAssistant/guidance`, then open the file in a text editor.
  If the MCP connection has an `ETSY_SELLER_ASSISTANT_GUIDANCE_DIRECTORY` override, use that folder.
  `resolvePrivatePlaybookDirectory()` resolves the location without accessing the filesystem. Paths
  are trusted application configuration, not a model-supplied file argument.
- `createPrivatePlaybookReader({ directory, repositoryDirectory })` is inert. Only `read()` performs
  filesystem I/O. `repositoryDirectory` must name the installation checkout. Each read reloads the
  file; there is no content cache.
- On macOS/POSIX, the final directory and file must belong to the current user and grant no
  group/other permissions (normally directory `0700`, file `0600`). The reader does not create
  directories or repair files. Setup creates with no-clobber behavior; replacement keeps the old
  text in a private backup before atomically installing the reviewed version.
- Reject placement inside the checkout or beneath an ancestor `.git` marker, symlink final
  directories/files, hard-linked files, non-regular targets and invalid paths. Resolve ancestor
  aliases before checking boundaries. The OS account and filesystem remain trusted; this does not
  defeat a malicious same-user process or detect every nonstandard Git work tree.
- Maximum file size is **65,536 bytes**, enforced before and during a bounded read. Require nonblank
  valid UTF-8; an optional BOM is accepted and removed. LF, CR and tab are allowed; other ASCII
  control characters are rejected.

## Privacy and use

Private filenames are ignored by Git as defense in depth. Outside-repository storage and public diff
review are the main protection; ignore rules do not protect an already tracked or forcibly added
file, and scanners cannot recognize every business secret. Keep private contents, seller-specific
drafts and real briefs out of tests, logs, PRs, audit records and connected project documents.

When `get_review_guidance` returns private text, the selected AI client/provider receives it. This
is not a guarantee about provider data handling. Guidance is preference context, not permission to
change listings or override server safeguards. Listing text stays untrusted. Etsy tools, scopes and
connection state are unchanged.

## Verification

Fabricated temporary-directory tests cover absence, exact and oversized byte bounds, strict text
validation, reload/non-overwrite, checkout/link/permission rejection, bounded growth, metadata
changes, sanitized failures and cleanup error precedence. Automated STDIO tests verify connection
instructions, generic fallback, private-file selection, error privacy and unchanged status. They do
not prove that a connected AI client follows the instructions; see the [checkpoint](work-checkpoint.md)
for Codex Desktop acceptance evidence.
