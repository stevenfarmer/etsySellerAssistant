# Reviewing and applying listing edits

The alpha can update only a listing's title, description, and tags through a fixed tool. A change needs a separate local edit authorization and a private audit folder.

## How a change is reviewed

1. The assistant prepares a proposal for a listing returned in the current server session.
2. The MCP client displays the exact current and proposed values and asks for one Accept or Deny choice.
3. If accepted, the assistant immediately calls `apply_listing_edit` with the proposal ID.
4. The server consumes approval once, rechecks the shop and listing state, records an audit intent, sends the fixed update, then reads the listing back to verify or reconcile the result.

The proposal is short-lived. A decline, cancellation, unavailable confirmation, stale listing, or failed prerequisite does not send an update. Accepting applies only the exact fields and values shown in the confirmation.

## Local setup

Choose a private folder for audit records and configure it:

```sh
npm run local -- set-audit-directory
npm run local -- enable-edits
```

The edit authorization is separate from listing-read authorization. To remove the edit authorization, stop the server and run:

```sh
npm run local -- disable-edits
```

## Results

The result can be verified, reconciled, rejected, or uncertain. An uncertain outcome means the server could not prove whether Etsy applied the update; check the listing before retrying. Audit failures stop the flow before a new update, or are reported if the update may already have been sent.

The server does not expose a general listing-update endpoint, listing creation, deletion, publishing, or changes to other fields.
