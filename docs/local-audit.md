# Local audit records

The audit store supports the guarded apply flow in the unpublished development alpha. Listing
reads and proposal preparation do not create audit records; applying an explicitly approved
proposal requires the configured audit store and writes an intent before the update request.
The published alpha remains read-only.

## Choose the local folder

On each computer, configure the absolute path to the Drive-synced folder ending in
`github/etsySellerAssistant/auditTrail`:

```sh
npm run local -- set-audit-directory
```

The command prompts for the path without echoing it. It stores the setting in the ignored local
application configuration beside the configured shop ID. It does not display or log the path,
contact Etsy, or create audit files. The audit directory is created on first use with private
permissions. `auditTrail/` is ignored by Git; never force-add its contents.

Google Drive sync is a convenient separate backup. It is not tamper-proof storage and does not
make writes atomic across computers. Use one active application writer at a time.

## What gets recorded

Records are newline-delimited JSON in UTC month files named `YYYY-MM.jsonl`. A proposal intent
contains its ID and SHA-256 digest, the configured owner/shop/listing IDs, the changed field names,
exact before/after values, the local actor label, time, and pending outcome. A later outcome record
links to the intent and contains a bounded result (`verified`, `reconciled`, `rejected`, or
`uncertain`) plus an optional sanitized error category. The private record may contain listing
copy. It must stay in this local ignored folder; never copy it into Git, a PR, logs, project
tracking or chat.

Each record is appended and flushed before the store reports success. Files use mode `0600` and the
directory uses `0700` on POSIX systems. Symlinked, non-regular, or hard-linked monthly files are
rejected. A single-writer lock is held across the caller's operation so a later apply workflow can
keep its intent and outcome coordinated. If the intent cannot be appended and flushed, the caller
must stop before any protected operation. If an outcome cannot be recorded, the caller must report
that failure alongside the actual or uncertain operation result.

## Recovery

The store fails closed on a malformed or truncated month file and never repairs or overwrites
existing history automatically. Keep the file intact and stop local server/CLI processes before
asking the maintainer to inspect recovery. Do not delete, truncate, or edit an audit file to make
the application continue.

A process crash can leave `.writer.lock`. The store will refuse another writer while it exists.
First stop every local MCP server and CLI instance and verify none is active. Only then remove the
stale `.writer.lock` directory and retry. Never remove a lock that may belong to a running process.

The store appends a later outcome to the month containing its intent, even after the calendar
month changes. It starts a new month file without replacing earlier files.

## Verification boundary

Automated checks use fabricated proposals in temporary directories. They cover permissions,
symlinks, hard links, concurrent writers, monthly rotation, torn records, lock recovery, and
storage failures before and after a simulated operation. They do not call Etsy or create a live
listing edit. T-030 will integrate this foundation with a guarded apply workflow after its own
implementation and verification gates.
