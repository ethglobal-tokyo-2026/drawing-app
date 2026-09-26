# Privy sign-in through LINE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once LINE has logged the person in, the app signs them in to Privy (app `cmuh4s0lz01fn0cl143lomlzj`, "drawing") with no extra screen. It exchanges LINE's ID token at the auth server in `packages/sticker-chain` for a 5-minute Privy JWT.

**Architecture:**

- **Box:** the auth server runs on the Hetzner box as `sticker-auth` (Node 22, 127.0.0.1:8787, compiled to plain JS). HAProxy routes `/v1/auth/` and `/.well-known/jwks.json` on the app's host to it. That's one command for ad0ll.
- **Frontend:** a lazily loaded `PrivySession` runs Privy's `useSubscribeToJwtAuthWithFlag` beside the app, so Privy's large SDK never delays the board. Its state shows on the profile card.
- **Dev server:** it proxies `/v1/auth` to the live auth server, so desktop testing against real LINE signs in to Privy too.

**Tech Stack:** `@privy-io/react-auth` 3.45.0 (the newest release at least three days old), `@line/liff` 2.31, Node 22 on the box, systemd, HAProxy.

**Facts this rests on (checked 2026-09-26):**

- The app's public config has `custom_jwt_auth: false`, so ad0ll requests access in the dashboard.
- The config has `allowed_domains: []`, so any origin is accepted.
- `getExternalJwt` "should not throw and doing so will result in the user being logged out" (SDK types).
- The ID token is valid for one hour.
- The auth server passes its tests, serves JWKS, rejects other origins (403), and calls LINE's verify endpoint (a fake token got 401).

---

### Task 1: Ship the auth server

**Files:** Modify `packages/sticker-chain/package.json`, `deploy/deploy.sh`. Create `deploy/sticker-auth.service`, `deploy/sticker-auth.env`.

- [x] `build:auth-server`: `tsc src/start-auth-server.ts --ignoreConfig --outDir dist/auth-server` (NodeNext, ES2023), plus a `{"type":"module"}` package.json.
- [x] `sticker-auth.env` holds only public config: channel 2011732197, the Privy app ID, issuer and origin `https://sticker.195-201-8-147.sslip.io`, key ID `sticker-auth-1`, and 127.0.0.1:8787.
- [x] `deploy.sh` then:
  - builds the auth server and rsyncs it to `/srv/sticker-auth/server/`;
  - generates the P-256 signing key on the box if it's missing (it never leaves the box);
  - installs and restarts `sticker-auth` when anything changed;
  - checks that JWKS on the box and at the public URL carries key `sticker-auth-1`.
- [x] Stage the HAProxy route and check it with `haproxy -c`. Hand ad0ll a hash-checked `!` command to install it and reload.

### Task 2: Sign in to Privy with the LINE ID token

**Files:** Modify `apps/frontend/package.json`, `src/line/liff.ts`, `src/main.tsx`, `src/sticker-board/ProfileCard.tsx`, `vite.config.ts`. Create `src/identity/privy.ts`, `privy.test.ts`, `PrivySession.tsx`.

- [x] Tests first (`privy.test.ts`):
  - the server's JWT comes back for a valid ID token;
  - a refused token resolves to nothing, with the server's reason recorded, and never throws;
  - a missing or expired ID token never reaches the server.
- [x] `privy.ts`:
  - `PRIVY_APP_ID`;
  - `fetchPrivyJwt()`, which POSTs `{ idToken }` to `/v1/auth/privy-jwt` and never throws;
  - a status store, `usePrivyStatus()`, with the states off, signing-in, signed-in (Privy user ID) and failed (reason).
- [x] `PrivySession.tsx` (default export, lazy):
  - `<PrivyProvider appId={PRIVY_APP_ID}>` around a child that calls the hook with `isAuthenticated: true`;
  - `onAuthenticated`, `onUnauthenticated` and `onError` feed the store.
- [x] `liff.ts` exports `liffMockActive`. `main.tsx` mounts `PrivySession` inside LineGate except under LIFF Mock, whose ID token is fake.
- [x] ProfileCard gets a Privy row. `vite.config.ts` gets a dev proxy for `/v1/auth` to the live site, with its Origin.
- [x] Frontend lint, typecheck, tests and oxfmt. Then the build: Privy sits in its own chunk.

### Task 3: Verify

- [ ] Deploy: both JWKS checks pass once the route is in. A fake ID token at the public URL gets 401 `line_auth_failed`.
- [ ] After ad0ll turns on custom auth and sets the JWKS URL: sign in on the live site, and the profile card shows the Privy user ID.
- [ ] Merge into local main (no push). Tell drawing-app-f6.

## Outcome so far

Merged into drawing-app's local main as 40f4fa0 (not pushed) and deployed. The auth server runs on the box as `sticker-auth`.

- In the browser, the real PrivySession and SDK got Privy's answer: 401 "External auth providers are not enabled for your account.", which the card shows with Try again. The test used a JWT signed on the box by the real key, handed to the page by Playwright.
- Found in testing: after a failed sign-in, Privy's `useSyncJwtBasedAuthState` re-syncs in a tight loop, about 2 authenticate calls a second, indefinitely. The fix: `enabled: false` after a failure, a kept JWT, and no exchange while failed.
- Waiting on ad0ll: the HAProxy command (staged file hash 9d62c3d3…), and turning on custom auth in Privy with the JWKS URL.
