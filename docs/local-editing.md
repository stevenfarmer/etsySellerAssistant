# Guarded listing edits

The development alpha has one fixed update tool for title, description and tags. Its purpose is
to apply a change the seller has already reviewed and approved in the proposal form. The default
server stays status-only, and the published alpha remains read-only.

## What the two steps do

1. `prepare_listing_edit` reads the selected listing, builds a short-lived proposal and opens the
   client's confirmation form with its exact current and proposed values. The client Accept/Deny
   choice is the approval. Accept records permission for a later step; it does not edit Etsy.
2. `apply_listing_edit` accepts only that proposal ID. It can use the approval once. The tool
   checks the owner, shop, listing, timestamp and current values again; validates the resulting
   draft; saves and flushes a local audit intent; sends one update containing only the approved
   changed fields; then reads the listing to verify or reconcile the result.

There is no second confirmation form. A proposal cannot be replayed, edited, or resumed after a
server restart. A stale proposal must be prepared and approved again. The listing contents are
shown as seller data and must not be treated as instructions.

## Local prerequisites

The opt-in alpha requires an existing local shop setup and read connection, a separately stored
edit grant with the exact read and edit scopes, and a configured audit folder. The read grant and
edit grant use separate local Keychain entries and separate refresh state. Enabling edits does not
replace the read-only grant. No grant is requested automatically by starting the server or preparing
a proposal.

Configure the local audit folder once, if it has not already been set:

```sh
npm run local -- set-audit-directory
```

After reviewing and separately authorizing the local edit-authorization step, run this in an
interactive terminal:

```sh
npm run local -- enable-edits
```

The command requires the exact hidden confirmation `ENABLE EDITING` before opening the owner
authorization flow. It keeps the existing read-only credentials. The tool is available only through
the opt-in alpha and fails closed if the grant or audit folder is missing. Starting the default
server does not expose listing tools.

## Results and recovery

- **Verified:** a successful response was followed by a read matching the approved values.
- **Reconciled:** the write response was lost, but a fresh read matches the approved values. The
  tool records this result and does not retry.
- **Rejected:** Etsy returned a definite rejection and a fresh read still matches the original
  values. The tool records the rejection and does not retry.
- **Uncertain:** the read does not establish either expected state, or the read failed. Do not call
  apply again. Check the listing in Etsy and resolve its state before preparing a new proposal.

If an outcome cannot be written to the audit file after a request may have reached Etsy, the tool
reports that the result may have changed and that audit completion failed. Preserve the audit files
and inspect the listing before taking another action. The tool does not claim to roll back an Etsy
change. Etsy does not provide the conditional-update mechanism needed to eliminate every race with
changes made outside this application, so another editor can still change a listing between the
last check and the update.

To remove only the local edit grant, stop every local MCP server first and run:

```sh
npm run local -- disable-edits
```

Type `DISABLE EDITING` at the hidden prompt. This removes the edit access/refresh tokens and edit
refresh state while leaving the read-only credentials, shop setting, audit folder and audit records
in place. It does not contact Etsy. Use the full `reset` command only when intentionally removing
the entire local setup. If disable reports a storage failure, it may have removed part of the local
grant; stop the app and retry `disable-edits` before enabling edits again. For stale audit-writer
recovery, see [local audit records](local-audit.md).

## Verification boundary

Automated tests use fabricated listings, grants and temporary audit folders. They exercise the
fixed request body, approval consumption, identity and stale checks, audit failure, single write,
verification and lost-response outcomes. They never call Etsy or change a shop. Offline completion
does not establish live edit acceptance; that remains a separate owner-accepted phase gate.
