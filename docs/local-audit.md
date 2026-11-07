# Local audit records

The guarded edit flow requires a private local audit folder. It writes an intent before sending an update and records the resulting outcome afterward.

Records are append-only JSON Lines files grouped by month. An entry includes timestamps, proposal and listing identifiers, changed fields, a digest, the update outcome, and the exact before-and-after values for changed fields. These values can contain private listing text. The files are local records, not encrypted backups or tamper-proof storage.

## Configure the folder

Choose a private folder on a local or synced drive. The configured path must end in `github/etsySellerAssistant/auditTrail`; the root of the path can differ by computer. Do not share the absolute path or audit files.

Run:

```sh
npm run local -- set-audit-directory
```

Enter the full folder path when prompted. The configuration is stored locally and is not written to the repository. Restrict access to the folder and avoid sharing its contents.

## Recovery

Do not delete or edit an audit file to make an error disappear. If a write outcome is uncertain, inspect the Etsy listing first. Preserve the audit folder while diagnosing a failure; the record helps distinguish an update that was verified from one that needs further checking.
