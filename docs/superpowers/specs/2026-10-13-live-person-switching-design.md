# Live BIGWHEEL and Hana switching

Date: 2026-10-13
Status: Design for written-spec review; implementation is not authorized by this document.

## Intended outcome

The operator can record both sides of Croquis on https://stickeroo.art in one browser: give a sticker as BIGWHEEL, switch to Hana, receive it, play the Gratitude Mini-game, place it on Hana's Sticker Board, and give it back. These are actual transfers through the deployed Sui escrow, with normal ownership, Transfer Trail, Gratitude, and Explore updates.

The user explicitly selected actual live sticker transfers. Earlier fictional Explore activity is already present in the live database. Its received gifts have no corresponding Sui escrow objects and are historical rows only; they must never be resumed as real exchanges.

Visible profiles use their ordinary names and handles. They have no demo labels. Private controls say which person will become selected.

The first version switches through a short page transition. It does not sign the operator out of LINE. A transition without reloading is outside this version because existing wallet, signing, and gift-operation state includes module-level values.

## Scope

- Only the authenticated BIGWHEEL account can select BIGWHEEL or the existing Hana account.
- Selection applies across the browser's tabs because its API cookie and Privy session are shared.
- Hana receives her own Privy Sui wallet and uses the existing sponsored transaction flow.
- Controlled BIGWHEEL and Hana exchanges reach the recipient's Croquis inbox directly.
- Both profiles use existing receiving, Gratitude, Sticker tray, Sticker Board, and public profile screens.
- Their existing account-specific saved drawings, pending gifts, Gratitude outbox, and language settings remain attached to the same user IDs.
- Ordinary LINE users keep their current sign-in and gift delivery behavior.

The recording flow does not require reserve ticket purchases, account deletion, changing either profile's LINE identity, or granting control of any additional account. Hana cannot purchase reserve tickets or delete an account through the selected-person authorization. Existing daily-ticket drawing and sealing can use Hana's own wallet and normal ticket accounting; they do not require a separate simulated drawing path.

## Approaches considered

| Approach                                           | Ownership and Gratitude                    | Main cost                                                   | Decision                                    |
| -------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------- |
| Restricted live selection with Hana's Privy wallet | Normal Sui transfers and live records      | Session, Privy identity, and controlled delivery must agree | Selected                                    |
| Server-held Hana key                               | Real transfers can work                    | Adds a separate signing mechanism and secret ownership      | Rejected for this version                   |
| Isolated API using `mockChain`                     | Separate simulated ownership and Gratitude | Cannot exchange the live stickers through Sui               | Rejected by the user's live-transfer choice |

No Sui contract change is required by the selected approach. Giving and taking a sticker out require the selected giver's signature; Receiving already uses the server's claim signature and the recipient's wallet address.

## Account authorization

The ordinary signed session continues to authenticate the real LINE user. It gains a unique, unpredictable session ID so the server can store the selected account for that browser session. Never replace the real session with a fabricated LINE login.

The API owns the allowlist. Its enabled configuration identifies the exact existing BIGWHEEL user ID and Hana user ID. It validates that both are live, distinct users and that Hana retains her existing `dev-video-hana` identity. It defaults to disabled. Invalid enabled configuration fails startup visibly.

The existing profile IDs in the saved activity manifest are BIGWHEEL `d5984df6-db28-44f2-801c-2f2f5b565463` and Hana `bef03287-50ee-4e51-aaef-a9dc1303b854`. Implementation must validate these against the live rows before enabling selection rather than create another Hana.

`OPERATOR_LINE_USER_ID` currently identifies the recipient of CDN notices; that alone is not authorization to switch profiles. Authorization comes from the verified API session and the configured BIGWHEEL database user ID.

The signed session cookie remains HttpOnly, Secure, and scoped to `/api`. It contains the authenticated user, unique session ID, and signed expiration. The former cookie format is retired rather than maintained as a second implementation. Existing visitors renew their API session from their current verified LINE credentials on reopening; this does not require another LINE login while those credentials remain valid.

Add one `person_switch_sessions` database table for the configured operator's session selection. Its unique session ID identifies the authenticated user, selected user, current selection version, expiration, and ordinary timestamps. User references use the existing user IDs and foreign-key rules. The row cannot outlive its authenticated session. Expired rows are ignored immediately and removed on startup and subsequent selection requests. Ordinary users do not receive a selection row.

Before the first selection, the current account is BIGWHEEL and the signed session ID serves as the initial version. Selecting a person atomically compares the expected current version and inserts or updates the session's row. Concurrent requests with the same expected version cannot both succeed. Each successful selection, including selecting BIGWHEEL, creates a new version. Resolving the acting account reads this authoritative row; a caller cannot restore an earlier selection by replaying an old cookie and headers. No separate selection cookie is needed.

Every selected-account request resolves the same authorization before reading or changing that account. The route context distinguishes the authenticated user from the selected user. Existing feature routes continue to receive the selected user as their acting user. LINE authentication and real LINE profile refresh operate on the authenticated user.

Expected-user checking remains mandatory for mutations. Switch-capable clients also send the selection version, so an old tab or delayed request cannot act after a selection change, including a change back to the same person. Requests without a selection version cannot use selected-person authorization. Image requests without custom headers use the same validated selected profile for NSFW opt-in checks.

`/api/me` returns a session envelope distinguishing the selected profile, authenticated identity, allowed selections, selection version, and expected Privy subject. SessionGate compares LIFF with the authenticated identity. It displays the selected profile only after that comparison succeeds. The real LINE name or picture must never overwrite Hana's profile.

Signing out clears the session cookie and removes that session's selected-person row. Deleting or disabling the authenticated account invalidates selection. Disabling the feature rejects Hana selection and reopens the operator's own account through normal session recovery.

## Privy identity and wallet

Hana's Privy subject uses the existing derivation:

```text
privySubject(LINE login channel ID, Hana's stored dev-video-hana identity)
```

This is an application identity under authorized custom authentication. It is not a LINE account or LINE token. The existing API wallet lookup derives the same subject from Hana's row, so normal wallet creation and lookup agree.

Frontend JWT exchange goes through an authenticated API route for all users. The API checks the real session and LINE access token; for the configured operator, it also checks the exact allowlist and current selection version. The verified LINE token must belong to the authenticated user. The caller cannot supply a Privy subject, LINE identity, or wallet address.

The API delegates signing to the existing auth service through an authenticated loopback-only request. Its assertion includes the verified authenticated identity, authorized selected identity, session ID, selection version when applicable, scope, and expiration. A dedicated internal secret authenticates this request; the Privy JWT signing key remains in the auth service. Both the assertion and resulting Privy JWT expire no later than the existing Privy JWT lifetime or the authenticated session's remaining lifetime. The internal route is not published through HAProxy or Fastly.

The auth service validates the internal assertion and uses the existing subject derivation and JWT signing implementation. The API is the authoritative source of which selected identity is allowed. Ordinary users receive their own derived LINE subject. Replace the app's public `/v1/auth/privy-jwt` exchange with this authenticated API entry point; do not retain a public path that old tabs could use to authenticate BIGWHEEL while Hana is selected. The public JWKS endpoint and Privy's configured issuer remain unchanged.

Hana gets a distinct Privy user and Sui wallet. A cached BIGWHEEL Privy session must be logged out of Privy before Hana's JWT is synchronized, and the reverse applies when returning. Switching must not link Hana's custom authentication identity to BIGWHEEL's Privy user. LINE remains signed in.

Wallet creation, signed-in status, wallet readiness, and signer installation require the SDK user's `custom_auth.customUserId` to equal the server's expected subject. A wallet must also match the expected selected account address when one is already cached. An older cached SDK user cannot satisfy readiness.

The JWT cache and every asynchronous exchange or signing result are associated with the selected account and selection version. Results from an earlier version are discarded. A signer is cleared before selection changes and cannot submit a late signature through a new account client.

The page transition resets current module-level state. Strict subject checks are still required because Privy persists its own session across reloads. `MakeSuiWallet` must never let its remembered creation attempt prevent creating the other person's wallet.

JWT exchange and wallet recovery use the existing bounded timeout and visible retry behavior. A failed switch or wallet exchange displays a persistent explanation and a retry action; it does not enable giving with the previous wallet.

## Switching experience and device state

The existing developer slip provides the private switch control. The server's allowed selections determine its visibility and names; `VITE_DEMO_PEOPLE` and LIFF Mock are not live authorization.

After a controlled gift is sent, its completed giving state also offers the appropriate switch action. It names the actual destination, such as `Switch to Hana`, and does not change people automatically.

On selection:

1. Finish outstanding board saves and preserve account-specific saved drawings and Gratitude outbox entries.
2. Refuse to switch while Giving, Receiving, taking a sticker out, or another ownership-changing operation is unresolved. Show which operation must finish or be recovered.
3. Disable new mutations and wallet signing while the selection request is pending.
4. Ask the API to select the destination using the current account and version.
5. Reload into the destination's Sticker Board or the intended waiting gift after the API confirms selection.
6. Validate authenticated identity, selected profile, and Privy subject before enabling wallet-dependent actions.

A lost selection response is resolved by asking for the current session envelope. The client does not guess which person is active. Failed selection retains the current account or offers explicit recovery from the server's authoritative answer.

Other tabs are told selection changed, stop mutations and JWT synchronization, and ask to reopen the selected person. They do not compete to authenticate different Privy users. The server's expected-version check remains authoritative even when a tab misses that notification.

The API serializes selection changes and ownership-operation start or submission for the configured pair, then checks the expected account and version again inside that boundary. Use a consistent lock order before the existing sticker and gift locks. An operation already starting in another tab must not race selection before its transaction row exists. The selected pair's open Sui transaction rows also block selection across restarts until they settle or are reconciled. Server-signed claims and returns are identified through their gift participants, not only `sui_transactions.userId`, which is null for those kinds. Mint operations are identified through their sticker's Original Artist. A confirmed deposit with a sent gift awaiting its receiver permits switching; an unfinished transaction or unresolved deposit/delivery attempt does not.

AccountApiRoot already creates a client and provider lifetime for the accepted account. Preserve this boundary. Do not copy another person's query answers, board saves, drawing state, gift recovery records, or Gratitude outbox into the new lifetime.

## Controlled gift delivery

The selected pair use ordinary Packaging and deposit signing. Always set `forUserId` to the other configured profile. Token-first gifts without a selected recipient are not used by the private handoff.

A protected implementation of the existing GiftSender handoff completes delivery inside Croquis for this pair. The server independently verifies the configured pair and current selected giver before acknowledging that delivery. This must not rely on a client merely reporting that LINE sent a message.

Keep existing message-attempt bookkeeping and retry behavior. A deposited gift stays unavailable to the recipient until delivery is confirmed and its normal state becomes `sent`. Only then does it appear in the recipient's waiting gifts. Repeated delivery acknowledgments return the same result.

Enforce this for controlled-pair targeted preview and receiving on the server. The existing targeted receive path can otherwise accept a packed, pending gift before it appears in the inbox. Preserve ordinary token-link recovery after a lost LINE send report; the stricter controlled-pair rule must not change that ordinary behavior.

Opening the targeted waiting gift uses the existing recipient-authorized route, so a Gift Claim Token need not be placed in session storage or a switch URL. Retain the intended recipient and gift ID until opening succeeds; do not remove a queued destination before a failed switch can be retried.

The controlled pair's delivery does not open LINE's friend picker or emit Gift Messages. BIGWHEEL's gifts involving ordinary users retain LINE delivery. All Hana Packaging endpoints reject a missing recipient or any recipient other than BIGWHEEL, not just calls to the controlled sender. Hana cannot enter an ordinary token-first or LINE-delivery path using BIGWHEEL's actual LINE picker.

Received gifts in the controlled pair do not generate receipt pushes in LINE. The giver-notice service records an explicit handled outcome for those gifts, with an operator-readable reason, so its sweep does not repeatedly try Hana's fabricated LINE identity. Normal gift notifications keep their existing behavior. This determination is recoverable from configured participant IDs and gift records, not the active browser session.

Retain the configured participant identity and these notification rules when switching is disabled. A disabled-mode sweep must not start pushing to Hana or retroactively emit pair receipt messages.

Hana's chat-menu operations are explicitly handled as unavailable for a profile without LINE, including background relinking after drawing or sealing. The real BIGWHEEL chat menu reflects BIGWHEEL's tickets and language, never Hana's selected state. No fabricated LINE identity is sent to the Messaging API.

## Real transfer sequence

Use a fresh gift ID and an existing minted SFW sticker that BIGWHEEL actually owns and that has no active gift. Confirm its Sui owner agrees with BIGWHEEL's cached wallet before rehearsal.

1. BIGWHEEL packages it for Hana and signs the existing sponsored deposit.
2. Controlled delivery confirms the gift was sent.
3. Switch to Hana and receive the waiting gift through the existing server-signed claim.
4. Verify Sui and the database identify Hana as owner. Existing NEW, Sticker tray, board placement, and Gratitude behavior apply.
5. Hana gives the same sticker to BIGWHEEL and signs the next deposit with Hana's wallet.
6. Switch to BIGWHEEL, receive it, and verify the sticker is back in BIGWHEEL's wallet and database account.

The normal transaction ledger, sponsored gas handling, retry reconciliation, escrow expiry, and giver take-out remain authoritative. Do not directly edit recorded ownership to compensate for a failed transfer. Existing historical seed gifts are excluded from real gift recovery.

Gratitude is generated only by the existing Mini-game after an actual received gift. Direct and Original Artist Gratitude Share use the existing rules. The completed combo produces the normal replay, recipient score, giver Gratitude events, and live Explore results. Acceptance may reopen or reload Explore to read the new result; automatic refreshing of its existing query is outside this version.

## Errors, logging, and recovery

- Unauthorized or arbitrary profile selection receives an actual authorization error and produces no JWT, wallet action, or database mutation.
- Stale account or selection version receives the existing account-changed recovery behavior. It must not become an automatic sign-in that replaces another tab's session.
- LINE verification, internal auth service, Privy, gas sponsorship, and Sui failures retain their status, affected account or gift, and reviewable error. Secrets, access tokens, assertions, JWTs, and Gift Claim Tokens are excluded from logs.
- Log selection changes with authenticated and selected user IDs and the version. Log JWT authorization outcomes and controlled delivery outcomes without credential contents.
- A transfer that may have landed is reconciled by its existing transaction digest and gift recovery mechanism before another attempt or switch is permitted.
- Pending Gratitude stays in its existing account-specific outbox. Switching does not submit it under the other person or erase it after failure.

## Internationalization

Every new user-facing label, transition, disabled-action explanation, and persistent error is defined in the catalog, with English and Japanese according to the existing glossary. Developer slip headings remain English under its existing catalog convention. Button labels preserve the profile's stored display name rather than converting BIGWHEEL to title case.

No screen adds a demo badge or changes the ordinary names of either profile. Technical authorization, wallet, or routing details belong in logs and developer controls, not the receiving or Gratitude experience.

## Verification and acceptance

Implementation begins only after this spec is reviewed and the written implementation plan is reviewed and its execution method chosen.

The first implementation milestone verifies that the real Privy integration can move between distinct custom-auth users without linking them, returning the wrong wallet, or losing the operator's LINE login. This is an integration uncertainty; source inspection and existing mocked tests do not establish its runtime behavior.

Required verification:

- API tests reject nonoperators, arbitrary targets, forged session cookies, invalid session IDs, expired authorization, mismatched LINE tokens, stale versions, and altered internal auth assertions. Concurrent selections with the same expected version establish that only one commits.
- Auth tests establish that only the protected internal request can issue a JWT and that the retired public exchange cannot authenticate an old tab. Ordinary users still receive only their own verified subject through the API.
- Session tests cover refresh, LINE profile updates, selection-response loss, logout, feature disable, deleted authenticated users, and old tabs.
- Server tests establish that selection and ownership-operation start or submission cannot race, including before sponsorship creates its ledger row. A settled sent gift awaiting its recipient permits switching. Open server-signed claim or return rows and mint rows are attributed correctly.
- Privy tests cover cached wrong users, explicit Privy logout, expected subject and wallet matching, account-specific wallet creation, delayed JWT answers, and late signing results.
- Gift tests cover both directions, duplicate handoff acknowledgment, invalid destinations and token-first Hana Packaging, premature controlled receiving, signature mismatch, receiving without a stored token, interrupted deposit or claim, and no LINE picker, push, or Hana chat-menu calls. Disabled-mode notification sweeps retain the same exclusions.
- Browser tests in Chromium and WebKit cover the same-tab give, switch, receive, Gratitude, place, give-back sequence, with refresh and failed-switch recovery. Existing separate-browser two-person fixtures are insufficient to establish same-browser switching.
- A controlled live Sui testnet rehearsal verifies actual ownership after each claim, matching database ownership, fresh Transfer Trail rows, playable Gratitude replays, and updated live Explore. Rehearsal uses only the configured pair and a chosen owned sticker.
- Run repository-required checks for the implementation and inspect failures before deployment. Test reports distinguish mocked verification from the live Privy and Sui rehearsal.

Acceptance is the operator performing the complete sequence in live Croquis with the correct selected profile and wallet throughout, no repeated LINE login, no extra LINE messages, no duplicate transfers or combos, and the sticker returned to BIGWHEEL.

## Deployment and rollback

Ship the server authorization, protected auth-service support, frontend subject checks, controlled delivery, and catalog changes together. Keep switching disabled until both services validate configuration and the operator-only verification succeeds. Preserve deploy scripts' rejection of unrestricted `DEV_SIGN_IN`.

The internal auth secret is generated and stored in each service's private configuration through deployment, never tracked or placed in a URL. Keep the API unable to read the auth service's Privy signing key. Verify the internal route cannot be reached through the public origin.

Before rehearsal, take a consistent database backup and record the chosen sticker and wallet addresses without credentials. A database backup does not reverse Sui ownership.

Before planned disable or removal, settle pending transfers and return every real sticker Hana owns to BIGWHEEL. Preserve Hana's identity and Privy wallet access until recovery is complete. Emergency disable may block new selection; recovery can reenable the same restricted configuration to finish the actual transfers. Never delete Hana or apply the earlier seed-removal script while she holds real stickers or unresolved real gifts.

Once Hana participates in actual activity, retire the earlier `data/video-activity/2026-10-13/remove-activity.py` removal operation. It deletes Hana's user row; even returned real gifts still reference her. Any later requested removal of fictional activity needs a narrower operation that preserves Hana, her wallet identity, and all actual sticker and gift history. Returning every sticker does not make the old removal script safe to apply.

After the implementation is merged, remove this completed spec and its plan according to AGENTS.MD. Keep only concise durable authorization and recovery instructions in the deployment runbook.

## Source map

| Responsibility                                  | Existing implementation                                                                                                                                           |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mock switch control                             | `apps/frontend/src/sticker-board/stat-board/SwitchPersonControls.tsx`                                                                                             |
| Mock Gift Message queue                         | `apps/frontend/src/giving/mockGiftMessages.ts`                                                                                                                    |
| Ordinary signed session and expected account    | `apps/api/src/session.ts`                                                                                                                                         |
| LINE sign-in, profile refresh, and `/me`        | `apps/api/src/routes/session.ts`                                                                                                                                  |
| Session bootstrap and account provider lifetime | `apps/frontend/src/api/SessionGate.tsx`, `apps/frontend/src/api/ApiRoot.tsx`                                                                                      |
| Displayed identity                              | `apps/frontend/src/identity/useIdentity.ts`                                                                                                                       |
| JWT exchange and Privy synchronization          | `apps/frontend/src/identity/privy.ts`, `apps/frontend/src/identity/PrivySession.tsx`                                                                              |
| Wallet creation and signing                     | `apps/frontend/src/identity/MakeSuiWallet.tsx`, `apps/frontend/src/identity/SuiWalletBridge.tsx`, `apps/frontend/src/identity/suiSigner.ts`                       |
| Privy subject and signing service               | `packages/line-auth/src/line-privy-jwt.ts`, `packages/line-auth/src/auth-http.ts`, `packages/line-auth/src/start-auth-server.ts`                                  |
| API wallet address lookup                       | `apps/api/src/services/privySuiWallets.ts`                                                                                                                        |
| Giving and delivery interface                   | `apps/frontend/src/giving/Giving.tsx`, `apps/frontend/src/giving/giftSender.ts`, `apps/frontend/src/giving/giveFlow.ts`, `apps/frontend/src/giving/GiveSheet.tsx` |
| Packaging, deposit, receiving, and take-out     | `apps/api/src/gifts/packaging.ts`, `apps/api/src/gifts/deposit.ts`, `apps/api/src/gifts/receiving.ts`, `apps/api/src/gifts/takeOut.ts`                            |
| Signed transaction execution                    | `apps/api/src/sui/transactions.ts`                                                                                                                                |
| Receipt notices and LINE chat menus             | `apps/api/src/gifts/giverNotice.ts`, `apps/api/src/routes/lineMenu.ts`, `apps/api/src/chatMenu/`                                                                  |
| Device recovery                                 | `apps/frontend/src/sticker-creation/session/keptSession.ts`, `apps/frontend/src/giving/keptGifts.ts`, `apps/frontend/src/gratitude/gratitudeOutbox.ts`            |
| Existing gift browser verification              | `apps/frontend/e2e/giving.e2e.ts`, `apps/frontend/e2e/gratitude.e2e.ts`                                                                                           |
| Service and secret deployment                   | `deploy/deploy.sh`, `deploy/deploy-api.sh`, `deploy/sticker-auth.service`, `deploy/drawing-api.service`, `deploy/README.md`                                       |

Primary provider documentation checked during research:

- Privy custom authentication: https://docs.privy.io/authentication/user-authentication/jwt-based-auth/overview
- Privy JWT integration: https://docs.privy.io/authentication/user-authentication/jwt-based-auth/usage
- Privy JWT subject configuration: https://docs.privy.io/authentication/user-authentication/jwt-based-auth/setup
- Privy Sui wallets and signing: https://docs.privy.io/wallets/using-wallets/other-chains/sui
- LINE LIFF login and logout: https://developers.line.biz/en/reference/liff/
