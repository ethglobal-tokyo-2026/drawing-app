# @drawing-app/line-auth

The LINE → Privy auth server, and the LINE ID token verifier the REST API shares with it.

- `src/start-auth-server.ts` starts the auth server (`deploy/sticker-auth.service` runs it on the box). It verifies a person's LINE ID token with LINE, and answers a short-lived ES256 JWT that Privy checks against the site's `/.well-known/jwks.json`.
- `./line` verifies LINE ID tokens; `./line-privy-jwt` names a person's Privy subject from their LINE sign-in; `./auth-error` is the failures both report.

## Commands

```sh
pnpm --filter @drawing-app/line-auth test
pnpm --filter @drawing-app/line-auth build:auth-server
```

`deploy/deploy.sh` builds the auth server into `dist/auth-server` and publishes it.
