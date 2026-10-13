# @drawing-app/line-auth

The protected Privy issuer and the LINE access token verifier used by the REST API.

- `src/start-auth-server.ts` starts the issuer (`deploy/sticker-auth.service` runs it on the box). Only `POST /_internal/privy-jwt` accepts canonical HMAC assertions from the authenticated API; `POST /api/session/privy-jwt` verifies the real LINE principal and current selection before delegating. The public anonymous exchange is retired. Privy checks ES256 signatures against the unchanged public `/.well-known/jwks.json`.
- `./line` verifies LIFF access tokens with a shared caller deadline; `./line-privy-jwt` derives a channel-scoped subject and signs authorized identities; `./internalAssertion` authenticates the exact internal assertion. The API receives no signing key.

## Commands

```sh
pnpm --filter @drawing-app/line-auth test
pnpm --filter @drawing-app/line-auth build:auth-server
```

`deploy/deploy.sh` builds the auth server into `dist/auth-server` and publishes it.
