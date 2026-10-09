# Review: API, contracts, database and deploy

Max-effort review of `apps/api`, `contracts/`, `packages/db` and `deploy/`, 2026-10-09. Fixes land on lane branches merged into `review/api-contracts-db-deploy`; each item is checked off as it merges. This record goes once every item is fixed or decided. The Move contracts need no change.

## Verified

- [ ] high, `apps/api/src/stickers/seal.ts:90`: the sharp copy has no upper pixel bound, and the spec, rim and flat PNGs only a byte cap. A few-KB 16383×16383 PNG is decoded and run through the dome model past the API's MemoryMax; its images are stored before the ticket links, so the request replays after every restart.
- [ ] med, `apps/api/src/cdn/cdnCap.ts:113`: one `warned === month` check gates both messages, so the 95% pause tells no one once the 80% warning went out that month.
- [ ] med, `apps/api/src/gifts/receiving.ts:526`: `reconcileClaim` answers `already_received` to the real recipient when a lagging fullnode still shows the gift Pending, and records nothing.
- [ ] med, `apps/api/src/stickers/nsfwDrawing.ts:20`: anyone can seal another sticker's public `{veiledHash}.png` from a custom client and mark it 18+, which gates that veil (403 without the opt-in) and purges it from Fastly.
- [ ] med, `apps/api/src/app.ts:91`: a percent-encoded drawing URL (`0x<hash>%2Epng`) passes the gate decoded, but Fastly caches it under the raw key, which an 18+ mark's purge never names.
- [ ] med, `apps/api/src/session.ts:35`: the signed cookie holds a bare user id with no expiry inside it, so a copied cookie never expires and `DELETE /api/session` can't end it.
- [ ] med (perf), `apps/api/src/app.ts:115`: the display WebP lookup ORs on `veiled_hash`, which has no index: a full scan per origin request.
- [ ] low-med, `apps/api/src/stickerBoards/board.ts:192`: visitors still see a sticker in a packed gift, which the owner's board hides.
- [ ] low-med, `apps/api/src/gifts/expiry.ts:66`: a claim that landed but was never recorded is left for good once its gift expires; the giver stays the owner.
- [ ] low-med, `packages/db/src/migrate.ts:24`: `foreign_key_check` runs over the whole database on every start, so one orphan row stops the API starting.
- [ ] low, `apps/api/src/gifts/receiving.ts:506`: a failed claim whose escrow shows `taken_out` or `expired_returned` records nothing, so the gift stays sent and every later step is refused.
- [ ] low, `apps/api/src/gifts/packaging.ts:287`: `packageAgain` treats a gift that became sent or received meanwhile as closed, sponsors a new deposit, then answers 500 on `gifts_one_per_sticker`.
- [ ] low, `apps/api/src/gifts/expiry.ts:25`: no margin between the box's clock and Sui's, so `return_expired` can abort `EGiftNotExpired` after gas is paid.
- [ ] low, `apps/api/src/midnightJob.ts:54`: a run that crosses midnight starts the new day's at once, skipping `AFTER_MIDNIGHT_MS`.
- [ ] low, `apps/api/src/gratitude/record.ts:86`: a stroke or shake combo's hits aren't tied to its replay; 120 hits with an empty replay pass and count for the weekly best combo.
- [ ] low, `packages/db/src/drawnSizes.ts:56`: staging throws on a pre-0008 sticker without a timelapse; only dev databases can still hold one.
- [ ] low, `packages/db/src/schema/stickerPlacements.ts:53`: the placement CHECKs let NULLs through.
- [ ] docs, `deploy/README.md`: line 94 names another person's account on the box; line 13 still mentions submodules; line 38's hand purge answers 404 and its list of gated files is stale.
- [ ] docs, `deploy/line/greeting.md:12`: calls the app "Sticker Board", where AGENTS.md names it Croquis.
- [ ] conventions: `apps/api/src/midnightJob.ts:7` hard-codes "5 s"; `packages/db/src/schema/users.ts:10,15` and `apps/api/.env.example:9` say ID token where sign-in uses the access token; `stickers.ts:11` writes `KyotoSeikaSubject` by hand instead of `z.infer`.
- [ ] cleanup, one implementation each: the drawing file names (`app.ts:81`, `imageStore.ts:99`); the gratitude route's second 64 KiB body limit (`record.ts:39`); `describeIssues` (three copies); the NSFW receive rule (two); `takeOut.ts`'s copy of `giftRecord`; `chainOf` and `mint.ts`'s copies of `suiDepsOf`; the settings handler (three in `routes/session.ts`); `lineChatMenu.ts`'s copy of `oneAtATime`; the chain test setup (five).
- [ ] cleanup, dead or uneven: `SuiChain.payment` is never read (`sui/types.ts:111`); `diagnostics.ts`'s dead keys and stale comment; `giverNotice.ts:185`'s bare `setInterval`; `suiChain.ts:345` derives the sticker object ID again; each route keeps its own refusal-to-status table (`chain_unavailable` is 503 from tickets, 502 elsewhere).

## Unverified

- `deploy/deploy-api.sh:80`: package.json syncs before `npm install`, so a failed install is skipped by the next deploy.
- `deploy/drawing-api.service:31`: no `UMask`, so the database is likely readable by other users on the box.
- Nothing checks the Drizzle journal's order; migration 0001 weakened the `ticket_uses_kind` CHECK.
- `apps/api/src/sui/transactions.ts:327`: a transaction is settled dead when a pruned node no longer shows it; line 285: a zkLogin signature answers 500.
- `apps/api/src/gifts/receiving.ts:412`: the deposit isn't settled before answering `not_deposited`.
- `apps/api/src/services/gasStation.ts:157`: sponsored bytes aren't checked against the kind and sender asked for; line 134: a retry after a client timeout can sponsor twice.
- `apps/api/src/services/privySuiWallets.ts`: line 53's timeout doesn't cover the body; line 58's stored `sui_address` is never read; line 29: signing up again with the same LINE account clashes on the unique address.
- `apps/api/src/gifts/packaging.ts:249`: the worst case is 16 s, over the app's 15 s request limit.
- `apps/api/src/services/journal.ts:49`: journalctl's exit status is never checked.
- `apps/api/src/cdn/cdnCap.ts:186`: failures other than a refused token never reach the operator.
- `apps/api/src/app.ts:97`: the images' CORS header was removed.
- `apps/api/src/explore/leaderboards.ts:74`: leaderboards are computed again on every request.
- `apps/api/src/gifts/takeOut.ts:104`: the wrong code when the open transaction is a claim or a return.
- `apps/api/src/testing/fakeSui.ts:144`: no test runs the package's calls against a real chain.

## Decisions

- `apps/api/src/gifts/receiving.ts:289`: gifts for you lists only sent gifts.
- `apps/api/src/stickers/timelapse.ts:86`: every GET parses up to 16 MB of timelapse again; serving the stored gzip changes the typed response.
- `apps/api/src/services/imageStore.ts:187`: every seal runs the whole dome model, about 0.5 s on the event loop.
- `apps/api/src/gifts/packaging.ts:332`: a package and take-out loop can drain Shinami's fund; whether to limit it.
- `apps/api/src/services/suiChain.ts:121`: one package ID is both the call target and the type origin, which breaks at the first upgrade.
- `apps/api/src/shapes.ts:376`: list endpoints send whole outlines.
- Purging drawing files by Surrogate-Key instead of URL lists.
