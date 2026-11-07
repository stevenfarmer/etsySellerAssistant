# Contributing

Keep changes focused and useful to people installing or maintaining the server.

Before changing behavior, read [the architecture guide](docs/architecture.md) and the relevant user guide. Keep shop information, credentials, private guidance, and audit records out of the repository.

For code changes, add or update offline automated tests. Tests must not call Etsy or modify a shop. Run:

```sh
npm run validate
```

Callback-server tests bind only to localhost, so allow loopback before starting validation in a restricted environment.

Use a branch and pull request. Describe the user-visible behavior, security implications, and any setup or recovery changes. Update user documentation when behavior changes. Do not include private project records or seller-specific examples in the public repository.
