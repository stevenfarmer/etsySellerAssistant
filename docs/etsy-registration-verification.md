# Seller App and local authorization

The local server uses an Etsy Seller App to authorize access to one configured shop. The app key and shared secret are entered locally during setup; do not put them in this repository or send them in chat.

## Configure the application

1. In Etsy's developer area, create or select a Seller App.
2. Add this local callback URL to the app configuration:

   ```text
   http://localhost:3003/oauth/redirect
   ```

3. Keep the app key and shared secret available for the local guided setup. Do not paste them into MCP environment variables or project files.

## Connect a shop

Run `npm run local -- guided` in a terminal and enter the app information when prompted. Confirm the intended shop selection. Then run:

```sh
npm run local -- connect
```

The browser authorization must be completed by an account that can authorize the configured shop. The server checks the returned identity against the local shop configuration before using listing tools.

Listing reads use the listing-read permission. Listing edits require the separate local edit-authorization step described in [setup and recovery](development.md#enable-listing-edits). Do not add permissions that the documented tools do not need.
