# LINE Login in a browser that isn't the default: backlog

**Status:** backlog, not planned. ad0ll (2026-10-09): record the findings, fix later.

## Symptom

On an iPad whose default browser is Brave, Croquis opened in Safari: Log in with LINE → the LINE app opens → it comes back in Brave, which shows Log in with LINE again with no explanation. Safari never signs in.

## Cause

1. Outside LINE, `lineLogin()` calls `liff.login({ redirectUri: location.href })` (`apps/frontend/src/line/liff.ts`; called by `LineGate.tsx` and `reconnectLine.ts`).
2. LIFF 2.31.1 keeps the PKCE verifier in this browser's localStorage (`@liff/store`), then sends the browser to `access.line.me/liff/v1/authorize`.
3. LINE's authorize flow redirects to `access-auto.line.me/oauth2/v2.1/login`, a Universal Link to the LINE app (its `apple-app-site-association` lists `/oauth2/v2.1/login` for `jp.naver.line`): LINE's auto login, "the LINE app is automatically launched upon login".
4. The LINE app finishes by opening the callback URL; iOS opens http(s) links in the default browser. Unverified in LINE's docs; it rests on Apple's doc, SocialPlus (a LINE partner: auto login "always" returns to the default browser, and fails when the browsers differ) and what ad0ll saw.
5. The default browser has no PKCE verifier, so `@liff/init` skips the code exchange, `liff.isLoggedIn()` stays false, and `startLine` returns `logged-out` silently.

## What LIFF allows

- `liff.login()` takes only `redirectUri`. LINE forbids hand-built LINE Login authorize URLs for LIFF apps outside LINE; doing that would also lose LIFF's ID token, which `SessionGate` and Privy need.
- LIFF's authorize endpoint passes `disable_auto_login=true` through to LINE Login (checked with curl): the login then stays on LINE's page in this browser (SSO "Continue as" when this browser has logged in to LINE before, otherwise email or QR code). The SDK has no option for it.

## Options

| Option                                                            | Effect                                                                                                      | Trade-off                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A. Always `disable_auto_login` outside LINE                       | Never leaves the browser                                                                                    | iPhone users with Safari as default lose one-tap login; QR needs a second device, email needs one registered in LINE |
| B. Notice when a callback lands in a browser that didn't start it | Says what happened                                                                                          | Safari still never signs in                                                                                          |
| **C. Retry without auto login (recommended, with B)**             | LINE's documented pattern: once a login from this browser didn't come back, the next login skips auto login | One bounce per browser, the first time                                                                               |

## Recommended fix (C + B)

- `pnpm patch @liff/login@2.31.1`: pass `disableAutoLogin` through as `disable_auto_login="true"` in `lib/index.es.js` and `lib/index.cjs.js` (next to the `redirectUri` line), and add `disableAutoLogin?: boolean` to its `Login`/`Option` types. Re-make it on each LIFF upgrade (2.31.2 is out).
- `liff.ts`: a `draw.lineAutoLogin` localStorage key. `lineLogin(to = location.href)` sets `started` and logs in normally; if the key is already set (a login that never came back), it sets `off` and passes `disableAutoLogin: true`. `startLine()` clears `started` once logged in.
- Call sites: `reconnectLine.ts` calls `lineLogin(to)`; `LineGate.tsx` needs `onClick={() => lineLogin()}` (passing `lineLogin` directly would hand it the click event).
- B: before `liff.init`, `code` and `liffClientId` in the query while logged out mean a login answered in the wrong browser; `LineGate` shows a catalog line such as "LINE's login didn't finish in this browser. Log in again here."

## Testing

- Unit (`liff.test.ts`, `@line/liff` mocked): first `lineLogin()` without `disableAutoLogin`; a second without a logged-in start in between passes it; a logged-in start clears `started` and keeps `off`; `?code&liffClientId` while logged out flags the notice.
- Real LINE (`VITE_LIFF_MOCK=off`), Playwright WebKit: the second tap's `access.line.me/liff/v1/authorize` request carries `disable_auto_login=true` and ends at `/oauth2/v2.1/noauto-login`.
- On an iPad with Brave as default: first tap lands in Brave with the notice; back in Safari, the next tap stays in Safari and signs in. An iPhone with Safari as default still auto-logs in.

## Unverified

That the LINE app returns through the default browser (LINE doesn't document it); what Safari's tab shows after the Universal Link fires; whether `noauto-login`'s rendered page offers a LINE app button; whether LINE treats iPad Safari (which presents as a Mac) as iOS.

## Sources

- https://developers.line.biz/en/docs/line-login/integrate-line-login/ (`#line-auto-login`, `disable_auto_login`)
- https://developers.line.biz/en/docs/line-login/how-to-handle-auto-login-failure/
- https://developers.line.biz/en/faq/#how-does-auto-login-work
- https://developers.line.biz/en/reference/liff/ (`liff.login`, `liff.init`)
- https://developer.apple.com/documentation/xcode/preparing-your-app-to-be-the-default-browser
- https://blog.socialplus.jp/knowledge/troubleshooting-line-autologin-errors/
- https://access-auto.line.me/.well-known/apple-app-site-association
