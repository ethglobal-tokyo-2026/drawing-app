# Identity, Tickets, and Session Checks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close findings 5, 8, 9, 16, 18, and the ticket-card part of finding 10.

**Architecture:** Keep session and ticket APIs intact. Correct retry and refresh ownership in the existing feature modules; make the test server's cookie behavior explicit and measure session creation during reload.

**Tech Stack:** TypeScript, React, Vitest, Playwright, Vite, the existing Safari WebDriver script.

**Spec:** [Functional frontend fixes design](../specs/2026-10-10-functional-frontend-fixes-design.md), particularly “Identity, tickets, and session checks.”

## Global Constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Use existing Croquis vocabulary and American English in identifiers, comments, and documentation.
- Put new user-facing copy in `apps/frontend/src/i18n/strings/`, with English, Japanese, and the required interaction comment; follow the Japanese glossary. Developer-slip strings stay English as required by the repository.
- Preserve account isolation, ticket spending idempotency, Gift Claim Token secrecy, and Gratitude's separation from monetization.
- Use temporary databases and simulated LINE/Sui services in automated regressions; no real Gift Messages or paid transactions are needed.
- The remaining global constraints in the spec apply to every task.

## Review Focus

- A rejected lazy import must not become an infinite retry or an automatic page reload (I1).
- Storage can fail independently on read, write, and removal during LINE initialization (I2).
- Checkout owner or coin changes while an old balance request is pending (I3).
- Ticket reconciliation can fail or race another spend; retain the spend's identity and surface the read failure (I4).
- A nested checkout and automatic reauthentication can make naive history/session assertions pass (I5, I6).

---

### I1: Make wallet boundary recovery explicit — finding 5

**Files:** Modify `apps/frontend/src/identity/PrivySignIn.tsx`, `privy.ts`, `waitForPrivy.ts` in that directory; `apps/frontend/src/sticker-board/stat-board/addresses.ts`, `StatBoard.tsx`, `AddressPapers.tsx`, and `AddressPapers.test.tsx`; catalogs `apps/frontend/src/i18n/strings/stickerBoard.ts` and `identity.ts`. Tests: `apps/frontend/src/identity/PrivySignIn.test.tsx`, `privy.test.ts`, `PrivySession.test.tsx`, and a new `waitForPrivy.test.ts`.

**Interfaces:** Extend the failed branch of `PrivyStatus` with `reloadRequired?: boolean`; retain `reconnectLine?: boolean`. Keep `retryPrivySignIn(returnTo?: string, onFailed?: (failure: ApiError) => void): void` and `resetPrivySignIn(): void`. Extend the failed `ChainAddress` branch with `reloadRequired?: boolean` so its renderer can label the existing retry callback correctly.

- [ ] Write regressions using the retained `evidence/privy-boundary.test.tsx`: after a provider throw, assert `privyStatus()` contains `{state: 'failed', reloadRequired: true}`; the visible action says Reload; calling it calls the stubbed `location.reload` once. Also cover a rejected lazy import and ordinary JWT failure.
- [ ] Run `pnpm --filter frontend exec vitest run src/identity/PrivySignIn.test.tsx src/identity/privy.test.ts src/identity/PrivySession.test.tsx src/identity/waitForPrivy.test.ts`; verify the new boundary assertions fail on the original behavior.
- [ ] Set `reloadRequired` in `PrivyBoundary.componentDidCatch`. Explicit `retryPrivySignIn` reloads for that state. `resetPrivySignIn` preserves it, and `waitForPrivy` rejects promptly through its existing `sui_wallet_not_ready` error rather than scheduling another attempt. Preserve the existing LINE reconnect branch. Carry the action label through address and developer status displays.
- [ ] Add negative checks: an automatic wallet wait never invokes reload; ordinary retry still restarts JWT exchange; repeated renders never initiate multiple wallet creations. Run the focused command again, plus the modified stat-board/address tests; expect all pass.
- [ ] Commit only I1 files: `fix: offer real recovery after wallet provider failure`.

### I2: Make the LINE login marker optional — finding 16

**Files:** Modify `apps/frontend/src/line/liff.ts`, `apps/frontend/src/line/liff.test.ts`. Reuse `apps/frontend/src/ui/deviceStorage.ts` unchanged.

**Interfaces:** Preserve `lineLogin(to?: string): void`, `initLine(): Promise<void>`, and `LineState`. Consume `readStored(key: string, failure: string)` and `writeStored(key: string, text: string | null, failure: string): boolean`.

- [ ] Add named cases for throwing `getItem`, `setItem`, and `removeItem`. Assert `liff.login` still receives the intended redirect; unreadable storage yields `disableAutoLogin: true`; a successful LIFF initialization still reaches `ready` when marker removal fails. Assert failures are logged.
- [ ] Run `pnpm --filter frontend exec vitest run src/line/liff.test.ts`; confirm failure at the optional storage operation on the original implementation.
- [ ] Use the existing guarded storage helpers only for `AUTO_LOGIN_KEY`. Treat blocked reads as a previous attempt, preserve the existing started/off behavior when storage works, and allow writes/removals to fail without preventing login. Do not absorb SDK failures as marker failures.
- [ ] Run the focused test plus `src/line/reconnectLine.test.ts`; verify normal redirects, deliberate login retry, initialization failure UI state, and storage refusal all pass.
- [ ] Commit I2 files: `fix: allow LINE login when optional storage is unavailable`.

### I3: Refresh the open checkout's balance — finding 8

**Files:** Modify `apps/frontend/src/tickets/ReserveTicketCheckout.tsx`, `apps/frontend/src/i18n/strings/tickets.ts`. Create `apps/frontend/src/tickets/useJpycBalance.ts`, `useJpycBalance.test.tsx`, and `ReserveTicketCheckout.test.tsx` in that directory.

**Interfaces:** Extract the existing hook as `useJpycBalance(owner: string | undefined, payment: JpycPayment | undefined): { balance: bigint | null; error: string | null; refreshing: boolean; refresh: () => void }`. Consume unchanged `getJpycBalance(owner: string, payment: JpycPayment): Promise<bigint>` with its existing timeout.

- [ ] Port the checkout reproduction: start with `0n`, change the fake chain balance to `200n`, dispatch visibility/focus/online and assert updated balance and purchase eligibility without closing. Add explicit Refresh behavior, owner/coin changes, stale completion, unmount, and rejection assertions. Verify refreshing itself never invokes a purchase API or signer.
- [ ] Run `pnpm --filter frontend exec vitest run src/tickets/useJpycBalance.test.tsx src/tickets/ReserveTicketCheckout.test.tsx`; verify the relevant behavior fails before extraction/fix.
- [ ] Key reads by owner, network, and coin type. Clear another identity's balance immediately, ignore obsolete completions, allow only one request per current identity in flight, and coalesce triggers received during it into one following read. Subscribe to visible-window focus, visible transition, and online; unsubscribe on cleanup. Keep the dynamic payment SDK import inside the request to preserve checkout-only loading.
- [ ] Add a catalog-backed Refresh balance control beside the existing balance/error area, disable it during a read, and use the hook's existing error detail presentation. Keep the selected pack and payment step. Check simultaneous focus/visibility notifications coalesce, a failed refresh remains visible, and a successful purchase still triggers a balance read.
- [ ] Run the focused command and `pnpm --filter frontend exec vitest run src/payments/jpyc.test.ts src/tickets/paymentFailure.test.ts`; expect all pass. Commit: `fix: refresh checkout balance after external funding`.

### I4: Reconcile an overtaken spend — finding 9

**Files:** Modify `apps/frontend/src/tickets/TicketsProvider.tsx` and `TicketsProvider.test.tsx`.

**Interfaces:** Preserve `TicketsValue.spend(kind: TicketKind): Promise<TicketUse>` and `refresh(): void`. Reuse `show(request: number, answer: Tickets): boolean` and the purchase reconciliation pattern already in this provider.

- [ ] Port `evidence/tickets.test.tsx`: spend starts, newer read returns 3, spend returns 2. Assert the spent `TicketUse` returns exactly once and an authoritative follow-up read ends at 2. Preserve the idempotency key throughout.
- [ ] Run `pnpm --filter frontend exec vitest run src/tickets/TicketsProvider.test.tsx`; confirm the new convergence assertion fails before the change.
- [ ] After a successful spend, call `refresh()` when `show` rejects that mutation's response. Include `refresh` in the callback dependencies. Do not blindly overwrite a newer response with an older mutation snapshot.
- [ ] Add cases for a failed reconciliation, another mutation during reconciliation, provider teardown/account change, and the reverse ordering (old GET finishes after spend). Assert visible read errors, no extra ticket spend, and no update to another provider instance. Rerun the focused suite; expect all pass.
- [ ] Commit I4 files: `fix: reconcile ticket counts after overtaken spends`.

### I5: Give every ticket card one Back entry — ticket part of finding 10

**Files:** Modify `apps/frontend/src/tickets/TicketCard.tsx`, `ReserveTicketCheckout.tsx`, `ticketCards.test.tsx`, `useDrawFromBoard.test.tsx`; create `apps/frontend/e2e/backNavigation.e2e.ts`. Use existing `apps/frontend/src/ui/useBackToClose.ts` unchanged unless a regression demonstrates a shared defect.

**Interfaces:** Change `TicketCard.onEscape` to `() => boolean | void`, preserving the other props. It becomes the single close action consumed by `useBackToClose(open: boolean, close: () => boolean | void): void`. Remove checkout's duplicate registration after moving ownership into `TicketCard`.

- [ ] Add Back cases for OutOfTickets over the board, StartDrawing, TicketsNotLoaded, and checkout. Assert the same callbacks as Escape, exactly one overlay entry, one close, and no navigation out of Croquis. Include OutOfTickets → checkout → OutOfTickets and Back while leaving.
- [ ] Run `pnpm --filter frontend exec vitest run src/tickets/ticketCards.test.tsx src/tickets/useDrawFromBoard.test.tsx src/ui/useBackToClose.test.ts`; verify missing-card cases fail initially.
- [ ] Register Back from `TicketCard` while not leaving and route it through `onEscape`. Remove only the redundant checkout hook; pass `onEscape={leave}` instead of its current void wrapper so Back receives false during a payment and preserves its entry. Keep the Mini-game registration in G3 separate.
- [ ] Run the focused command and `pnpm --filter frontend exec playwright test e2e/backNavigation.e2e.ts`; require Chromium and WebKit passes including real history traversal, Back during payment, and a later successful close. Coordinate the shared E2E file with G3 sequentially.
- [ ] Commit I5 files: `fix: close ticket cards through browser Back`.

### I6: Prove session persistence instead of automatic sign-in — finding 18

**Files:** Modify `apps/frontend/scripts/ipadSafari.ts` and `apps/frontend/e2e/vite.config.ts`. Create `apps/frontend/e2e/serverConfig.ts`, `serverConfig.test.ts`, `sessionPersistence.e2e.ts`, and `sessionPersistence.ts` in that directory. Inspect existing `apps/frontend/e2e/helpers.ts` and reuse its account/database setup.

**Interfaces:** `createE2eServerConfig(options: { https?: import('node:https').ServerOptions }): import('vite').UserConfig` explicitly selects HTTP or HTTPS cookie behavior. The generated Safari config calls this factory with its certificate/key instead of spreading the HTTP configuration. Add test-server-only `POST /__e2e/session-probe` to start a counter identified by a random separate probe cookie, `GET /__e2e/session-requests` returning `{ created: number }`, and DELETE of the probe to release it. Count forwarded `POST /api/session` requests for that probe only, so parallel test accounts do not interfere. Do not record session cookie values or credentials. Pure assertion helper `assertSessionPersisted(before: { cookie: string; created: number }, after: { cookie: string; created: number; meStatus: number }): void` is shared by Safari and Playwright.

- [ ] Write configuration tests: HTTP removes only the Secure attribute; HTTPS leaves the complete Set-Cookie header intact. Use the retained proxy reproduction. Write browser tests that record the HttpOnly session cookie through automation, reload, then compare cookie and session creation count and require `/api/me` 200.
- [ ] Add the negative control from `evidence/root-test-session.e2e.mts`: clear only the session cookie before reload, preserve the independent probe cookie, allow automatic sign-in, and assert `assertSessionPersisted` throws even though the board returns. Also assert another browser's session creation does not affect this probe. Never print cookie values in failures; report which comparison failed.
- [ ] Run `pnpm --filter frontend exec vitest run e2e/serverConfig.test.ts` and `pnpm --filter frontend exec playwright test e2e/sessionPersistence.e2e.ts`; confirm the original persistence check/proxy fails these assertions.
- [ ] Implement the config factory and test-only counter in the Vite test server, leaving production API behavior untouched. Use the WebDriver cookie endpoint in the Safari script, sampling before/after the reload with the counter and `/api/me`. Preserve real Secure cookies in its HTTPS configuration. Make the helper errors identify reauthentication, missing/changed cookie, or failed `/api/me` without leaking values.
- [ ] Run both focused commands; require Chromium and WebKit positive and negative controls. Run `pnpm --filter frontend exec tsc -p tsconfig.scripts.json` and the existing `pnpm --filter frontend test:ipad-safari` on the available simulator, retaining its HTTPS cookie result. If simulator prerequisites are unavailable, report that check as incomplete rather than claiming a Safari simulator pass.
- [ ] Commit I6 files: `test: distinguish session persistence from automatic sign-in`.
