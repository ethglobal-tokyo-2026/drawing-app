# Live BIGWHEEL and Hana Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the authenticated BIGWHEEL operator privately switch to Hana in live Croquis, exchange an actual sticker in both directions, and record the existing receiving and Gratitude experience.

**Architecture:** Keep the verified LINE identity as the authenticated principal and store browser-session selection separately. The API authorizes selected-account requests and delegates bounded JWT issuance to the existing isolated auth service; Privy must establish a distinct matching Sui wallet before actions become available. Reuse ordinary sponsored escrow transfers, with protected delivery into the other profile's Croquis inbox and a reload between selections.

**Tech Stack:** TypeScript, Hono, Drizzle/SQLite, React, LIFF, the installed Privy React SDK, existing Sui transaction ledger, Vitest, Playwright Chromium and WebKit, existing systemd/HAProxy/Fastly deployment.

**Spec:** `docs/superpowers/specs/2026-10-13-live-person-switching-design.md`. Read it and `AGENTS.MD` before execution.

## Global Constraints

- Only the authenticated BIGWHEEL account can select BIGWHEEL or the existing Hana account.
- BIGWHEEL is `d5984df6-db28-44f2-801c-2f2f5b565463`; Hana is `bef03287-50ee-4e51-aaef-a9dc1303b854`, with stored identity `dev-video-hana`. Validate live rows before enabling; never create a replacement Hana.
- The first version switches through a short page transition. It does not sign the operator out of LINE.
- Selection applies across the browser's tabs because its API cookie and Privy session are shared.
- Actual transfers remain primary. Mocking is an authorized contingency if real authentication is blocked, using separate storage; never put the live API into `mockChain` mode.
- Visible profiles use their ordinary names and handles. They have no demo labels.
- Every new user-facing label, transition, disabled-action explanation, and persistent error is defined in the catalog, with English and Japanese according to the existing glossary.
- The former cookie format and public `/v1/auth/privy-jwt` exchange are retired. Public JWKS, configured issuer, signing key isolation, ordinary LINE authentication, and ordinary LINE delivery remain authoritative.
- Hana cannot purchase reserve tickets or delete an account through selected-person authorization.
- Historical seed gifts have no Sui escrow objects; never resume them or edit ownership directly to recover a transaction.
- Ship authorization, protected auth issuance, frontend subject checks, controlled delivery, and catalog changes together. Configuration is off by default, verification with transfers blocked, then live after the real Privy checkpoint passes.
- Use existing bounded request handling. Keep credentials, assertions, JWTs, and Gift Claim Tokens out of logs and persistent switching state.
- Isolate implementation with `superpowers:using-git-worktrees`; do not disturb parallel work in the shared checkout. Commit only task files, squash into representative commits, and remove completed plans/specs after merging.

## Review Focus

1. An ordinary token-first gift received by BIGWHEEL can have an open server-signed claim without a recorded recipient: selection must still wait after restart. Tasks 1–2 persist and test the requesting recipient.
2. A full reload can retain the previous Privy SDK user: no wrong-wallet readiness, creation, linking, or signer publication. Task 4 tests persisted user and delayed callbacks independently.
3. Switching back to BIGWHEEL creates the same user ID with a different version: an old BIGWHEEL tab must remain stale. Tasks 2, 4, and 7 test this explicitly.
4. A sent screen can have an unacknowledged delivery, and placement saves can be active with no failures: selection must wait for actual settlement. Tasks 5–6 test both conditions and lost answers.
5. Disabling selection while background receipt or chat-menu jobs run must not send anything to Hana's fabricated LINE identity. Task 6 tests exclusions independently of the active session and enabled setting.

---

## File responsibilities

| Responsibility                                     | Files                                                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Selection storage and claim attribution            | New `packages/db/src/schema/personSwitchSessions.ts`; existing `schema/index.ts`, `schema/suiTransactions.ts`; generated migration and metadata in `packages/db/drizzle/`                                                   |
| Authenticated session and public contract          | `apps/api/src/session.ts`, `routes/session.ts`, `client.ts`; new `session/sessionShapes.ts`, `session/personSwitch.ts`                                                                                                      |
| Selection, operation serialization, and mode gates | New `apps/api/src/routes/personSwitch.ts`, `session/personOwnership.ts`; existing `app.ts`, `deps.ts`, `server.ts`, gift/sticker/ticket route entry points, and background mint/expiry entry points                         |
| Protected JWT issuance                             | New `packages/line-auth/src/internalAssertion.ts`, `apps/api/src/services/privyJwt.ts`, `routes/privyJwt.ts`; existing auth HTTP/issuer/startup, package exports, API dependency assembly                                   |
| Accepted frontend session                          | New `apps/frontend/src/api/sessionContext.ts`; existing `SessionGate.tsx`, `earlySession.ts`, `ApiRoot.tsx`, `httpApi.ts`, `serverClients.ts`, `meContext.ts`                                                               |
| Privy identity and signing                         | Existing `identity/privy.ts`, `PrivySession.tsx`, `MakeSuiWallet.tsx`, `SuiWalletBridge.tsx`, `suiSigner.ts`, `suiWallet.ts`, `useIdentity.ts`; new `identity/privyAccount.ts`                                              |
| Private switching and state settlement             | New `apps/frontend/src/api/personSwitch.ts`, `api/PersonSwitchProvider.tsx`; existing `boardPlacementSaves.ts`, `SettingsNote.tsx`, `StatBoard.tsx`, `SwitchPersonControls.tsx`                                             |
| Controlled delivery and recovery                   | New `apps/api/src/gifts/personDelivery.ts`, `apps/frontend/src/giving/personGiftDelivery.ts`; existing gift routes, Packaging/receiving/notices, GiftSender/backend/sentReports/Giving/GiveSheet and own-board Giving entry |
| Catalog                                            | Existing `apps/frontend/src/i18n/strings/stickerBoard.ts`, `giving.ts`, `identity.ts`, `errors.ts`, plus catalog index if a section is added                                                                                |
| Deployment and durable recovery                    | New `deploy/install-auth-secret.mjs` and tests; existing `deploy.sh`, `deploy-api.sh`, service units, environment examples, `README.md`; new durable `docs/live-person-switching.md`                                        |
| Browser acceptance                                 | New `apps/frontend/e2e/personSwitching.e2e.ts`; existing browser helpers and API E2E startup only as needed to enable a fixed test pair                                                                                     |

Check exact existing paths with `rg --files` before editing. Generated migration numbering follows the execution branch's current journal; at planning time the next migration is `0018`. Do not duplicate another concurrent migration's number. Concurrent work is changing LINE picker error handling and Giving; rebase onto its completed changes and preserve the removal of manual unverified LINE-send confirmation. Controlled delivery supplies its own server confirmation. The catalog path is `apps/frontend/src/i18n/strings/stickerBoard.ts`; settings settlement belongs in the existing `apps/frontend/src/sticker-board/stat-board/settingSaves.ts`.

## Shared contracts

These signatures are implementation decisions; define them in the listed task rather than leaving multiple variants.

```ts
// API session/sessionShapes.ts; exported through API client.ts.
type AccountSelection = { userId: string; selectionVersion: string | null };
type AuthenticatedSession = {
  authenticatedUserId: string;
  sessionId: string;
  expiresAt: Date;
};
type ResolvedSession = AuthenticatedSession & {
  selectedUserId: string;
  selectionVersion: string | null;
};
type SessionEnvelope = {
  me: Me;
  authenticated: Pick<Me, "id" | "lineUserId" | "lineDisplayName" | "linePictureUrl">;
  allowedSelections: Person[];
  selectionVersion: string | null;
  expectedPrivySubject: string;
  expectedSuiAddress: string | null;
  personSwitchMode: "off" | "verify" | "live";
};
type PersonSwitchConfig = {
  mode: "off" | "verify" | "live";
  operatorUserId: string | null;
  hanaUserId: string | null;
};
// POST /api/session/person: { userId: string } -> SessionEnvelope.
// POST /api/session/privy-jwt: { accessToken: string } -> PrivyJwtResult.
// Actor/version headers: x-croquis-user-id and x-croquis-selection-version.
// Initial operator version is the signed sessionId. Ordinary users use null.
```

`personSwitchMode` describes private capability and is `off` for ordinary users. Ordinary selected-account settings responses retain `{ me }`; they cannot replace authenticated-session metadata. No caller provides a subject or wallet address to JWT issuance.

### Task 1: Store and resolve the authenticated session separately from selection

**Files:** Database files above; `apps/api/src/session.ts`, `session/sessionShapes.ts`, `session/personSwitch.ts`, `routes/session.ts`, `client.ts`, `deps.ts`, `server.ts`, `testing/createTestApp.ts`, `testing/fakes.ts`; related session, image-access, schema, and migration tests.

**Interfaces:** Produce `sessionValue(userId: string, sessionId: string, now: Date): string`, `setSessionCookie(c, deps, userId): Promise<AuthenticatedSession>`, `resolveSession(c, deps): Promise<ResolvedSession | undefined>`, `sessionEnvelope(deps, session): SessionEnvelope`, and `validatePersonSwitchConfig(db, config): void`. `AppEnv` gains `session: ResolvedSession`; existing `userId` remains the selected actor. `AppDeps` gains `personSwitch: PersonSwitchConfig` and `lineChannelId: string` for existing subject derivation. Keep one resolver shared by middleware and image authorization.

- [ ] Write failing tests using one retained signed cookie, not a new `send({as})` cookie per request:

```ts
it("retains the authenticated profile while resolving Hana", async () => {
  expect(envelope.me.id).toBe(HANA_ID);
  expect(envelope.authenticated.id).toBe(BIGWHEEL_ID);
  expect(envelope.expectedPrivySubject).toBe(privySubject(channelId, "dev-video-hana"));
});
it("rejects the former cookie format and expired or deleted principals", async () => {
  expect(response.status).toBe(401);
});
it("refreshes LINE on BIGWHEEL without changing Hana or the session version", async () => {
  expect(after.me.id).toBe(HANA_ID);
  expect(after.selectionVersion).toBe(before.selectionVersion);
  expect(hana.lineDisplayName).toBe(before.me.lineDisplayName);
});
```

Also test ordinary users get no selection row, off-mode Hana recovers through `session_account_changed`, logout removes only this session's row, missing-version requests cannot use Hana, and headerless image authorization uses selected NSFW opt-in. Schema tests cover foreign keys, expiration, uniqueness, and `updated_at`. Add nullable `suiTransactions.requestedByUserId` referencing users; preserve existing sender `userId` rules.

- [ ] Run `pnpm --filter @drawing-app/api test src/sessionAccount.test.ts src/routes/session.test.ts` and `pnpm --filter @drawing-app/db test src/migrate.test.ts`; new assertions must fail for missing selection support, not fixture setup.
- [ ] Implement strict signed-cookie parsing and UUID generation with existing `ids.uuid()`. Define `person_switch_sessions` and include it in `allTables`. Validate both configured users and Hana's stored identity when configured, including off mode with retained IDs. Only an enabled configured operator exposes selections. Prune expired rows on startup and selection. Keep authenticated profile refresh on the same cookie/session ID. Generate the migration with `pnpm --filter @drawing-app/db db:generate -- --name=person_switch_sessions` and inspect SQL and metadata.
- [ ] Run the tests above plus new `src/schema/personSwitchSessions.test.ts`, existing image-access tests, and API/database typechecks. Expected: all selected tests pass; migration/schema objects agree; no old-cookie compatibility branch remains.
- [ ] Commit only this task's explicit files: `feat: distinguish authenticated and selected Croquis accounts`.

### Task 2: Authorize selection and serialize ownership operations

**Files:** New `apps/api/src/routes/personSwitch.ts`, `session/personOwnership.ts`, `routes/personSwitch.test.ts`, `session/personOwnership.test.ts`; modify session selection module, `app.ts`, errors/shapes, `routes/gifts.ts`, `routes/stickers.ts`, `routes/tickets.ts`, `gifts/receiving.ts`, `sui/transactions.ts`, `stickers/mint.ts`, `gifts/expiry.ts` and their tests.

**Interfaces:** Consume Task 1's `ResolvedSession` and config. Produce `selectPerson(deps: AppDeps, session: ResolvedSession, targetUserId: string): Promise<SessionEnvelope>`, `withPersonOwnership<T>(deps: AppDeps, session: ResolvedSession, run: () => Promise<T>): Promise<T>`, `withPersonBackgroundOwnership<T>(deps: AppDeps, userIds: readonly string[], run: () => Promise<T>): Promise<T>`, and `pendingPersonOwnership(deps: AppDeps): { kind: string; giftId: string | null; stickerId: string | null } | null`. Refusals use existing API error handling: 403 `person_switch_forbidden`, 409 `session_account_changed` or `person_switch_busy`. Produce the typed `POST /api/session/person` route.

- [ ] Write failing tests:

```ts
it("commits one of two selections with the same expected version", async () => {
  expect(statuses.sort()).toEqual([200, 409]);
});
it("rejects old BIGWHEEL headers after BIGWHEEL to Hana to BIGWHEEL", async () => {
  expect(staleMutation.status).toBe(409);
});
it("waits for an ownership start before the sponsorship row exists", async () => {
  expect(selectionSettled).toBe(false);
  releaseSponsorship();
  expect((await selection).status).toBe(409);
});
it("blocks selection after reopening an ordinary token claim with no gift recipient", async () => {
  expect(openClaim.userId).toBeNull();
  expect(openClaim.requestedByUserId).toBe(BIGWHEEL_ID);
  expect(beforeReconciliation.status).toBe(409);
  expect(afterReconciliation.status).toBe(200);
});
```

Cover nonoperator/arbitrary target/forged cookie/expired row, first insert versus update CAS, feature disable, deleted Hana, pending mint/claim/return/payment, packed unresolved delivery, and a settled sent gift allowing selection. Verification mode permits selected authentication and reads but rejects Hana mutations and pair transfers; Hana reserve purchases and deletion remain forbidden in live mode.

- [ ] Run new selection/ownership tests with `pnpm --filter @drawing-app/api test src/routes/personSwitch.test.ts src/session/personOwnership.test.ts`; confirm intended failures.
- [ ] Implement one outer configured-pair lock with existing `oneAtATime` before sticker/gift/payer locks. Recheck actor/version inside it and keep it through ownership start or submission. Use a synchronous immediate SQLite transaction for selection CAS; session ID is the initial version, every successful selection generates a new UUID. Wrap each HTTP ownership entry once, including ordinary gifts received/given by BIGWHEEL, sealing/minting, payments, deposit, take-out, and message-attempt/delivery transitions. Give background mint/expiry entry points the same outer-first order; nested domain calls must not reacquire it. Open-ledger lookup joins gift participants and Original Artist and checks `requestedByUserId`. Split the claim/return `SuiTransactionSubject` variant; claim sponsorship stores the existing selected `userId` as `requestedByUserId` without changing `sponsored`, `runAsServer`, or claim function signatures. Stop selected requests after mode or account changes. Headerless bootstrap `/me` resolves authoritative state for recovery, but mutation and switch endpoints require current actor/version.
- [ ] Run selection/ownership tests, `src/routes/giving.test.ts`, `src/routes/receiving.test.ts`, `src/gifts/expiry.test.ts`, `src/stickers/mint.test.ts`, `src/sui/transactions.test.ts`, session tests, and API typecheck. Expected: passes, unchanged ordinary transfer recovery, no deadlocked nested lock path.
- [ ] Commit explicit task files: `feat: restrict person selection around sticker transfers`.

### Task 3: Issue Privy JWTs only through the authenticated API

**Files:** New `packages/line-auth/src/internalAssertion.ts`, `test/internalAssertion.test.ts`, API `services/privyJwt.ts`, `routes/privyJwt.ts` and tests; modify auth issuer/HTTP/startup/tests/package exports, `packages/line-auth/src/line.ts`, API `services/lineVerifier.ts`, deps/server/app, frontend `vite.config.ts`, deployment secret installer/service units/scripts/examples and tests.

**Interfaces:** Produce shared `PrivyJwtAssertion = { authenticatedUserId: string; authenticatedLineUserId: string; selectedUserId: string; selectedLineUserId: string; sessionId: string; selectionVersion: string | null; scope: "croquis-privy-jwt"; issuedAt: number; expiresAt: number }`, with integer times in seconds. Produce `authenticatePrivyAssertion(assertion: PrivyJwtAssertion, secret: string): { assertion: PrivyJwtAssertion; mac: string }`, `verifyPrivyAssertion(body: unknown, secret: string, nowSeconds: number): PrivyJwtAssertion`, `PrivyJwtResult = { jwt: string; subject: string; expiresAt: number }`, and `PrivyJwtService.issue(assertion: PrivyJwtAssertion, signal: AbortSignal): Promise<PrivyJwtResult>`. Auth issuer becomes `issueAuthorized(lineUserId: string, expiresAt: number): Promise<PrivyJwtResult>`; remove former `issue(accessToken)`. `LineVerifier.verifyAccessToken(accessToken: string, signal?: AbortSignal): Promise<LineProfile>` passes a caller's deadline into the shared LINE verifier. API exposes `POST /api/session/privy-jwt`. Auth service exposes only protected `POST /_internal/privy-jwt` and public JWKS.

- [ ] Write failing tests:

```ts
it("rejects altered assertion fields and expired or excessive lifetime", async () => {
  expect(tampered.status).toBe(403);
  expect(expired.status).toBe(403);
  expect(tooLong.status).toBe(403);
});
it("caps assertion and JWT expiry at the ordinary session expiry", async () => {
  expect(jwt.exp).toBeLessThanOrEqual(sessionExpirySeconds);
  expect(jwt.exp - jwt.iat).toBeLessThanOrEqual(PRIVY_JWT_LIFETIME_S);
});
it("checks the LINE principal and current selection after asynchronous verification", async () => {
  expect(wrongLine.status).toBe(403);
  expect(lateExchange.status).toBe(409);
});
it("retires the anonymous exchange but keeps the configured JWKS", async () => {
  expect(oldExchange.status).toBe(404);
  expect(jwks.keys).toEqual(existingKeys);
});
```

Test ordinary users receive their own subject, browser-supplied identities/addresses are rejected, wrong MAC/no internal authentication, oversized body, wrong scope, future issue time, timeout and unavailable issuer, signing verifies against unchanged public JWKS, and sanitized logs contain no submitted credentials.

- [ ] Run `pnpm --filter @drawing-app/line-auth test` and new API issuer/route tests; confirm protected API/issuer assertions fail before implementation.
- [ ] Implement HMAC authentication over the canonical serialized assertion, constant-time MAC comparison, exact body validation, existing ES256 subject derivation and signing. No signing key enters API dependencies. The API verifies real LINE identity against authenticated principal, rechecks selection under the Task 2 boundary before issuer call and again before returning, and takes no requested subject from the client. Use one 10-second total exchange budget, including LINE verification and loopback delegation; pass its signal through both LINE fetches and delegation rather than giving each a new full budget. Keep the frontend's existing 10-second bound and visible retries; exhaustion maps to a reviewable unavailable error.
- [ ] Install one new `PRIVY_JWT_INTERNAL_SECRET` into separate mode-0600 private environment files for both services using `deploy/install-auth-secret.mjs`; public tracked environment files never contain it. Add `PRIVY_JWT_INTERNAL_URL=http://127.0.0.1:8787/_internal/privy-jwt` to API configuration and reject a nonloopback destination. Preserve service directory exclusions. Update the deploy order so the protected issuer is healthy before the new API exchange, and frontend publishes last; on failure retain the previous coherent service/build set. Existing visitors may renew their API session from LINE. Never restore the anonymous JWT endpoint as a compatibility path. Update the dev proxy to reach the authenticated API route.
- [ ] Run auth/API tests and typechecks plus secret installer tests. Expected: passing cryptographic and sanitized-error tests; installer rejects missing secrets without printing values; no secret is tracked. Public routing denial is verified during Task 8, not assumed from localhost binding.
- [ ] Commit explicit task files: `feat: authorize Privy issuance through Croquis sessions`.

### Task 4: Bind frontend identity, wallet readiness, and signing to selection

**Files:** API client/session files and identity files in the map; new `api/sessionContext.ts`, `identity/privyAccount.ts`, matching tests; update existing SessionGate/earlySession/AccountApiRoot/httpApi/PrivySession/MakeSuiWallet/suiSigner tests and MeHolder fixtures.

**Interfaces:** Consume `SessionEnvelope`, `AccountSelection`, and `PrivyJwtResult`. Produce `useSessionEnvelope(): SessionEnvelope`, `createAccountApi(selection: AccountSelection): ApiClient`, `SessionApi.selectPerson(userId: string, selection: AccountSelection): Promise<SessionEnvelope>`, `SessionApi.privyJwt(accessToken: string, selection: AccountSelection, signal: AbortSignal): Promise<PrivyJwtResult>`. All account clients include immutable actor and applicable version headers. Produce `PrivyAccount = AccountSelection & { expectedSubject: string; expectedSuiAddress: string | null }`, `matchesPrivySubject(user: User | null, expectedSubject: string): boolean`, and `matchesPrivyAccount(user: User | null, account: PrivyAccount): boolean`. Subject-only matching decides whether cached authentication must be logged out; wallet-dependent readiness additionally requires a wallet and the expected address when known. `fetchPrivyJwt(account: PrivyAccount): Promise<string | undefined>` is keyed by account/version. Keep `useMe(): Me` as the selected profile API.

Update the existing `SessionApi` operations consistently: `signIn(request: existing inferred sign-in body, expected?: AccountSelection): Promise<SessionEnvelope>`, `me(lineUserId?: string, expected?: AccountSelection): Promise<SessionEnvelope>`, `setHandle(handle: string, selection: AccountSelection): Promise<{ me: Me }>`, and `signOut(selection: AccountSelection): Promise<void>`. Bootstrap/recovery omits expected selection only while resolving the authoritative envelope and validating its principal; background sign-in and all mutations retain it.

- [ ] Write failing tests:

```ts
it("accepts selected Hana only when LIFF matches authenticated BIGWHEEL", async () => {
  expect(renderedName).toBe("Hana");
  expect(lineLogout).not.toHaveBeenCalled();
});
it("logs out a persisted wrong Privy user before synchronizing another subject", async () => {
  expect(privyLogout).toHaveBeenCalledBefore(authenticateHana);
  expect(createWallet).not.toHaveBeenCalledWith(expect.objectContaining({ user: bigwheelUser }));
});
it("does not publish a signer from a mismatched wallet or delayed old callback", async () => {
  expect(installedSigner).toBeNull();
  expect(readyStatus.state).not.toBe("signed-in");
});
it("discards JWTs and signatures from an earlier version of the same account", async () => {
  expect(oldJwtAccepted).toBe(false);
  expect(reportDeposit).not.toHaveBeenCalled();
});
```

Test matching subject without wallet creates only the selected person's wallet; known address mismatch stays unavailable; retry and SDK-wallet-frame race remain bounded; ordinary LINE sign-in still works; background profile/handle/settings updates preserve envelope metadata. Verify startup cached boards/tickets do not leak across selection versions.

- [ ] Run `pnpm --filter frontend test src/api src/identity`; new safety assertions must fail against current unrestricted SDK-user acceptance.
- [ ] Implement immutable accepted-session context and key provider lifetime by actor plus version. SessionGate checks LIFF against `authenticated`, and `useIdentity` displays selected profile while retaining actual LINE `inClient`. Early session answers travel with the accepted envelope. Scope JWT/status/wallet-attempt state to `PrivyAccount`. Disable JWT synchronization until wrong SDK user logout completes; inspect `custom_auth.customUserId` for subject matching on callbacks and later user changes. Independently guard wallet creation, readiness, address publication, and signer installation. Clear signer on transition and revalidate account/version immediately before signing and submitting results. Ordinary users also use the new authenticated API exchange. Keep errors persistent and catalog-based.
- [ ] Run frontend API/identity tests and typecheck. Expected: passes with independent wrong-subject and wrong-address tests; no direct `/v1/auth/privy-jwt` fetch remains. These are mocked tests and do not prove live provider switching.
- [ ] Commit explicit task files: `feat: bind Croquis wallet actions to selected identity`.

### Task 5: Add the private switching control and settle device state

**Files:** New frontend `api/personSwitch.ts`, `api/PersonSwitchProvider.tsx` and tests; modify private controls, StatBoard/developer slip rendering, board saves, `stat-board/settingSaves.ts`, `SettingsNote.tsx`, relevant providers, catalog and tests.

**Interfaces:** Consume Task 4's session/client context. Produce `requestPersonSwitch(targetUserId: string, destination?: { recipientUserId: string; giftId: string }): Promise<void>` through the provider, `usePersonSwitch(): { pending: boolean; error: ApiError | null; request: typeof requestPersonSwitch }`, `BoardPlacementSaves.waitUntilSaved(signal: AbortSignal): Promise<void>`, and `waitUntilSettingsSaved(api: ApiClient, signal: AbortSignal): Promise<void>` in the existing settings-save module. Use the existing 15-second ordinary API request timeout for settlement and selection. Switch destinations contain IDs only, never Gift Claim Tokens. Provider tracks active ownership-operation blockers.

- [ ] Write failing tests:

```ts
it("waits for active placement saves even with an empty failure map", async () => {
  expect(selectPerson).not.toHaveBeenCalled();
  resolveSave();
  await switchFinished;
  expect(selectPerson).toHaveBeenCalledOnce();
});
it("keeps the destination and recovers the authoritative profile after a lost response", async () => {
  expect(recoveryMe).toHaveBeenCalledOnce();
  expect(queuedDestination.giftId).toBe(giftId);
  expect(navigation).toHaveBeenCalledWith(expectedRecipientPath);
});
it("exposes live selections only from server authorization and preserves BIGWHEEL", () => {
  expect(nonoperatorSwitchButton).toBeNull();
  expect(returnButton.textContent).toContain("BIGWHEEL");
});
```

Also test failed placement/settings save retains current account and an affected-item explanation, settlement timeout stops selection, pending ownership blocks it, drafts/outboxes remain in original user keys, other-tab notification stops writes/JWT sync, and a missed notification still receives server 409. A stale tab must not renew sign-in over another tab's selection.

- [ ] Run private control, board-save, settings, and new switch-provider tests; confirm expected failures.
- [ ] Pause new user-initiated mutations and signing before settlement, while allowing already queued placement/settings writes to drain through the existing client. Implement bounded save completion that accounts for queued/in-flight batches rather than only failures, authoritative selection call, then full reload. On lost response read `/me` without stale expected headers after verifying principal; retain queued destination until the recipient gift opens. Broadcast actor/version changes without credentials and stop old-tab synchronization. Live switch controls use server names/capability and may render even when other developer tools are hidden. Retain existing LIFF Mock controls for local demos without treating them as live authorization. No automatic switching.
- [ ] Run the selected tests plus SessionGate/AccountApiRoot/PrivySession regression and frontend typecheck. Expected: passing settlement/recovery tests; no account-specific storage is cleared or copied during switching.
- [ ] Commit explicit task files: `feat: add private BIGWHEEL and Hana switching controls`.

### Task 6: Deliver gifts privately while preserving actual escrow transfers

**Files:** New API `gifts/personDelivery.ts` and tests; frontend `giving/personGiftDelivery.ts` and tests; existing gift routes, Packaging/receiving, giverNotice, LINE chat-menu service/routes/types, GiftSender/backend/sentReports/Giving/GiveSheet, own-board Giving entry, catalog and associated tests.

**Interfaces:** Produce `POST /api/gifts/:giftId/deliver-person` with `{ attemptId: string }` returning `{ gift: Gift }`, `ApiClient.deliverPersonGift(giftId: string, attemptId: string): Promise<Gift>`, and `deliverPersonGift(deps: AppDeps, session: ResolvedSession, giftId: string, attemptId: string)` using existing refusal/result conventions. Add giver-only `GET /api/gifts/:giftId/delivery` returning `{ delivery: "line" | "person" }`, `ApiClient.giftDelivery(giftId: string): Promise<{ delivery: "line" | "person" }>`, and the same `delivery` field to `PackagedGift`/`PackedGift`. Produce `reportGiftDelivery(api: ApiClient, giftId: string, attemptId: string, outcome: "sent" | "cancelled"): Promise<Gift>` for immediate and kept-report recovery, querying the giver-only delivery route for sent reports after reload. Derive controlled delivery from configured participant IDs and persisted gift; use protected delivery for pair `sent`, ordinary report for ordinary gifts/cancellation. No new persistent client delivery flag. Change the one GiftSender interface to `send(message: GiftMessage, delivery: "line" | "person"): Promise<GiftSendOutcome>`; `giveFlow` supplies the server-confirmed packaged delivery. Keep `GiftBackend.markSent(giftId, attemptId)` unchanged. Add an explicit unavailable LINE-menu result for Hana instead of returning signed-out null.

- [ ] Write failing tests:

```ts
it("uses actual giver signatures and records one protected delivery in either direction", async () => {
  expect(duplicateDelivery.gift.id).toBe(firstDelivery.gift.id);
  expect(gift.status).toBe("sent");
  expect(line.pushes).toEqual([]);
});
it("rejects premature targeted receiving and a fake ordinary sent report", async () => {
  expect(preview.status).not.toBe(200);
  expect(receive.status).not.toBe(200);
  expect(ordinaryShared.status).toBe(403);
});
it("recovers a lost protected acknowledgment through kept sends", async () => {
  expect(deliverPersonGift).toHaveBeenCalledWith(giftId, attemptId);
  expect(keptReports).toEqual([]);
  expect(switchActionEnabled).toBe(true);
});
it("retains Hana notice and menu exclusions when switching is off", async () => {
  expect(line.pushes).toEqual([]);
  expect(line.menuLinksForHana).toEqual([]);
  expect(receivedGift.pushedToGiverAt).not.toBeNull();
});
```

Cover missing/wrong Hana recipient, nonoperator delivery, invalid/mismatched attempt, missing escrow deposit, wrong signer, verify-mode refusals, sent screen with `recordError`, both receiving paths including token, ordinary lost LINE-report token recovery, ordinary notifications/menu linking, background Hana sealing/relinking, and receipt retries after confirmed claim. Use fake-chain test signers to assert wallet ownership after each claim and no direct ownership repair.

- [ ] Run `pnpm --filter @drawing-app/api test src/routes/giving.test.ts src/routes/receiving.test.ts src/routes/giftsForYou.test.ts src/gifts src/chatMenu` and frontend giving tests; confirm controlled-delivery and premature-receive assertions fail first.
- [ ] Implement protected server acknowledgment with current actor/version, configured destination, deposited escrow, and matching message attempt under Task 2's boundary. Ordinary `/shared` cannot first mark a pair gift sent. Repeated protected acknowledgment is idempotent; preserve cancellation/take-out and existing reconciliation. Require sent status for pair preview/first receiving in both targeted and token paths, preserving already-received retries and ordinary token recovery. All Hana Packaging requires BIGWHEEL; frontend own-sticker Giving supplies that recipient. The GiftSender uses packaged delivery to return locally for the pair and otherwise call the normal LINE picker; backend performs the protected acknowledgment. `reportGiftDelivery` is the single report choice for backend and `sentReports`, including sent-report recovery without fresh Packaging. A successful sent screen then offers Task 5's explicit recipient switch; unacknowledged delivery keeps it unavailable.
- [ ] Implement central fixed-pair receipt-notice exclusions, logging handled reason and marking notification completion. Hana chat-menu linking/relinking/unlinking is explicitly unavailable before any LINE call; BIGWHEEL's actual menu uses BIGWHEEL's state. Retain participant configuration and exclusion rules in off mode. Add normal catalog labels/errors in both languages.
- [ ] Run the same API/frontend tests, signing/transaction regressions, and typechecks. Expected: passes in both directions, unchanged ordinary gift behavior, no LINE call for Hana or the pair, no simulated ownership path in live code.
- [ ] Commit explicit task files: `feat: deliver private Croquis gifts through normal escrow`.

### Task 7: Verify one-browser behavior and review the complete branch

**Files:** New `apps/frontend/e2e/personSwitching.e2e.ts`; adjust E2E helpers/startup to configure a fixed operator/Hana pair only for tests. Update durable `docs/live-person-switching.md` and deployment runbook with verification/recovery steps. Do not enable unrestricted production dev sign-in.

**Interfaces:** Consume Tasks 1–6. Browser tests reuse one Page and shared-cookie context; second-tab tests use `page.context().newPage()`. Existing `friend` fixture is a separate context and cannot establish this feature. Existing browser runners use LIFF Mock and mock chain; explicitly label them as behavior tests, not the real Privy checkpoint.

- [ ] Write failing browser tests named `same_tab_sticker_round_trip`, `refresh_and_lost_selection_response`, `old_bigwheel_tab_stays_stale_after_return`, and `ordinary_user_cannot_select_hana`. Assertions: selected identity remains distinct from real LIFF principal; send/receive/Gratitude/placement/give-back work once per gift; no picker runs; waiting gift appears after acknowledgment; drafts/outboxes and both layouts survive returning; failed switch remains recoverable; Transfer Trail replay starts and completes; Explore reopening displays results. Final fake-chain/database owner must be BIGWHEEL.
- [ ] Run `pnpm --filter frontend test:e2e -- e2e/personSwitching.e2e.ts --project=chromium --project=webkit`; failures must demonstrate missing behavior or expose genuine implementation issues.
- [ ] Fix only behavior revealed by these tests, using systematic debugging and a focused failing regression for each fix. Document off/verify/live configuration, full-reload expectation, real versus mocked verification, persistent failure review, and pending-digest reconciliation.
- [ ] Run the browser command above, existing giving/receiving/Gratitude browser coverage, then `pnpm check` and the production build. Expected: every required check passes; production build includes server-authorized private controls and excludes LIFF Mock authorization. Record failures with command/output and resolve them before completion claims.
- [ ] Request independent complete-branch review with `superpowers:requesting-code-review`. Supply approved spec/plan, diff, actual verification outputs, and remaining real-provider uncertainty. Resolve actionable findings and rerun affected checks. Squash into representative commits without tool accreditation before integration.
- [ ] Commit test/runbook changes explicitly: `test: verify private person switching and sticker round trips`.

### Task 8: Deploy with transfers disabled, then verify actual Privy and Sui behavior

**Files:** Deployment files from Task 3; durable `docs/live-person-switching.md`; ignored credential-free rehearsal evidence under `data/video-activity/2026-10-13/`. No code changes are required if verification succeeds.

**Interfaces:** Consume the reviewed coherent release and `PERSON_SWITCHING_MODE=off|verify|live`, `PERSON_SWITCH_OPERATOR_USER_ID`, `PERSON_SWITCH_HANA_USER_ID`, internal secret and loopback URL. Retained participant IDs are required even when mode returns to off after real activity. These runtime settings are API-owned; the auth service trusts only authenticated assertions, not a duplicate allowlist.

- [ ] Verify release readiness and preserve a recoverable previous service/build set and consistent database backup. Read live user rows, selected sticker, current configured Sui network, and transaction state. Fresh SFW sticker must be minted, owned by BIGWHEEL both in SQLite and Sui, and have no active gift. Do not choose historical fake gifts. Keep credentials out of command output/evidence.
- [ ] Install both private secret files and the reviewed release while selection is off. Validate issuer/API/frontend health and ordinary account sign-in. Keep existing service directory exclusions and `DEV_SIGN_IN` deployment refusal. Public HAProxy research found `/v1/auth/` and JWKS forwarded to port 8787, `/api/` to 8788, and other stickeroo paths to static hosting. Add a reviewed, validated host rule denying `/_internal/` for stickeroo before proxy routing; do not affect other hostnames. Validate HAProxy configuration before reload. Check public denial, retired exchange JSON refusal, and unchanged real JWKS/body content; an HTML success response is not successful auth-route verification. Verify authenticated JWT responses are uncached through Fastly and API responses remain private.
- [ ] Set mode to verify for the exact validated pair. In the operator's actual browser/phone, establish BIGWHEEL's expected custom-auth subject, SDK user ID, and wallet; switch to Hana and verify a different custom-auth subject, distinct Privy user and Sui wallet; refresh; return to BIGWHEEL and verify his original subject/user/wallet. LINE must remain signed in. No NFT deposit or claim is allowed; server verify-mode tests and runtime refusals establish that gate. Record IDs/addresses/outcomes only, never tokens. Do not claim the source/mocked tests prove this step.
- [ ] If this checkpoint fails, leave transfers unavailable, preserve real identity access, diagnose the observed LINE/Privy failure, and report it. The authorized contingency is a separate recording database/images with existing local demo and `mockChain`; it requires a real-operator entry/request gate before hosting. Develop that smallest fallback only if needed, and identify simulation to the operator while keeping the ordinary filmed names/screens. No mock changes are copied into live ownership or Gratitude. This plan does not spend time implementing another hosted app in advance.
- [ ] If the real checkpoint passes, enable live and run the spec's real sequence with fresh gifts: BIGWHEEL deposit/delivery → Hana claim/Mini-game/placement → Hana deposit/delivery → BIGWHEEL claim/Mini-game. Check Sui owner and database owner after each claim, distinct giver wallets on deposits, fresh Transfer Trail entries, actual playable replays and live Explore after reopening. Retry only through existing gift/digest reconciliation when a response is uncertain. Verify no LINE picker or receipt push ran.
- [ ] Return every real sticker held by Hana to BIGWHEEL and settle open pair transactions before a planned disable/removal. Retire the previous `remove-activity.py` operation once Hana has actual history; it deletes her row even if stickers have returned. Preserve Hana's identity/wallet/history. Emergency recovery reenables only this exact pair; a database backup does not reverse Sui transfers. Record actual tested outcomes and any operator interaction still required.
- [ ] Follow the chosen branch integration workflow. After merge, delete completed spec/plan, remove the managed worktree, and retain only concise durable authorization, validation evidence location, and recovery instructions. Completion requires the actual live round trip, or an explicitly reported authentication block and completed authorized isolated fallback; passing mocked tests alone is insufficient.

## Root self-review

- Spec coverage: authorization/session/NSFW resolution (1–2); JWT isolation and retirement (3); selected identity and signer safety (4); settlement, browser state, and private controls (5); controlled delivery and notification exclusions (6); browser/branch checks (7); real authentication, real ownership, fallback trigger, deployment and recovery (8).
- Type consistency: one `SessionEnvelope`, one `AccountSelection`, one `PrivyJwtResult`, one delivery-report chooser, and one selected-session resolver. Existing `{ me }` settings responses do not replace the envelope.
- Review Focus: each of the five conditions has an owning test above. Same-user/new-version, pre-ledger start races, token-first recipient attribution, late signer results, and disabled background LINE calls are explicit.
- Proportion: define interfaces and decisions here; implement bodies idiomatically. Do not duplicate transfer/Gratitude engines or build a parallel hosted mock application before a real provider failure.
- Execution boundary: this document is a reviewable plan. No application implementation, deployment, provider wallet creation, or real transaction is performed during planning.
