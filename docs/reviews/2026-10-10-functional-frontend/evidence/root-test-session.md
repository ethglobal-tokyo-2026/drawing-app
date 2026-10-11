# Session-persistence test evidence

`apps/frontend/scripts/ipadSafari.ts:512–522` waits for the app to reopen after a reload, then accepts `GET /api/me` returning 200. `SessionGate` can sign in again before that check. A lost cookie therefore satisfies the same assertion.

The focused browser reproduction uses the real frontend and local API, a separate temporary database, LIFF Mock and mock Sui. It removes the session cookie before reloading and counts new `POST /api/session` requests. It does not run the iPad simulator or real LINE login.

```text
E2E_APP_PORT=5299 E2E_API_PORT=8899 pnpm --filter frontend exec playwright test --config ../../docs/reviews/2026-10-10-functional-frontend/evidence/root-test-playwright.config.mts
Chromium: Removed session cookie: reload check returned 200; new sign-ins: 1
WebKit: Removed session cookie: reload check returned 200; new sign-ins: 1
2 passed (7.6s)
```

The simulator also copies the HTTP E2E proxy configuration when enabling HTTPS (`ipadSafari.ts:191–200`). That retains the callback that removes the Secure cookie flag. Executing that actual callback through the same shallow configuration copy confirms it:

```text
node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/reviews/2026-10-10-functional-frontend/evidence/root-test-secure-cookie.mjs
session=review; Path=/; HttpOnly; SameSite=Lax
```

Fix the check by verifying the original session cookie and its flags, and requiring a reload to resume without a new sign-in. Keep the Secure flag on the simulator's HTTPS proxy. Include a negative control that deletes the cookie and makes the persistence assertion fail.

The browser run logged a LIFF language-resource fetch failure under LIFF Mock in both engines; the session reproduction still passed. Initial runner setup failed before executing tests (module format, sandbox local-server restriction, then the temporary configuration's working directory); those setup issues were corrected. No app or existing test source was changed.
