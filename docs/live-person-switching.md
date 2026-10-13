# Live person switching

Only the authenticated BIGWHEEL account can select BIGWHEEL or the existing Hana account. Selection changes the Croquis actor while preserving the authenticated LINE principal and the shared API cookie. Visible profiles retain their ordinary names and handles. Other users receive no private controls or selected-account authorization.

## Configuration and rollout

`PERSON_SWITCHING_MODE` defaults to `off`. The public release configuration is `deploy/drawing-api.env`, installed by deployment as `/srv/drawing-api/api.env`. Its initial committed value is `off`; reviewed operational changes to that same field select `verify` or `live`, followed by the API restart through the existing deployment process. Do not add another mode setting in a secret file or a separate configuration mechanism. Retain `PERSON_SWITCH_OPERATOR_USER_ID=d5984df6-db28-44f2-801c-2f2f5b565463` and `PERSON_SWITCH_HANA_USER_ID=bef03287-50ee-4e51-aaef-a9dc1303b854` when configuring the pair. Startup validates both undeleted accounts and Hana's stored `dev-video-hana` identity, even when a configured pair is off. Never create a replacement Hana or change a stored identity to make validation pass.

- `off`: ordinary LINE authentication and delivery remain available; no selection capability is issued. Persisted private gifts retain their delivery restrictions.
- `verify`: the operator can select both people and verify protected Privy authentication and their wallet addresses. Transfers involving either configured account, reserve ticket purchases, and account deletion are blocked.
- `live`: private Giving and Receiving for the exact pair are enabled after the real Privy checkpoint passes. Hana cannot purchase reserve tickets or delete an account through selected-person authorization.

Production uses the real Sui adapter and keeps unrestricted dev sign-in disabled. Production startup constructs the real adapter or fails configuration validation; explicit mock configuration uses no Sui adapter. Ship the protected auth issuer, API authorization, subject/address checks, private controls, delivery, and catalog together. Keep the auth signing key isolated from the API; keep public JWKS and the configured issuer authoritative. Deny `/_internal/privy-jwt` at both origin and CDN and retire the anonymous `/v1/auth/privy-jwt` exchange. See `deploy/README.md` for the coherent release and rollback procedure. The existing ignored `deploy/.env` supplies the installed internal-auth secret for the normal deployment pipeline; no private environment override is needed.

## Browser behavior and recovery

On your own stat board, open the hidden **Developer tools** menu by pulling past the cork's bottom or activating its keyboard/screen-reader button. **Use Croquis as** offers the server-authorized pair inside that menu; no account selector is reachable while the menu is closed. The build must enable the existing `VITE_DEV_SLIP` flag for developer tools. Switching drains the requesting tab's queued saves, stops new actions and signing, changes the server selection/version, then performs a full page transition to the selected person's board. LINE stays signed in as BIGWHEEL. Selection applies across the browser's tabs because they share the cookie and Privy session.

For a recording, give from BIGWHEEL by opening **Explore**, searching for **Hana**, visiting her sticker board, and selecting **Give** there. Choose one of BIGWHEEL's owned stickers. After delivery is confirmed, choose **Back to My board**, return to **My board**, open **Developer tools**, and select Hana. Open the waiting gift on Hana's board, receive it, and play Gratitude. As Hana, the owned sticker's **Give** action targets BIGWHEEL automatically. After giving back, return to the board, open **Developer tools**, select BIGWHEEL, and open the waiting gift from his board. BIGWHEEL's own-board **Give** action continues to prepare an ordinary LINE gift; use Hana's visited board when she is the intended recipient. If an ordinary preparation was opened accidentally, use **Take it out** and wait for its transaction to settle before preparing the private gift.

Other tabs stop new actions, JWT issuance, and signing when notified; they retain their original account's drawing, gift recovery, Gratitude outbox, and pending placement journal. There is no cross-tab acknowledgment protocol and a requesting tab cannot drain another tab's queue. If another tab is already issuing a mutation, the API actor/version guard remains authoritative. An old BIGWHEEL tab stays stale after a switch to Hana and back: the new BIGWHEEL selection has a different version. It must reload before making another action.

The account-changed screen keeps its explanation until **Reload**. A failed current-tab switch stays recoverable and shows the reason. If the selection response is lost after the server committed, the tab reads the authoritative session with the unchanged LINE principal and reloads the actual selected actor. A failed draft/placement preservation keeps the original view mounted and frozen with persistent failure details; **Try again** retries preservation before recovery. Do not discard those records or assume a timeout means an ownership transaction did not execute.

If preservation fails repeatedly during Privy reconnect, the retained reconnect action can be discarded when the account lifetime is suspended again. This Minor recovery edge is deferred. After storage works again, use the additional **Try again** or **Reload** offered by recovery, then repeat the intended reconnect destination. Positions remain journaled before the fallback reload; do not clear the journal to bypass the failure.

Pending placements are kept per original account and per tab in `sessionStorage`, under `croquis.board-placement-saves.<accountId>`. Returning to that account restores the unsaved positions and explicit retry; it does not automatically apply them as the newly selected person. Phone and large layouts remain independent. Receiving a sticker you previously held puts it back in the tray while retaining both positions; place it again independently in each layout. Account-keyed drawings and outboxes remain under their original owner. Review persistent errors before retrying, and use the API logs for affected items and stable error codes without copying credentials, JWTs, assertions, or Gift Claim Tokens.

## Ownership and pending transactions

An ownership transaction involving the configured pair blocks selection until it is resolved. Reconcile the persisted digest using the existing transaction-status/retry path: determine whether sponsorship is still live, the transaction executed, failed, or expired, then complete or abandon it through that path. Preserve the transaction record and its failure details. Never edit sticker ownership to recover a pending transaction.

Historical seed gifts have no Sui escrow objects. Do not resume them, manufacture an escrow object, or repair them by changing ownership. New real private gifts require the actual escrow object to hold the sticker before delivery acknowledgment. Private delivery bypasses LINE's picker only for the configured pair and exposes the waiting gift only after acknowledgment. Receiving and Gratitude remain one-time actions; retries resolve the persisted gift/Gratitude result.

The historical `data/video-activity/2026-10-13/remove-activity.py` cleanup has been retired because its manifest includes Hana, who now has a real wallet and actual gift history. Retain the original seed manifest as exact-ID evidence. Any later cleanup must be a separately reviewed operation that preserves Hana, all wallets, and actual transfers. Never restore a pre-transfer database backup over subsequent Sui transactions.

## Mocked browser verification

The browser suite starts a fresh isolated database and image folder, migrates it, then seeds the fixed test pair before API configuration validation. LIFF Mock signs in the test operator as `dev-bigwheel`; the selected Hana actor remains distinct from that principal. The runner alone enables its existing dev sign-in and mock chain. It uses no real LINE messages, Privy authentication, Sui signatures, or deployed configuration.

Run from the repository root:

```sh
E2E_APP_PORT=5209 E2E_API_PORT=8809 pnpm --filter frontend test:e2e e2e/personSwitching.e2e.ts --project=chromium --project=webkit --workers=1
E2E_APP_PORT=5209 E2E_API_PORT=8809 pnpm --filter frontend test:e2e e2e/giving.e2e.ts e2e/gratitude.e2e.ts --project=chromium --project=webkit
pnpm check
pnpm test
pnpm build
```

With pnpm 12, omit an extra `--` before the test filenames: it reaches Playwright literally and makes the trailing options filename filters, unexpectedly collecting the full browser suite. The person tests also hold an exclusive bounded fixture for their shared pair, so other project workers cannot overlap pair actions. Other suites keep independent random people. Set `E2E_RESULTS_DIR` to a distinct directory when running two browser commands concurrently, along with separate `E2E_DATA_DIR` and ports; Playwright otherwise clears a shared trace directory. Failed traces/screenshots stay under the configured result directory.

The named scenarios cover a same-page private round trip through Giving, Receiving, the actual Gratitude engine, placement, and Giving back; refresh and a lost selection response; stale second-tab recovery after returning; a persisted packed gift blocking selection even with Giving closed; and ordinary-user rejection. Both browser projects use one page/shared-cookie context for actor changes, with `page.context().newPage()` for the stale-tab case. Ownership is asserted in the isolated database. The existing null mock-chain adapter has no separate Sui ownership ledger, so this is browser/API behavior evidence, never a real-chain checkpoint.

## Real Privy checkpoint and transfer rehearsal

Use the deployed coherent release in `verify` with the real LINE/Privy integration and one browser. Confirm BIGWHEEL's actual Privy subject and stored Sui address, select Hana and confirm Hana's distinct subject/address, then return to BIGWHEEL and confirm the original subject/address. Check an old second tab cannot request another JWT or sign under stale selection. Refresh each selection and inspect persistent recovery errors. Do not enable `live` based on mock tests or a BIGWHEEL-only SDK baseline.

After the real subject/address checkpoint passes and live actions are authorized, choose an owned SFW sticker as BIGWHEEL, privately give it to Hana, verify the actual escrow deposit and acknowledged waiting gift, select Hana, receive once, play Gratitude, and place it. Give that same sticker back, select BIGWHEEL, receive once, and confirm the final Sui object owner and database owner both name BIGWHEEL. Confirm both Transfer Trail rows/replays and reopened Explore results, with no LINE picker or Official account notice for the private pair. Ordinary LINE gifts must still use their established delivery. Record the actual transaction evidence and any unresolved provider or delivery failure separately from the mocked results.

## Verified release, October 13, 2026

The protected release and private controls were squash-merged in PR19, followed by the reviewed signed-out-session cache fix. Mode `verify` passed the real Chrome/LINE/Privy checkpoint before operational commit `26daaae131f8361767cae9468d5ed40dc5d4e519` enabled `live`. BIGWHEEL returned to his original embedded wallet after repeated Hana selections and refresh; Hana reused her distinct real wallet. An old BIGWHEEL tab remained stopped with `SESSION_ACCOUNT_CHANGED` after switching away and back.

No.0045 completed a real Sui testnet round trip using the existing sticker package and actual escrow. Independent reads confirmed both database ownership and actual Sui ownership returned to BIGWHEEL, all four private transactions succeeded and settled, and no pending ownership blockers or unreconciled claims remained at the final audit. Its Original Artist and SFW status were unchanged.

| Private operation           | Actual Sui transaction digest                  |
| --------------------------- | ---------------------------------------------- |
| BIGWHEEL gives to Hana      | `B6sjbBDwxH1X5DxRon3P6xmhew7mP631eXvDwVXH5TWi` |
| Hana receives               | `AYt4JM4vXfH6fGFRSrJk6RVAE6b2rcgby3cfFgPYHfQD` |
| Hana gives back to BIGWHEEL | `GX6Aa59Zd15tY1jQNXkENG9B84Bc8hmHa7hxUDW3M2Wy` |
| BIGWHEEL receives           | `FsXDLqofFC5RAvazC1zKykG9G3r7GBhZR1WV4BVerrLY` |

The actual mini-games saved Hana's 10 Hits/247 Gratitude and BIGWHEEL's 9 Hits/200 Gratitude. Both persisted replays passed the app schema and counted-hit agreement checks, and both rendered replay controls played from the Transfer Trail. Reopened Explore showed ten populated Gratitude rankings and ten combo rankings, including both people; BIGWHEEL's Gratitude was 19,961 and Hana's was 4,966. The retained higher best-combo rankings include historical video activity and are not these two real combos. No.0045 was placed again from BIGWHEEL's tray after receiving it back.

No LINE picker or message was used for these private gifts. Both actual giver-notice records explicitly logged `gift.giver_notice.skipped` with `person_delivery`. An extra ordinary LINE preparation opened before the private rehearsal was taken out through its actual transaction before any private gift was prepared; it was never sent and is excluded from the received Transfer Trail.

Private operator evidence and screenshots are retained outside managed worktrees under the original ignored `data/video-activity/2026-10-13/person-switching/` folder. Its verification records distinguish isolated mock-browser tests, real provider switching, real transactions, historical video activity, initial failed checks, and passing rechecks. Database backups predate later transactions and must never overwrite their subsequent state. The completed plan and spec are retired after this acceptance; this runbook is the durable recording and recovery reference.
