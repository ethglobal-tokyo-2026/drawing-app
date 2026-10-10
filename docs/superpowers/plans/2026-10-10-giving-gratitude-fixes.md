# Giving and Gratitude Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close findings 3, 4, 13, 20, and the Mini-game part of finding 10 without changing scoring or ownership rules.

**Architecture:** Bind authenticated API requests to the expected account and cancel disposed outbox work. Preserve packaged recipients and record possible Gift Message sends durably before LINE opens. Use the existing Back helper and keep test simulation bounded.

**Tech Stack:** TypeScript, React, Hono, SQLite/Drizzle, Vitest, Playwright.

**Spec:** [Functional frontend fixes design](../specs/2026-10-10-functional-frontend-fixes-design.md), “Giving and Gratitude.”

## Global Constraints

- Retain the current dependency lockfile; no dependency upgrades are part of these fixes.
- Preserve account isolation, ticket spending idempotency, Gift Claim Token secrecy, and Gratitude's separation from monetization.
- Preserve recoverable user data. Storage uncertainty must produce an explicit recovery state, never silently attach data to another session or discard it.
- Put new user-facing copy in `apps/frontend/src/i18n/strings/`, with English, Japanese, and the required interaction comment; follow the Japanese glossary. Developer-slip strings stay English as required by the repository.
- Use temporary databases and simulated LINE/Sui services in automated regressions; no real Gift Messages or paid transactions are needed.
- All other global constraints in the spec apply to every task. The database must never store a plaintext Gift Claim Token.

## Review Focus

- A still-mounted Alice tab can send after Bob replaces the shared cookie; cleanup alone cannot prevent it (G1).
- A late old-account error must not interrupt a newly mounted account or delete the old combo (G1).
- The server may record a pending send while its acknowledgement is lost; reload must not reopen the picker (G4).
- Stale cancellation and another tab's recovery must not downgrade or invalidate a newer pending/sent attempt (G4).
- Back during active play consumes history before the Mini-game finishes; bounded test simulation must prove its own termination (G3, G5).

---

### G1: Bind requests to their account and stop disposed Gratitude work — finding 13

**Dependency:** Implement before B1. This task owns shared API/session construction; B1 subsequently adds its board provider inside the account subtree. Keep account binding and outbox cancellation in one integrated review gate.

**Files:** Modify `apps/api/src/session.ts`, `errors.ts`, `shapes.ts` as required by the error union, and `apps/api/src/routes/session.test.ts`; add `apps/api/src/sessionAccount.test.ts`. Modify frontend `apps/frontend/src/api/httpApi.ts`, `apiClient.ts`, `serverClients.ts`, `earlySession.ts`, `SessionGate.tsx`, `ApiRoot.tsx`, `sessionLoss.ts`, `logOut.ts`, `suiWalletApi.ts`, `testing.tsx`, and their existing tests; `apps/frontend/src/line/chatMenu.ts`, `chatMenu.test.ts`; `apps/frontend/src/sticker-board/stat-board/StatBoard.tsx`. Modify `apps/frontend/src/gratitude/gratitudeOutbox.ts`, `gratitudeOutbox.test.ts`, and `apps/frontend/src/i18n/strings/errors.ts`, `api.ts`. Add `apps/frontend/src/gratitude/gratitudeAccount.test.ts` using the real API test app.

**Interfaces:**

- `createServerClient(fetchImpl: typeof fetch = fetch, expectedUserId?: string)` keeps its inferred Hono return type. A supplied immutable ID adds `x-croquis-user-id` to all requests made by that instance. Preserve request headers, credentials and existing timeouts.
- Replace exported `serverApi` with `createAccountApi(expectedUserId: string): ApiClient`, composing the existing Sui and early-answer decorators around an account-bound HTTP client. `AccountApiRoot({children}: {children: ReactNode}): ReactNode` inside SessionGate memoizes this on `me.id`, with an account-keyed provider subtree. Bootstrap `serverSession` stays separate.
- `openEarly(session: SessionApi, apiFor: (expectedUserId: string) => ApiClient, options: {board: boolean; now?: () => number}): EarlyOpening` resolves Me first, then requests that account's board/tickets. Change `startEarlySession` similarly. Change `takeBoard(expectedUserId: string)` and `takeTickets(expectedUserId: string)` to preserve their existing return types while refusing consumption by another account. `withEarlyAnswers(api: ApiClient, expectedUserId: string, early?: () => EarlyOpening | null): ApiClient` supplies this ID.
- Make authenticated `SessionApi` calls explicit: `setHandle(handle: string, expectedUserId: string): Promise<{me: Me}>` and `signOut(expectedUserId: string): Promise<void>`. Update their callers with the known Me ID. Anonymous sign-in/Me bootstrap remain exempt from the required mutation header.
- Add `ApiRequestOptions {signal?: AbortSignal}` and `recordGratitude(combo: RecordGratitude, options?: ApiRequestOptions): Promise<Gratitude>`. Combine the external signal with the normal request timeout; do not replace the deadline. Propagate options through decorators and doubles.
- Extend existing notifications to `reportSessionLost(error: ApiError, expectedUserId?: string): void` and `onSessionLost(listener: (error: ApiError, expectedUserId?: string) => void): () => void`. The bound client supplies its ID for signed-out and account-changed responses; SessionGate ignores another account's notifications and distinguishes the recovery action by error code. Bootstrap failures stay in bootstrap handling.

- [ ] Port the real cookie reproduction from `evidence/session-cookie-outbox.test.ts`. Alice's saved body, another tab's Bob login, and an old callback must produce `409 session_account_changed` with no domain mutation and no outbox/refusal deletion. Reestablish Alice, send the identical body, and require 201 exactly once. Keep the same-account success control. Run the new API/frontend tests and establish red.
- [ ] In `requireSession`, authenticate the signed cookie first. Enforce matching header whenever one is supplied, and require it for protected mutations; missing/mismatch returns logged `409 session_account_changed` before a handler. Never authorize from the header. Explicitly exempt anonymous session creation and Me bootstrap, not logout or handle changes. Update API fixture helpers to send their known signed-in user ID; add explicit missing/wrong-header assertions so fixture updates cannot hide enforcement failures.
- [ ] Implement immutable account client construction and the changed early-answer/session interfaces. Ordinary profile changes do not recreate the client. Update `logOut(expectedUserId: string): Promise<void>` and its StatBoard caller; bind HandlePrompt's existing one-argument callback at SessionGate with `state.me.id`. Change `linkChatMenu` to require its known account ID and construct a bound client from `ChatMenuLink`'s `useMe()`, retaining its injectable test client. On account mismatch, SessionGate unmounts the old account subtree and shows a persistent session-changed state with an explicit catalog-backed Reload action. Do not automatically sign Alice back in over Bob's cookie. Scope both 401 and 409 notifications so a late Alice result cannot close Bob's current subtree. Preserve the existing LINE identity check and recent-recovery protection for bootstrap.
- [ ] Give `resendGratitudeWhenReachable` an owned AbortController; abort it and remove listeners at cleanup. Make its delayed in-play wait abortable; check cancellation before each item and after every await, including before local removal/refusal writes. Pass the signal to `recordGratitude`. Cancellation or mismatch keeps the exact original body; genuine permanent domain refusals for a matching account keep their existing handling.
- [ ] Add fake-clock tests for cleanup before wake, during request, between queued combos, repeated online/visibility events, and timeout with an external signal. Add early Me→cookie change→tickets and late Alice notification after Bob mount. Assert no late local mutation or unintended reauthentication. Pending timers must be absent after disposal.
- [ ] Run `pnpm --filter frontend exec vitest run src/api/httpApi.test.ts src/api/earlySession.test.ts src/api/SessionGate.test.tsx src/gratitude/gratitudeOutbox.test.ts src/gratitude/gratitudeAccount.test.ts` and `pnpm --filter @drawing-app/api exec vitest run src/routes/session.test.ts src/sessionAccount.test.ts`. Run typechecks for both packages to find every changed caller/decorator. Expect all pass. Commit: `fix: preserve Gratitude across session account changes`.

### G2: Preserve an existing gift's recipient — finding 3

**Files:** Modify `apps/api/src/gifts/packaging.ts`, `apps/api/src/shapes.ts`, `apps/api/src/app.flow.test.ts`, `apps/frontend/src/giving/giftBackend.ts`, and `giftBackend.test.ts`.

**Interfaces:** Keep the existing package request fields. Add `forUserId: string | null` to giver-only `PackagedGift`. Repeated Packaging resumes the open gift; only creating a new gift consumes the requested recipient. An intentional destination change uses explicit Take out and new Packaging.

- [ ] Add actual-API tests: package for Bob; reopen from own board, another board, and explicit null; report sent; Bob still sees the gift. Cover both mock and Sui retry/deposit paths, including an irrelevant new recipient who cannot receive. Establish red with `pnpm --filter @drawing-app/api exec vitest run src/app.flow.test.ts` and the focused frontend backend test.
- [ ] Return the giver's existing open gift before validating an unused replacement recipient, and remove repeated `packFor` mutation. Have frontend recovery inspect kept send state and use the returned original recipient, rather than implying the board where recovery started is a new destination. Do not alter public Gift detail metadata or recreate the claim token.
- [ ] Run `pnpm --filter frontend exec vitest run src/giving/giftBackend.test.ts` and API gift flow tests. Assert original recipient, gift ID and token identity survive uncertain-send and failed-report recovery. Commit: `fix: preserve recipients when resuming packaged gifts`.

### G3: Make Back follow Mini-game close semantics — Mini-game part of finding 10

**Files:** Modify `apps/frontend/src/gratitude/GratitudeMiniGame.tsx`, `GratitudeMiniGame.test.tsx`; extend `apps/frontend/e2e/backNavigation.e2e.ts` after I5 creates it.

**Interfaces:** Existing local `close(): boolean` returns false when `engine.close()` ends an active combo and the receipt must remain, true when `leave()` closes the overlay. Register `useBackToClose(true, close)`; keep X/Escape/swipe on that same close action.

- [ ] Add ready→Back closes, playing→first Back keeps the recorded combo and receipt, receipt→next Back closes, parent Receiving remains, and reopen has no accumulated entries. Include a second close during ending animation using current `engine.close()` behavior. Establish red with `pnpm --filter frontend exec vitest run src/gratitude/GratitudeMiniGame.test.tsx`.
- [ ] Add the shared Back hook and exact return values so it replenishes the entry when the receipt stays. Do not change scoring or impose a new wait for the ending animation.
- [ ] Run the focused suite and `pnpm --filter frontend exec playwright test e2e/backNavigation.e2e.ts`; require real Back traversal in Chromium and WebKit, alongside I5's ticket cases. Real Android/LINE Back remains a separate platform acceptance check. Commit: `fix: preserve Mini-game close flow on browser Back`.

### G4: Record a possible Gift Message send durably — finding 4

**Dependency:** G2's recipient semantics and G1's account-bound mutation enforcement. This task changes schema, server and frontend together; do not ship the new frontend against an old API.

**Files:** Modify `packages/db/src/schema/gifts.ts`, `gifts.test.ts`, `packages/db/src/migrate.test.ts`; generate the next migration and metadata under `packages/db/drizzle/` using the existing generator. Modify `apps/api/src/gifts/packaging.ts`, `routes/gifts.ts`, `shapes.ts`, `errors.ts`, and `app.flow.test.ts`; add `apps/api/src/gifts/messageAttempts.test.ts`. Modify frontend `api/apiClient.ts`, `api/httpApi.ts`, affected API doubles/decorators, `giving/giftBackend.ts`, `giveFlow.ts`, `keptGifts.ts`, their existing tests, `giving/Giving.test.tsx`, `apps/frontend/e2e/giving.e2e.ts`, and `i18n/strings/giving.ts`.

**Server interfaces and invariants:**

- Keep gift ownership statuses unchanged. Add nullable `message_attempt_id` in existing bytes32 format and `message_attempt_state: 'not_started' | 'pending' | 'cancelled' | 'sent'`, default `not_started`. ID is null exactly when state is not_started. Pending never expires based on elapsed time.
- Add `messageAttempt: {id: string; state: 'pending' | 'cancelled' | 'sent'} | null` to giver-only `PackagedGift`. Returning the giver's already-sent gift for recovery is allowed with null token/deposit; it cannot begin another send.
- Add `POST /api/gifts/:giftId/message-attempt` body `{attemptId: bytes32}`. Check giver, packed gift and deposited pending escrow, then transactionally record pending. Same ID is idempotent; another ID while pending returns 409 `gift_message_unresolved`; a new ID after confirmed cancellation is allowed.
- Extend `POST /api/gifts/:giftId/shared` to `{attemptId: bytes32, outcome: 'sent' | 'cancelled'}`. Require the matching attempt, else 409 `gift_message_attempt_changed`. Sent changes the attempt and ownership status atomically with existing sentAt semantics. Repeated matching reports are idempotent. Cancellation cannot downgrade sent or a newer attempt.

**Frontend interfaces:** Replace `GiftBackend.markMaybeSent` with `beginMessageAttempt(giftId: string, attemptId: string): Promise<void>`; change `markSent(giftId: string, attemptId: string): Promise<void>` and `markCancelled(giftId: string, attemptId: string): Promise<void>`. Add corresponding typed `ApiClient` calls. The flow keeps the generated attempt ID with its current send, using existing bytes32 ID generation. Retain a per-user in-memory keptGift fallback; `keepGift` returns whether device persistence succeeded so Giving can retain an explanatory error. The server attempt is the safety authority.

- [ ] Write protocol tests before implementation: duplicate begin, different concurrent begin, wrong giver/escrow, stale cancel, repeated sent, sent then cancel, and terminal gifts. Add migration fixtures with existing packed/sent/received/taken-out/returned rows. Run `pnpm --filter @drawing-app/db test` and `pnpm --filter @drawing-app/api exec vitest run src/gifts/messageAttempts.test.ts src/app.flow.test.ts` to establish missing-schema/protocol failures.
- [ ] Generate the next migration from the schema; choose its number from the current journal at execution time. Backfill existing packed gifts conservatively as pending with unique bytes32 IDs because an earlier picker may have sent; existing sent gifts become sent with IDs. Preserve existing ownership/date constraints. Terminal gifts need no invented send history. Test a populated upgrade, not only a fresh database. Use existing gift transaction/serialization discipline for begin/report/state checks.
- [ ] Implement the server protocol and type exports, then update the flow/backend. `openPicker` awaits acknowledged begin before calling `sender.send`, prevents duplicate entry while waiting, and retries the same begin ID only while no picker has opened. A failure or lost acknowledgement opens no picker. On reload, server pending enters existing maybeSent recovery; “It went out” reports that stored ID. Definitive LINE cancellation resolves the matching attempt; timeout/unknown never does.
- [ ] Remove automatic Take out/repackage when a Gift Claim Token is missing. For pending use maybeSent; for a definitely unsent gift with no usable token, use the existing failed-recovery presentation with a catalog message and an explicit Take out action. Close preserves the gift. This deliberate extra action avoids a read/check/use race with another tab beginning a send; no new automatic take-out protocol is needed. Keep same-page token reuse only after confirmed cancellation. Explicit user Take out keeps its current ownership rules.
- [ ] Retain local sent/cancelled reports in memory and storage for retry; surface storage failure persistently and never clear the pending local marker until server cancellation succeeds. After storage and report both fail, reload still sees server pending and cannot silently resend or invalidate the token. Do not log token or message contents in diagnostics.
- [ ] Add flow tests for blocked/quota storage, failed begin with zero picker calls, lost begin acknowledgement then reload, unknown/late LINE result, failed sent report, token loss, and two tabs. Assert no automatic Take out, no second picker call for unresolved attempts, and the original recipient remains. Include at least one actual API-backed frontend test. Run `pnpm --filter frontend exec vitest run src/giving/giftBackend.test.ts src/giving/giveFlow.test.ts src/giving/Giving.test.tsx` and the API/DB focused suites; require all pass.
- [ ] Run `pnpm --filter frontend exec playwright test e2e/giving.e2e.ts` with the LINE boundary mocked, plus changed-package typechecks. Verify definite cancellation, uncertain recovery, explicit Take out and recipient preservation. Commit the complete schema/API/client change: `fix: persist Gift Message attempts before opening LINE`.

### G5: Bound test simulations and assert termination — finding 20

**Files:** Modify `apps/frontend/src/gratitude/heartMotion.test.ts`, `replayRecorder.test.ts`, and retained `docs/reviews/2026-10-10-functional-frontend/evidence/gift-test-heart-loop.py` only to update its expected failure criterion.

**Interfaces:** No production or scoring changes. Simulation bounds are test guards, not application deadlines.

- [ ] Replace the heart-flight loop with at most `Math.ceil(2 * hz)` frames (two seconds of simulated time; the existing flight is 0.38 seconds). Break on landing, then assert landing before calculating aggregate stretch. Failure includes hz, scale, last opacity, and elapsed simulated time. Bound end-of-combo loops in replayRecorder by the existing maximum combo duration plus setup duration and one frame, then explicitly assert ended.
- [ ] Run `pnpm --filter frontend exec vitest run src/gratitude/heartMotion.test.ts src/gratitude/replayRecorder.test.ts`; baseline must pass. With the retained opacity-floor mutation (`0.001`), require a normal failed landing assertion before the external watchdog. Update the evidence runner's expected outcome accordingly and run `python3 docs/reviews/2026-10-10-functional-frontend/evidence/gift-test-heart-loop.py`.
- [ ] Keep the runner's own process-group timeout as a safeguard; never rely on Vitest's same-event-loop timeout to stop synchronous work. Commit: `test: bound Gratitude motion simulations`.
