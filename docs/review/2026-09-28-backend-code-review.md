# Backend code review

2026-09-28. The findings of a max-effort review of `apps/api`, `packages/db`, `packages/sticker-chain`, `contracts/sui-payment-contract`, `deploy/`, the root tooling and the backend docs at main `f35249fa`, grouped by area, with what became of each. The frontend has its own: [the frontend code review](2026-09-29-frontend-code-review.md).

Nine read-only lanes each took an area, and every finding was checked against the code before it was fixed. Most were fixed in the merges that followed: `38bf9439` (the cleanup), `2a8793cb` (the owner's decisions and the follow-ups), `ba836c54` (the items left for the frontend review) and the merge that added this record.

- An open finding reads **ID** · severity · open · `file:line`, then what goes wrong, its trigger (for cleanup, its cost) and a fix. Every other finding is one line.
- _Fixed_ names its commits. _Decided_: the owner chose. _Dropped_: not worth doing, or made moot by a later change. _Handed off_: what's left is frontend work, filed in the frontend code review.
- _High_: lost data, money, a ticket, a gift or Gratitude; an NSFW sticker shown to or received by someone not adult; a server crash or outage; a secret exposed. _Medium_: a wrong result, or a failure with a way out. _Low_: cosmetic, or rare with little harm. _Cleanup_: no behavior at stake.

## Open

What's left, and what each waits for:

- **The next contract deploy**, which also fixes LATE-6 and brings CHAIN-3 and CHAIN-4 to Sepolia. It needs croquis.eth's owner (LATE-6), and goes with an app deploy, since the app switches escrows then. After the expiry sweep has returned the gifts in the old escrow, which expire Oct 3–5; any gift still there at the switch can't be received or taken back through the app, and the sweep, reading the new escrow, leaves it, so return those once they expire.
- **DB-1** · cleanup: `ticket_purchases.verified_at` is never null. Waits for the owner's answer to the frontend review's TIX-3.
- **DEPLOY-1**, **LATE-7**, **OWNER-1** and **OWNER-5**: the owner's, under Needs the owner.

## Owner's decisions

1. A day ends at midnight in Tokyo everywhere: Daily tickets, both streaks, Explore's today and week. `users.time_zone` is gone.
2. NSFW stickers: the on-screen blur is enough, and image URLs stay public. NSFW stickers are kept out of ENS avatars, since the gateway shows no blur.
3. The Official account messages the giver once their gift is received, and nothing on take-back, expiry or a refused receive. The never-built worker's other columns are gone.
4. PRODUCT.md describes the app as built; SCOPE.md and `docs/database-schema-and-rest-api.md` are deleted; AGENTS.MD's LINE and Messaging API entries are fixed.
5. Old worktrees, `deploy/.env.bak-*` and `.playwright-mcp/` are deleted.

## REST API routes and app shell

- **API-1** · cleanup · fixed `5ca0d198` · Response shapes and the functions that build them from rows were split between `shapes.ts` and `views.ts` by no rule; `views.ts` is merged into `shapes.ts`, `newStickerCount` moved beside `markStickersSeen` in `stickerBoards/board.ts`, and `unseenGratitudeCount` beside `markGratitudeWatched` in `gratitude/feed.ts`.
- **API-2** · high · fixed `9f7e4725` · Only Sealing and Gratitude capped their request bodies, so one anonymous oversized POST /api/session could exhaust the API's memory; `createApp` now refuses any body over `MAX_BODY_BYTES` before it's read, and Sealing keeps its own larger limit.
- **API-3** · high · fixed `9c972cd9` · A double tap on Draw, or Try again after a lost 201, spent a second ticket, and the comment saying the unique day index stopped that was false; POST /api/tickets/spend now takes an idempotency key and answers a repeated key with the ticket use it already spent (`9f541d12` keeps the key on the device across reloads).
- **API-4** · high · fixed `2da41d2c` · Each anonymous GET /api/logs started a journalctl that streamed both units' whole journal, with no limit on how many ran at once (the services lane reported it too); it now serves the newest `SERVER_LOG_LINES` lines (`?lines=` up to `MAX_SERVER_LOG_LINES`), runs one journalctl at a time (503 `server_log_busy`) and stops one that stalls.
- **API-5** · high · fixed `2da41d2c` · The public ENS gateway made a person's newest minted sticker their avatar even when it was an NSFW sticker; `latestStickerAvatar` now skips NSFW stickers, for the gateway and the onchain avatar alike.
- **API-6** · medium · fixed `9f7e4725` · A database failure in the ENS gateway answered 400 `unsupported_request` and was never logged as a failure; only reading the calldata stays inside the try, so anything else reaches `onError` (500, logged).
- **API-7** · medium · fixed `6d53c7dd` · Sign-in answered 500 `internal_error` when LINE couldn't be reached; it now answers 502 `line_unavailable` with the cause and logs it, and SessionGate offers Try again.
- **API-8** · medium · decided · Every signed-in viewer gets an NSFW sticker's full image URLs and `/api/images/` serves them to anyone, so only the app applies the blur; the owner decided the on-screen blur is enough and image URLs stay public.
- **API-9** · low · fixed `2da41d2c` · The "no mock minting" and "World ID must be production" startup guards ran only under `NODE_ENV=production`, which nothing on the box sets, and `.env.example` claimed production refuses mock mode (the services lane reported it too); the guards are deleted, `.env.example` says `deploy-api.sh` always installs sepolia, and `deploy-api.sh`'s check still keeps dev sign-in off the box.
- **API-10** · low · fixed `9f7e4725` · The request log's hand-kept route list missed POST /api/gifts/:giftId/receive, so Receiving from the board logged no start or finish; the log now takes Hono's matched route template and checks it against one set that includes it, and the app's own list gained `receive` too.
- **API-11** · low · fixed `9f7e4725` · Two 502s (Sui and World ID) put the raw upstream message in `detail`, and the failed Sui read was logged with a bare `console.error`; both now go through `logFailure` and `failureCause`.
- **API-12** · cleanup · fixed `9f7e4725`, `781823b1`, `b736ff44`, `72e86629`, `ab278c7f` · `createApiClient`, `ApiClient`, `client.test.ts`, five type re-exports and a few exported shapes nothing imported were dead, and AGENTS.MD still described `createApiClient()`; the client and re-exports went in `9f7e4725`, the AGENTS.MD text in `781823b1`, `giftStatusSchema` in `b736ff44`, `GiftStatus` in `72e86629`, and `escrowStatusSchema` and `MintRequest` are no longer exported (`b736ff44`, `ab278c7f`).
- **API-13** · cleanup · fixed `b736ff44` · POST /api/gifts/:giftId/deposit validated a `txHash` it never read; the route now logs it with the `gift.deposit` step.
- **API-14** · cleanup · fixed `9f7e4725` · `ticketHolder` and its `noAccount` branch could never fire, since `requireSession` had already found the live account; the ticket routes use `c.var.userId`.
- **API-15** · cleanup · fixed `9f7e4725` · `HANDLE_MAX_LENGTH` was defined in the API and again in the app; it lives in `session/handleLimit.ts`, which `client.ts` re-exports and `HandlePrompt.tsx` imports.
- **API-16** · cleanup · fixed `9f7e4725` · An unreachable `isHex` throw in `server.ts` only narrowed two private keys' type; `privateKeySchema` is a `z.custom<Hex>` now.
- **API-17** · cleanup · fixed `9f7e4725` · Sealing and Gratitude each had their own `bodyLimit` block; one `limitBody` in `errors.ts` serves them and the default cap, and an oversized body still answers 400 `invalid_request` rather than 413, by choice (`errors.ts:67-70`).
- **API-18** · cleanup · fixed `9f7e4725` · The `age_verification_not_configured` block was repeated in both age verification handlers; one `notConfigured` answers it.
- **API-19** · cleanup · fixed `9f7e4725`, `ab278c7f`, `b736ff44` · Three stale comments: `AppEnv` named only POST /api/session as sessionless (`9f7e4725`), `EnsDeps.writer` said it was null in mock chain mode (`ab278c7f`), and `toPerson` said the smart wallet never reaches other people though the ENS gateway answers it (`b736ff44`).
- **API-20** · cleanup · fixed `72a837fb` · `fieldNames` checked only that each listed log field was a real key, so a new `DiagnosticFields` key could be left out of every log line; `loggedFields satisfies Record<keyof DiagnosticFields, true>` now requires every key.
- **API-21** · cleanup · fixed `9f7e4725` · Small items: the one-year max-age is one `IMMUTABLE_MAX_AGE_S` (`cacheControl.ts`), the test that restated `SESSION_MAX_AGE_S` is gone, and the `x-line-user-id` limit is the named, explained `LINE_USER_ID_MAX_LENGTH`.

## API services and adapters

- **SVC-1** · medium · fixed `25275157`, `5af8b6a7` · Chain waits used viem's defaults, so a mint's or claim's receipt wait could outlast the app's Sealing and Receiving timeouts, and World ID got the same 15 s as the app's request, so `world_id_unavailable` never reached the person; the receipt waits are bounded under the app's timeouts and the RPC timeout and retries are named (`25275157`), and World ID gives up at 10 s (`5af8b6a7`).
- **SVC-2** · medium · fixed `1beec8a3` · A one-time WebP backfill ran on every deploy, frontend-only ones included, stopping the API to scan every image and cutting off any Sealing or Receiving in flight; the script, its build entry and the deploy step are gone, and the API restarts only when something it syncs changed.
- **SVC-3** · low · fixed `ab278c7f` · Every minted sticker's NFT metadata said it was "sealed in Daily Drawing App"; it says Croquis now, and metadata already written keeps the old text.
- **SVC-4** · low · fixed `5af8b6a7` · A failed image write could leave a partial `*.tmp` file in the public image folder; the write is inside the try, and `finally` removes the temporary file.
- **SVC-5** · cleanup · fixed `b736ff44` · The API kept its own keccak256 on `@noble/hashes` beside viem's; viem's replaced it, and the direct dependency is gone.
- **SVC-6** · cleanup · fixed `5af8b6a7` · `services/mint.ts` and `services/smartWallets.ts` only set mock chain mode's four deps, in two places; one `mockChain` (`services/mockChain.ts`) holds them.
- **SVC-7** · cleanup · fixed `ab278c7f` · `stickerChain.ts` repeated `@drawing-app/db`'s `escrowStatuses` and tested `gift[5] === 2`; it imports the list and compares with `"claimed"`.
- **SVC-8** · cleanup · fixed `e01b4e5b` · Sign-in and the auth server each had a LINE ID-token verifier; sign-in uses sticker-chain's, which returns the profile, through the adapter in `services/lineVerifier.ts`.
- **SVC-9** · cleanup · fixed `ab278c7f` · The mint built its own smart wallet record, and `findSmartWallet` repeated the Privy lookup's own log lines; one `findSmartWallet`, which logs nothing itself, serves the sealer and the gift authorizer.
- **SVC-10** · cleanup · fixed `ab278c7f` · `MintRequest`'s number, size and `sealedAt` were optional only for tests, so the adapter made up fallbacks; the fields are required and `sealedAt` is gone.
- **SVC-11** · cleanup · fixed `ab278c7f` · `rpcTransport`'s comment carried provider research that single-block event queries had made stale; it now says only what the transport does.
- **SVC-12** · cleanup · fixed `ab278c7f` · The event lookup's `30_000` and `probes % 8` are named `EVENT_LOOKUP_TIMEOUT_MS` and `EVENT_LOOKUP_PROBES_PER_LOG`.
- **SVC-13** · cleanup · fixed `9f7e4725` · `server.ts` created `IMAGE_DIR` again after `createDiskImageStore` had; the second `mkdirSync` is gone.
- **SVC-14** · cleanup · fixed `5af8b6a7` · The Privy and LINE messaging adapters refused empty credentials their only callers already rule out; both checks and their test are gone.
- **SVC-15** · cleanup · fixed `5af8b6a7` · The API's `start` script, which nothing ran, is gone.
- **SVC-16** · cleanup · fixed `b736ff44` · The test fakes repeated the database's `bytes32`, wrote the smart wallet address derivation twice and hard-coded Sepolia's chain id; they use `bytes32`, one `fakeSmartWalletAddress` and `sepolia.id`, and only the one-line `fakeLineVerifier` alias for `createDevLineVerifier` stays (`apps/api/src/testing/fakes.ts:57`).
- **SVC-17** · cleanup · fixed `ab278c7f` · `gift-sticker.ts` re-exported `stickerGiftEscrowAbi`, which every caller takes from `/contracts`; the re-export is gone.

## Gifts, Gratitude, stickers, tickets and Explore (API)

- **DOMAIN-1** · low · dropped · Explore's Longest streak finds the recent artists with a subquery SQLite runs as a scan of the covering `stickers_artist` index; at this data size that costs nothing, so it's worth changing only once Explore gets slow.
- **DOMAIN-2** · cleanup · fixed `96eda34d` · The midnight batch moved people off the plain chat menu "so a menu linked before the counts existed turns into one", a reason from before the count menus; plain stays as the menu `menuToLink` falls back to when a count menu is missing from menus.json, and the comment says that's why it moves.
- **DOMAIN-3** · high · fixed `12086538`, `18a4a546`, `35dbf1a2` · A deposit that didn't match left its gift `taken_out` with the escrow `pending`, which locked its sticker for good (the database lane reported it too); `12086538` records what the escrow says (taken out, returned, not our token, or our token under other terms), `18a4a546` answers `deposit_held` or `gift_held` naming the gift, and `35dbf1a2` has Giving take that gift out on chain and package the sticker again.
- **DOMAIN-4** · medium · fixed `0ac19ec7` · The stat board counted streaks in Tokyo ticket days and Explore's Longest streak in each person's zone from 4:00, so one person could show two current streaks (the database and tests lanes reported it too); both now count Tokyo days, and `users.time_zone` is gone (owner's decision 1; migration `5bc78c69`).
- **DOMAIN-5** · medium · fixed `dd74e9c8`, `5dab7fa7` · The server stored any Gratitude total a receiver posted, and the `gratitude` table's comments said the server replayed combos (the database lane reported the comments); a total over its hits × `MAX_GRATITUDE_PER_HIT`, built from the Mini-game's own scoring limits, is now refused, and the comments say the total is the Mini-game's, not recounted.
- **DOMAIN-6** · medium · fixed `b736ff44` · Sealing stored an unreadable timelapse, and GET /timelapse then answered 500 for that sticker forever; Sealing now unzips and parses it within the size limit and refuses a bad one with 400 `invalid_request` naming the field.
- **DOMAIN-7** · low · fixed `72a837fb` · Someone else's sticker board listed the stickers its owner had given away, and looked up who received them; it now lists only stickers the owner holds and skips that lookup (the frontend review's BOARD-1 is the next gap: a sticker in a sent gift still shows to visitors).
- **DOMAIN-8** · low · fixed `2da41d2c` · The ENS naming queue started the next job once one timed out, so two jobs, even for the same person, could send ENS transactions at once; a timeout is now only logged, the next job waits for the running one to end, and tests cover it.
- **DOMAIN-9** · low · fixed `2da41d2c` · A midnight chat-menu batch LINE was still running at the last look was left for the next boot, so that day's spenders kept a Draw key showing a full day's Daily tickets; the batch is now rechecked until it ends or the day turns.
- **DOMAIN-10** · low · fixed `72a837fb` · User Stats found a person's combos with an OR across giver and Original Artist that scanned every gift (the database lane reported it too); two indexed selects, deduplicated by gift, replace it.
- **DOMAIN-11** · low · fixed `25275157`, `24c4da69` · Every board read and tickets read simplified each sticker's cut line again, and the chat menu's link built the full tickets screen for two counts; simplified outlines are cached by sticker ID, and the chat menu counts with `ticketsLeftOf`.
- **DOMAIN-12** · low · fixed `72a837fb` · The rich menu ID check accepted placeholders such as `richmenu-TODO`, though its comment said it caught them; it now takes only `richmenu-` and 32 lowercase hex digits.
- **DOMAIN-13** · cleanup · fixed `b736ff44` · `replayInvalidHook` chose between `replay_invalid` and `invalid_request` from the first issue alone, relying on `replay` being the body's last key; it now checks every issue's field.
- **DOMAIN-14** · cleanup · fixed `b736ff44` · The API's own keccak256 duplicated viem's (the services lane reported it too); viem's replaced it, and its test and the `@noble/hashes` dependency are gone.
- **DOMAIN-15** · cleanup · fixed `b736ff44` · Packaging kept its own `createGiftClaim` for the mock chain, on the outdated excuse that sticker-chain's didn't load in Node; it uses sticker-chain's.
- **DOMAIN-16** · cleanup · fixed `72a837fb`, `0ac19ec7` · `nextTicketDayStart` was dead, and Explore's 4:00 zone days carried ticket-day names; the dead function went in `72a837fb`, and with every day in Tokyo only the Tokyo ticket-day helpers remain, on a fixed offset.
- **DOMAIN-17** · cleanup · fixed `b736ff44` · The deposit route validated a `txHash` it never read (the routes lane reported it too); the `gift.deposit` step now logs it.
- **DOMAIN-18** · cleanup · fixed `b736ff44` · `takeOut` wrote its status checks twice and kept a branch that could never run; one `takeOutState` serves both checks, and the branch is gone.
- **DOMAIN-19** · cleanup · fixed `b736ff44` · Packaging and naming read the stored smart wallet address before asking Privy's lookup, which already does that, and Packaging stored it again; both call `addressFor` alone, and the fake stores the address as Privy's lookup does.
- **DOMAIN-20** · cleanup · fixed `b736ff44` · "Load the stickers, then throw if the gift's sticker is missing" was written seven times; one `stickerLookup` in shapes.ts serves Giving, Receiving, Gratitude and Explore.
- **DOMAIN-21** · cleanup · fixed `b736ff44` · The "a gift still holds this sticker" predicate was written in both Packaging and Receiving; packaging.ts exports one `giftHoldingSticker`.
- **DOMAIN-22** · cleanup · fixed `72a837fb` · User Stats and Explore's leaderboards each split a combo into the giver's part and the Original Artist Gratitude Share; one `gratitudeParts` does it for both.
- **DOMAIN-23** · cleanup · fixed `72a837fb`, `b736ff44` · Two exported `markSeen` functions did different things; they're `markStickersSeen` and `markGratitudeWatched`.
- **DOMAIN-24** · cleanup · dropped · Moving testGifts.ts, testPngs.ts and testReplays.ts into src/testing/ was optional: no test helper reaches the bundle, the frontend keeps its test helpers beside their feature too, and the newer tickets/testSpends.ts does the same.
- **DOMAIN-25** · cleanup · fixed `b736ff44` · record.ts wrote out its refusal shape by hand, `Refusal` and `refuse` lived in packaging.ts though deposit.ts and receiving.ts used them, and feed.ts had its own gift ID param; `Refusal`, `refuse` and `giftIdParam` live in shapes.ts.
- **DOMAIN-26** · cleanup · fixed `72a837fb` · The chat menu logs put the ticket day in `stage` and counts or sentences in `status`; `DiagnosticFields` gained `ticketDay`, `count` and `menu`, and the logs use them.
- **DOMAIN-27** · cleanup · fixed `72a837fb` · `chatMenuFor` compared Daily tickets left with a literal 3; it uses `DAILY_TICKETS_PER_DAY`.

## Database package

**DB-1** · cleanup · open · `packages/db/src/schema/tickets.ts:67`  
`ticket_purchases.verified_at` is never null: the only insert sets it once the Sui check passes (`apps/api/src/routes/tickets.ts:158`). So the `isNotNull(verifiedAt)` filter on bought tickets (`apps/api/src/tickets/tickets.ts:76`, in `ticketsLeftOf`) is always true, and the table's comment, "Its tickets count once verified_at is set" (`packages/db/src/schema/tickets.ts:51`), describes a two-step flow that doesn't exist.

- Cost: a column, a filter and a comment that suggest a purchase can exist before it counts.
- Fix: drop the column in place (no index or CHECK uses it), the filter and the comment's clause; `created_at` already says when a purchase counted. First check the box for rows with a null `verified_at`, which would start counting. Wait for the owner's answer to the frontend review's TIX-3 first: if the server records a purchase before its payment, `verified_at` becomes the column that says when it counts.

- **DB-2** · medium · fixed `9f7e4725` · A language picked in Settings never reached `users.language`, the only language the server reads, so the chat menu stayed in the old language until the next sign-in; the language-choice route now sets `language` too when the choice isn't null, and relinks the chat menu.
- **DB-3** · medium · dropped · The `ticket_uses_kind` CHECK holds every past row to today's `DAILY_TICKETS_PER_DAY`, so changing the constant fails its migration at API boot; the CHECK stays as the database's guard on daily-first, with warnings at `packages/db/src/schema/limits.ts:27` (`dd74e9c8`) and `packages/db/src/schema/tickets.ts:42` (`9c972cd9`) that a change needs a migration rewriting old rows, though neither says that rewriting a row's kind changes reserve ticket balances.
- **DB-4** · low · fixed `5dab7fa7` · The drawing clock, gift expiry and multiplier ceiling each had a copy in the frontend; the app takes them from `@drawing-app/db/limits` through `@drawing-app/api/client`, as it takes the Mini-game's scoring limits since `dd74e9c8`.
- **DB-5** · cleanup · fixed `ef5d47bf`, `5dab7fa7` · The schema kept columns, indexes and comments for pushes and a relayer that were never built; the gifts rebuild (migration `5bc78c69`) drops `reject_tx_hash`, `return_tx_hash`, `gratitude.pushed_to_giver_at`, `gifts_escrow_open`, `gifts_expiring` and `gratitude_push_due`, and the comments say what happens now; `gifts.pushed_to_giver_at`, `gifts_push_due` and `gifts_pushed` stay, since the giver's message the owner chose to build uses them (decision 3).
- **DB-6** · cleanup · fixed `0eb411fe` · docs/database-schema-and-rest-api.md described a schema and API already built, and had drifted from them; it's deleted (owner's decision 4), AGENTS.MD points at the schema and route files, the comments that cited it state the fact, and `781823b1` deleted the REST API plan.
- **DB-7** · cleanup · fixed `5dab7fa7` · Schema comments still described a removed silhouette, an owner ahead of the chain, five image files and a handle null only before the prompt, and repeated 3 Daily tickets, 20% and 24 hours; each now says what the code does or names its constant.
- **DB-8** · cleanup · fixed `ef5d47bf` · The gifts CHECKs allowed a received gift with the escrow pending and a returned gift with a receive date, which no code produces, and a test covered one; the rebuild (migration `5bc78c69`) requires `claimed` for received and no receive date for returned, and that test is gone.
- **DB-9** · cleanup · fixed `ef5d47bf` · `for_user_id`'s comment gave a wrong reason for its missing foreign key and check; the rebuild adds the users foreign key and `gifts_not_for_self`, and the comment is trimmed.
- **DB-10** · cleanup · fixed `5dab7fa7` · The `gratitude` table's comments used another word for Gratitude three times and, like the timelapse's, re-listed their JSON fields; they say Gratitude and name ReplayV1 and TimelapseV1.
- **DB-11** · cleanup · fixed `b15b00c9` · The db package's gratitude test and the API's rows.ts each defined the same one-tap combo and insert; `ONE_TAP` and `insertGratitude` live in `@drawing-app/db/testing`, and both use them.
- **DB-12** · cleanup · fixed `5dab7fa7` · Three re-exports nothing imported (`databasePath`, `chatMenuBatchStatuses`, `gratitudeMethods`) are gone; drizzle.config.ts keeps `dbCredentials` and its `mkdirSync`, which only commands that open the database use, so an ad-hoc `drizzle-kit studio` still works.

## Backend tests

Severity here is the cost of leaving it: high invites a bug soon, medium is a real maintenance cost, low is tidiness.

- **TEST-1** · high · fixed `b15b00c9` · Each route test file checked on its own that its routes refuse a request without a session, and some protected routes had no such check; one test in `apps/api/src/app.test.ts` now walks the app's route table and expects `signed_out` from every route outside `PUBLIC_ROUTES`.
- **TEST-2** · high · fixed `5dab7fa7` · `packages/db/src/schema/updatedAtTriggers.test.ts` compared the triggers with `allTables`, the list `createTestDb` made them from, so a table left out of `allTables` passed; it now compares them with every table in `sqlite_master`.
- **TEST-3** · high · fixed `6e4c2ae1` · `deploy/install-chain-env.test.mjs` ran only by hand; it is now `apps/api/scripts/installChainEnv.test.ts` in vitest, so `pnpm check` runs it.
- **TEST-4** · medium · fixed `b15b00c9` · The refusal helper and the "expect 200, then parse the body" helpers were copied across test files, and the Gratitude tests borrowed Giving's; `refusalOf` and `bodyOf` in `apps/api/src/testing/responses.ts` replace them, and the local names left (`meIn`, `recorded`, `previewOf`) are one-line aliases.
- **TEST-5** · medium · fixed `b15b00c9` · Every route test file built its own signed-in JSON request; `createTestApp` returns `send(method, path, { as, headers, body })`, and only the multipart seal request builds its own.
- **TEST-6** · medium · fixed `b15b00c9` · "Pack a gift, then receive it" (and "then record Gratitude") and its fixtures were written out in several files; `giveSticker`, `sendGratitude`, `SPOT`, `SHARED_TAP` and the hit constants live in `apps/api/src/testing/rows.ts`.
- **TEST-7** · medium · fixed `b15b00c9` · The Giving, Receiving and gifts-for-you tests each kept their own gift helpers; `createGiftsTestApp` has `packagedGift`, `ownerOf`, `deposit`, `share`, `takeOut` and an `nsfw` option on `sealSticker`.
- **TEST-8** · medium · fixed `b15b00c9` · `giftsForYou.test.ts`'s escrow claim test repeated Receiving's board case, and its setup never checked the `/deposit` and `/shared` answers; the test and the escrow branch are gone, and `/shared` goes through `giftOf`.
- **TEST-9** · medium · fixed `b15b00c9`, `9f7e4725` · The ENS, session, age verification and chat menu tests hard-coded Sepolia's chain id, a fallback-name regex that couldn't fail, the LINE user ID header's limit, the fake World ID's app ID, a made-up user id and a copy of `jpycFor`; they now use `fakeEns().chainId`, `fallbackLabel`, `LINE_USER_ID_MAX_LENGTH` (`9f7e4725`), the fake World ID, the inserted user and `jpycFor`.
- **TEST-10** · medium · fixed `70530773` · Three service tests captured log lines their own way; `captureLogLines()` in `apps/api/src/testing/logLines.ts` does it once, and `privySmartWallets.test.ts` dropped its `try … finally` and resets timers in `afterEach`.
- **TEST-11** · medium · fixed `72a837fb`, `5af8b6a7`, `b736ff44` · Tests repeated unexported limits as literals; they now assert against `CAUSE_MAX_LENGTH` (`72a837fb`), `TOKEN_LIFETIME_S` less `TOKEN_REPLACE_MARGIN_MS` (`5af8b6a7`) and `TOLERANCE` (`b736ff44`).
- **TEST-12** · medium · fixed `72a837fb` · `midnight.test.ts` spelled out what `MAX_TRIES` implies and the fake LINE's request IDs, and `menus.test.ts` hand-counted menus; they now derive them from `MAX_TRIES`, `line.batches` and `midnightMoves`.
- **TEST-13** · medium · fixed `5af8b6a7` · `privySmartWallets.test.ts` checked the URL and headers the Privy SDK builds, inside the fetch fake; it now checks only the `custom_user_id` our code sends, after the call.
- **TEST-14** · medium · fixed `5af8b6a7` · `worldId.test.ts` couldn't catch a dropped action or a wrong signing key; it now recovers the signer from IDKit's message and compares it with the signing key's address.
- **TEST-15** · medium · fixed `1beec8a3`, `6e4c2ae1` · `apps/api/scripts/deployApi.test.ts` guarded the deploy's one-time WebP backfill and hard-coded the `node-24` path; the step and its script are gone (`1beec8a3`), and the test checks publishing, restarting only on change and the health checks, with an ssh fake that names no Node major (`6e4c2ae1`).
- **TEST-16** · medium · fixed `9f7e4725` · `client.test.ts` tested `createApiClient`, which only it called; both are deleted, with `ApiClient`, and AGENTS.MD no longer names it.
- **TEST-17** · medium · fixed `72a837fb` · `ticketDays.test.ts` tested `nextTicketDayStart`, which only it called; both are deleted.
- **TEST-18** · medium · decided · "Ticket day" meant midnight in Tokyo for Daily tickets and the stat board's streak, but 4:00 in each person's zone for Explore and its longest streak, and the tests encoded both; the owner made every day end at midnight in Tokyo and dropped `users.time_zone` (`0ac19ec7`).
- **TEST-19** · low · fixed `9f7e4725`, `b15b00c9` · `session.test.ts` asserted `SESSION_MAX_AGE_S` against its own value and checked GET /api/me after sign-in three times; the constant check went in `9f7e4725`, the repeats in `b15b00c9`.
- **TEST-20** · low · fixed `b15b00c9` · Two `stickers.test.ts` mint failure tests ran the same sequence; one remains, and it also checks that the retry resubmits the same mint and a later seal doesn't mint again.
- **TEST-21** · low · fixed `b15b00c9` · `stickerBoards.test.ts` repeated `outline.test.ts`'s check that simplifying shrinks the outline; the route test only compares the board's and the detail's outlines.
- **TEST-22** · low · fixed `b15b00c9` · `gratitudeReads.test.ts`'s hand-written replay described touches no test checked; it uses `tapReplay(ONE_TAP.hits)`.
- **TEST-23** · low · fixed `b15b00c9` · `app.test.ts`'s "end when the account is deleted" repeated `session.test.ts`'s refusal after a real deletion; it's gone.
- **TEST-24** · low · fixed `b15b00c9` · `packages/db/src/schema/gratitude.test.ts` copied `ONE_TAP`, `insertGratitude` and part of `receiveGift`; they live in `packages/db/src/testDb.ts`, which the db tests and `apps/api/src/testing/rows.ts` both import.
- **TEST-25** · low · fixed `5af8b6a7` · `imageStore.test.ts` worked out the foil mask's reach again and repeated its save setup; it compares the foil WebP's alpha with `foilMaskAlpha` at every pixel, through a `savedSticker()` helper.
- **TEST-26** · low · fixed `ab278c7f` · `stickerChain.test.ts` wrote out the sticker and the mint reads more than once; `STICKER` and `mockMintReads()` hold them.

## Sticker chain, auth server and Sui packages

- **CHAIN-3** · cleanup · fixed `dca8e3b8` · Gift rejection was dropped as a feature, but the escrow kept `rejectGift`, `REJECT_TYPEHASH` and `GiftRejected`; they're gone from the source with their Forge test, and from Sepolia at the next contract deploy.
- **CHAIN-4** · cleanup · fixed `dca8e3b8` · `CroquisResolver.targetOf` had no caller, and `setSources` let the admin repoint the name book and gift records at any time; `targetOf` is gone, and `setSources` reverts `SourcesAlreadySet` after setup's one call. On Sepolia at the next contract deploy.
- **CHAIN-1** · cleanup · fixed `96eda34d` · Sign-in's body schema capped the LIFF ID token with its own `ID_TOKEN_MAX_LENGTH`, a copy of sticker-chain's `MAX_ID_TOKEN_LENGTH`, which the verifier enforces again; the schema and its test use the package's constant.
- **CHAIN-2** · cleanup · fixed `96eda34d` · `./auth-http` was a package export nothing imported (the auth server's entry and its test import the file by path); the export and the README's mention are gone.
- **CHAIN-5** · high · fixed `ab278c7f` · A path such as `//` made `new URL` throw inside the auth server's async handler, and the unhandled rejection ended the process (latent: HAProxy forwards only paths that parse); it now parses with `URL.parse` and answers 404, and a try/catch turns any escaped throw into a logged 500.
- **CHAIN-6** · medium · fixed `e01b4e5b` · Sign-in and the auth server each had a LINE ID-token verifier that read LINE's refusals differently (sign-in took a 401 as LINE being down); sticker-chain's `line.ts` is now the one verifier, returning `sub`, `name` and `picture`, and `apps/api/src/services/lineVerifier.ts` maps its errors to sign-in's.
- **CHAIN-7** · medium · fixed `ab278c7f` · The croquis and gifts registries' CREATE2 salts were fixed, so a second `deploy/deploy-contracts.sh` run from the same deployer reverted; `CroquisSetup` now salts them with the run's new resolver address.
- **CHAIN-8** · low · fixed `ab278c7f`, `9f7e4725` · `CroquisNamesWriter`, the names `read` object, `NamingProgress` and `UnsupportedGatewayCall` were dead exports, and the ENS gateway route's try block turned a database failure into 400 `unsupported_request`; the exports are gone, and the route reads the database outside the try, so that failure answers 500 and is logged.
- **CHAIN-9** · low · fixed `ab278c7f` · Any auth server error that wasn't an `AuthError` was logged as a bare `unexpected_error`; the log now carries the error's name and string code, never its message.
- **CHAIN-10** · low · fixed `6e4c2ae1`, `1beec8a3` · The public auth server loaded `/srv/sticker-auth/secrets.env` (the Privy app secret and the Messaging API channel secret), which it never reads; the unit no longer loads it and `deploy/install-chain-env.mjs` no longer falls back to it, though whether the box's old file was deleted can't be seen from the repo (DEPLOY-1).
- **CHAIN-11** · low · fixed `ab278c7f` · The NFT metadata named the app "Daily Drawing App" and repeated `stickerLabel`'s padding, and the bytes32 check was written three times; the metadata says Croquis and uses `stickerLabel`, and `packages/sticker-chain/src/bytes32.ts` holds the one check.
- **CHAIN-12** · low · fixed `ab278c7f` · The Sui README tied itself to an event, repeated the testnet IDs and didn't say that real JPYC needs a new `payment` package; it now points at each `deployed.testnet.env` and says `JPYC_COIN_TYPE` and `JPYC_PAYMENT_PACKAGE` change together, and `jpy_coin/Move.toml` lost the scaffold comments.
- **CHAIN-13** · cleanup · fixed `ab278c7f` · The sealer took an untyped ABI with four runtime guards that couldn't fail, plus signer-EOA checks and tests for records production never builds; it reads through the typed `stickerNftAbi`, takes only what the chain needs (no `kind`, `chainId` or `sealedAt`), and the signer-EOA tests are gone.
- **CHAIN-14** · cleanup · fixed `ab278c7f` · `prepareGiftTakeOut` and the `stickerGiftEscrowAbi` re-export were unused, and the README said the sender takes a sticker out with `prepareGiftTakeOut`; both are gone and the README says the app sends `takeOut` from the sender's smart account.
- **CHAIN-15** · cleanup · fixed `ab278c7f` · TypeScript tests repeated Forge's StickerNFT and escrow tests, each on a fresh Anvil; they're gone, and the TypeScript tests keep what checks TypeScript against the contracts (the EIP-712 claim, the Gift Claim Token and signer checks, Sealing's reconciliation).
- **CHAIN-16** · cleanup · fixed `ab278c7f` · The three chain test files each repeated the local Sepolia chain, the Anvil start and cleanup and the StickerNFT deploy; `packages/sticker-chain/test/helpers/foundry.ts` holds `localSepolia`, `startLocalChain()` (cleanup through `onTestFinished`) and `deployStickerNft()`.
- **CHAIN-17** · cleanup · fixed `ab278c7f` · The auth limits were bare numbers that tests restated; `PRIVY_JWT_LIFETIME_S`, `MAX_AUTH_BODY_BYTES` and `MIN_ID_TOKEN_LENGTH`/`MAX_ID_TOKEN_LENGTH` are exported and the tests derive from them, `LINE_VERIFY_TIMEOUT_MS` and `CLAIM_AUTHORIZATION_WINDOW_S` are named module constants no test reads, and `line.test.ts`'s repeat of the length tests is gone (and sign-in's copy of the max, CHAIN-1).
- **CHAIN-18** · cleanup · fixed `ab278c7f` · `start:auth`, `packages/sticker-chain/.env.example` and `tsx` served a local auth server run nothing uses; all three are gone.
- **CHAIN-19** · cleanup · fixed `781823b1`, `6e4c2ae1`, `ab278c7f` · AGENTS.MD, the chat menu script's last line, auth-http's JSDoc, the package README and a test title still said the auth server links chat menus; AGENTS.MD points at `deploy/line/menus.json`, which the API reads, the rest no longer mention it, the one-entry `postRoutes` Map is an `if`, and the test names the API's smart wallet lookup.
- **CHAIN-20** · cleanup · fixed `ab278c7f` · The package README mostly described the API and the app (Privy start-up order, diagnostics, the gift bag's recovery) with a rollout note, a finished checklist and a dated spec link; it now covers only the contracts, exports, commands, deploy and ENS.
- **CHAIN-21** · cleanup · fixed `ab278c7f` · `packages/sticker-chain/script/CroquisSetup.sol`'s `@dev` comment used a banned word; it now says tests deploy and grant roles exactly as production does.

## Deploy scripts and root tooling

**DEPLOY-1** · low · open · `/srv/sticker-auth/secrets.env` on the box (owner action)  
The auth server no longer loads this file (`6e4c2ae1`), and install-chain-env.mjs no longer falls back to it (`1beec8a3`), but it's still in the auth server's own folder, with old copies of the Privy app secret and the Messaging API channel secret. Once LATE-4 hides the API's folder from the auth server, this copy is the only way it could read either secret.

- Trigger: an attacker who takes over the internet-facing auth server reads both secrets from its own folder.
- Fix: delete the file; chain.env has both keys (checked by name on the box). Auto mode can't change files on the box, so the owner runs it (under Needs the owner).

- **DEPLOY-2** · low · fixed `96eda34d` · deploy.sh exported `VITE_STICKER_RPC_URL` only when deploy/.env set it, so otherwise the build took one from the gitignored apps/frontend/.env, which the main-only guard can't see; it's now exported even when empty, and Vite lets the environment win over its .env files.
- **DEPLOY-3** · cleanup · fixed `96eda34d` · drawing-api.service's comment said /api/logs "dumps" both units' journal, though since `2da41d2c` it serves only the newest lines; it says so now.
- **DEPLOY-4** · cleanup · handed off · `apps/frontend/src/controls/useToast.tsx` is an unused copy of `ui/useToast.ts`: the frontend review's CLEAN-11, in its fix plan's Shared helpers lane.
- **DEPLOY-5** · cleanup · dropped · The API takes the public `PRIVY_APP_ID` from deploy/.env through chain.env; moving it to deploy/drawing-api.env only trades that copy for a second tracked one beside sticker-auth.env's, and a slip there stops the API at the next deploy.
- **DEPLOY-6** · cleanup · fixed `c8b9027d` · `^lint`, `^typecheck` and `^test` made each package wait on the others' lint, typecheck and tests, though packages export TypeScript source and the generated ABIs are tracked; the tasks run side by side, and the one real dependency is explicit: sticker-chain's and the API's tests wait on sticker-chain's `compile`, which writes Forge's artifacts to `out/`.
- **DEPLOY-7** · medium · decided · The API's two NODE_ENV production guards (no mock chain, and World ID only in production) never ran on the box. The owner deleted them (`2da41d2c`), and World ID on staging is deliberate.
- **DEPLOY-8** · medium · fixed `1beec8a3` · Every deploy stopped drawing-api for the one-time WebP backfill, and a failed deploy could start the new server. The backfill script, its build entry and the stop/scan/start step are gone, and the API now restarts only when a synced file changed.
- **DEPLOY-9** · medium · fixed `1beec8a3` · deploy.sh and deploy-api.sh published whatever was checked out. deploy/lib.sh's require_main_checkout now refuses anything but main's commit with nothing uncommitted, unless DEPLOY_ANY_CHECKOUT=on.
- **DEPLOY-10** · medium · fixed `6e4c2ae1` · The site upload replaced index.html before its assets arrived and deleted old chunks during the upload. It now uses `rsync --delay-updates --delete-after` (`deploy/deploy.sh:47`).
- **DEPLOY-11** · medium · fixed `6e4c2ae1` · ssh, rsync, the box's npm install and the Node download had no timeouts. SSH_OPTS now sets ConnectTimeout and ServerAlive (`deploy/lib.sh:14-15`), npm install runs under `timeout 10m`, and each download has `--max-time`.
- **DEPLOY-12** · medium · fixed `6e4c2ae1` · Syncs compared size and modification time, so every deploy from a fresh checkout restarted sticker-board and sticker-auth. The syncs for serve.py, the units, the auth server and its env file now compare content (`rsync -ci`), and a unit restarts only when its files changed.
- **DEPLOY-13** · medium · fixed `6e4c2ae1` · A fixed sleep followed by one curl failed the deploy when a server started slowly. The on-box checks now retry (`curl --retry 10 --retry-connrefused`).
- **DEPLOY-14** · low · fixed `6e4c2ae1` · install-chain-env.mjs's test ran only under `node --test`, which no suite ran. It is now `apps/api/scripts/installChainEnv.test.ts`, and `pnpm check` runs it.
- **DEPLOY-15** · cleanup · fixed `6e4c2ae1`, `781823b1` · create-returning-menu.sh told the operator to put a menu ID in sticker-auth.env, and AGENTS.MD's deploy bullet still said the auth server links menus. The script now says to commit menus.json and deploy the API, and the bullet matches the code. This merges the docs lane's AGENTS.MD deploy bullet finding.
- **DEPLOY-16** · cleanup · fixed `781823b1`, `ab278c7f` · Deploy instructions were split across deploy/README.md, AGENTS.MD, the sticker-chain README and .env.example. deploy/README.md is now the one runbook, and AGENTS.MD and the sticker-chain README point to it. This merges the docs lane's "four places" finding.
- **DEPLOY-17** · cleanup · fixed `6e4c2ae1` · deploy.sh repeated deploy-api.sh's DEV_SIGN_IN check and gave a false reason for it. The copy is gone, and the preflight's check covers both scripts.
- **DEPLOY-18** · cleanup · fixed `1beec8a3` · Env loading, SSH setup, the Node version and unit installs were copied between scripts; deploy/lib.sh holds them now. The DEPLOY_URL default and the /srv folder step are still in both deploy.sh and deploy-api.sh.
- **DEPLOY-19** · cleanup · fixed `6e4c2ae1` · The one-shot deploy/create-sepolia-accounts.mjs is deleted.
- **DEPLOY-20** · cleanup · fixed `6e4c2ae1` · knip's report was mostly false positives. knip.json now lists the deploy scripts, wagmi's config, the auth server's entry (`ab278c7f`), Foundry's binaries and journalctl, and @openzeppelin/contracts.
- **DEPLOY-21** · cleanup · fixed `6e4c2ae1` · .gitignore was a generic Node template. It now keeps only what this workspace produces, including `packages/sticker-chain/out/`, `dist` and `__pycache__/`.
- **DEPLOY-22** · cleanup · fixed `6e4c2ae1` · deploy-api.sh hard-coded `node-24`. NODE_BIN now takes the major from the pinned version (`deploy/deploy-api.sh:61`).
- **DEPLOY-23** · cleanup · fixed `6e4c2ae1` · The per-folder jsx-no-literals overrides are now one override for the whole frontend.
- **DEPLOY-24** · cleanup · fixed `6e4c2ae1` · greeting.md pointed at a plan's decision. It now says only "Japanese first, in one message."
- **DEPLOY-25** · cleanup · fixed `6e4c2ae1` · Script headers ran past 7 lines. Each header is now 7 lines or fewer.
- **DEPLOY-26** · cleanup · fixed `6e4c2ae1` · Settings that changed nothing are gone: DEPLOY_DIR, deploy.sh's directory overrides and the check that the tracked menus.json exists. .env.example now says which keys stay local.
- **DEPLOY-27** · cleanup · fixed `6e4c2ae1` · pnpm-workspace.yaml no longer has the expired viem@2.56.9 release-age exclusion.
- **DEPLOY-28** · cleanup · fixed `6e4c2ae1` · deploy/deploy-contracts.sh is now executable (mode 100755).
- **DEPLOY-29** · cleanup · fixed `6e4c2ae1` · The three units' Description lines said "Sticker Board". Each now says Croquis.
- **DEPLOY-30** · cleanup · decided · Gitignored clutter in the main checkout: the owner deleted .playwright-mcp/, the deploy/.env.bak-* copies of deploy secrets and the old worktrees. The .DS_Store files are still there and harmless.

## Backend docs, plans and specs

- **DOCS-1** · cleanup · fixed `96eda34d` · AGENTS.MD said "Both deploy scripts" refuse any checkout but main's, after naming deploy.sh and deploy-contracts.sh, but only deploy.sh and deploy-api.sh do; it names those two, and says deploy-contracts.sh deploys whatever Solidity is checked out.
- **DOCS-2** · cleanup · fixed `96eda34d` · AGENTS.MD's apps/api bullet left paid ticket packs the server hasn't added yet (`apps/frontend/src/tickets/unaddedPurchases.ts`) out of what waits on the phone; it lists them.
- **DOCS-3** · cleanup · fixed `96eda34d` · `gratitudeOutbox.ts` said route_not_found "means the server doesn't record gratitude yet", though POST /api/gratitude exists; it says route_not_found says nothing about the combo, so it's kept to send again.
- **DOCS-4** · cleanup · fixed `781823b1` · Seven plans and specs for merged work (REST API, Giving and Receiving, ENS names, User Stats, timelapse and replay) went against the Post merge rule. All seven are deleted.
- **DOCS-5** · cleanup · fixed `781823b1` · AGENTS.MD's apps/api bullet was overlong, listed only some of the env keys, said "five images" and named a client that only tests use. It now names AppDeps' outside services and the frontend's client; DOCS-2 closed the gap left.
- **DOCS-6** · cleanup · fixed `781823b1` · AGENTS.MD had no line for packages/sticker-chain, contracts/sui-payment-contract or Foundry. It has all three now, and the repeated Turborepo line and the mention of other projects on the box are gone.
- **DOCS-7** · cleanup · fixed `781823b1` · The Mini-game doc said the game opens only from the developer slip and nothing stores results, and it described a draft schema. It now says where the game opens, how gratitudeOutbox.ts sends combos and what the gratitude table keeps, including the server's cap on a total (`dd74e9c8`).
- **DOCS-8** · cleanup · fixed `781823b1`, `ab278c7f` · The sticker-chain README and the REST doc linked the ENS spec. The README now links its own "ENS names" section, and the spec and the REST doc are gone.
- **DOCS-9** · cleanup · fixed `ab278c7f` · The sticker-chain README had history, frontend behavior and a checks list that repeated built behavior. It now covers only the package.
- **DOCS-10** · cleanup · fixed `72a837fb` · `TICKET_DAY_START_HOUR = 4` in ticketDays.ts named Explore's 4:00 day as if it were a ticket day. The constant is gone, and `b785e89a` removed the last 4:00 day from the plans.
- **DOCS-11** · cleanup · fixed `ab278c7f` · The Sui README repeated the testnet object IDs. It now points at each package's deployed.testnet.env.
- **DOCS-12** · cleanup · decided · docs/database-schema-and-rest-api.md repeated the schema and routes under a "(planned)" title. The owner deleted it (`0eb411fe`), and AGENTS.MD points at packages/db's schema and the route files. The review's proposed "no background work yet" line no longer holds for giver notices, which `ef5d47bf` built.
- **DOCS-13** · cleanup · decided · PRODUCT.md described a five-minute clock, a static HTML board, storage off the server, boards open without sign-in and more the app doesn't do, and it kept dated decision logs. The owner rewrote it to describe the built app (`45b866f2`).
- **DOCS-14** · cleanup · decided · SCOPE.md, a superseded draft, is deleted (`45b866f2`). Its Never list and open questions are in PRODUCT.md now.
- **DOCS-15** · cleanup · decided · AGENTS.MD's LINE entry stopped mid-sentence, and its Messaging API entry said gifts go through that API. Both have the owner's new wording (`0eb411fe`).
- **DOCS-16** · cleanup · dropped · The review wanted a backlog line for the ENS plan's unbuilt "gift name on a sent gift", but only if gift names were still wanted. PRODUCT.md's "Not built yet" list, rewritten since, leaves it out, and no frontend code shows gift names.

## Found after the review

- **LATE-1** · medium · fixed `eabaad30` · A claim the chain failed or didn't confirm in time reached `onError`, so Accept got 500 `internal_error`, which says nothing; Receiving logs it as `gift.claim.failed` and answers 503 `claim_failed` with the cause, records nothing, and trying again finds a claim that landed late.
- **LATE-2** · medium · fixed `eabaad30` · An escrow read that failed (opening a gift's link, Accept, taking a gift out, the deposit's check) answered 500 `internal_error`; `readEscrowGift` rejects with `ChainUnavailableError`, which the error handler answers 502 `chain_unavailable` with the cause.
- **LATE-3** · high · fixed `d7000334` · A claim whose receipt wait (`CLAIM_RECEIPT_TIMEOUT_MS`) ran out while its transaction was pending lands later, unrecorded; if nobody tapped Accept again before the gift expired, the previews and Accept refused `gift_expired` before reading the escrow, so the receiver's wallet held a sticker no board showed as theirs, and the giver's still showed it on its way. Both previews and Accept now read the escrow for an expired gift the database has pending, and once it shows the gift claimed, `claimGift`'s own read records the claim for the recipient's wallet or answers `already_received` for anyone else. The board's gifts waiting for you still leave expired gifts out, so the Gift Message's link is the way back to one.
- **LATE-4** · medium · fixed `8ba590d7` · The API and the auth server both run as `bawler`, so the internet-facing auth server could read chain.env (the relayer's key and the Privy, LINE and World ID secrets), and the API could read the key that signs Privy logins for anyone; `InaccessiblePaths` hides each service's folder from the other, checked on the box with throwaway units under the same sandbox. Live at the next deploy.
- **LATE-5** · medium · fixed `880fcade` · With Forge's default dynamic test linking, an edit to `CroquisResolver` recompiled three files, and the tests kept deploying its old bytecode through `script/CroquisSetup.sol` until a forced build, so a broken contract change could pass `pnpm check`; `foundry.toml` turns it off, and an edit now recompiles every file that embeds the contract.

**LATE-6** · medium · open · the box's chain.env: `CROQUIS_NAMES_ADDRESS` and `CROQUIS_RESOLVER_ADDRESS`  
No person or sticker has ever been named under croquis.eth. The box's settings mix two deploys: its StickerNFT, escrow and relayer (`0x65D3…`) come from the first, and CroquisNames and CroquisResolver from a second, which grants NAMER_ROLE only to that deploy's own key and reads that deploy's own StickerNFT. Every `claimPersonName` reverted with `AccessControlUnauthorizedAccount`, which the log showed only as "execution reverted". `04e1df80` now logs a revert's decoded error, and `68b2fe45` checks at boot and each midnight that the contracts agree, keeps naming off while they don't (`chain.contracts.mismatch`), and names everyone left unnamed once they do.

- Trigger: every seal and receive queued a naming that reverted; since `68b2fe45`, naming stays off, and the boot log says why.
- Fix: run `deploy/deploy-contracts.sh` with `STICKER_NFT_ADDRESS` set to the live StickerNFT and the server's relayer key, then deploy with the new escrow, names and resolver addresses. The redeploy repoints croquis.eth only with its owner's key (`0x5284…`), which deploy/.env doesn't have: put it in as `DEPLOYER_PRIVATE_KEY`, or have its owner set croquis.eth's subregistry and resolver on ENSv2's ETHRegistry to the addresses the script prints.

**LATE-7** · low · open · the box's database: three gifts from 2026-09-26  
Three gifts the server made in mock chain mode, on the day it went up, are still `sent` with escrow `pending`, of stickers never minted, so no escrow holds them. The expiry sweep leaves them, and their givers' boards show them on their way for good.

- Trigger: the box ran in mock chain mode, which counts a deposit as landed at once, before it reached Sepolia.
- Fix: take them out, once, on the box (under Needs the owner). A migration can't: on a mock-mode database every gift in flight looks the same.

## Needs the owner

- **DEPLOY-1** and **LATE-7**, above: `! set -a; . deploy/.env; set +a; ssh "$DEPLOY_TARGET" "rm /srv/sticker-auth/secrets.env && sqlite3 /srv/drawing-api/data/drawing-app.db \"update gifts set status = 'taken_out', escrow_status = 'missing', taken_out_at = cast(unixepoch('subsec') * 1000 as integer) where status in ('packed', 'sent') and escrow_status = 'pending' and sticker_id in (select id from stickers where token_id is null)\""`
- **LATE-6**, above: croquis.eth's owner key in deploy/.env as `DEPLOYER_PRIVATE_KEY`, or its owner points croquis.eth at the redeploy's registry and resolver.
- **OWNER-1** · low · open · The Official account's greeting still says a drawing takes five minutes. Paste `deploy/line/greeting.md` into LINE Official Account Manager.
- **OWNER-2** · medium · fixed `de0baa10`, `723f6a48` · The receiver of an expired gift was told it was back on the giver's Sticker Board, but nothing returned it: the sticker stayed in the escrow, the giver's board showed it on its way, and it could never be given again. The API's expiry sweep, at boot and just after each midnight in Tokyo, sends each expired gift back through the escrow's `returnExpiredGift` and records it returned, and takes out a packed gift whose deposit never landed, an hour past its expiry (`CLOSE_UNLANDED_AFTER_MS`). Live at the next deploy.
- **OWNER-3** · low · fixed `18057b84`, `ac3c3634` · Giving said "Confirm in your wallet if asked", and two sign-in errors said "sign-in token", words the interface isn't supposed to use; the frontend fixes reworded all three.
- **OWNER-4** · low · decided · PRODUCT.md's Users leaves out hackathon judges, a one-event audience; nothing to change.
- **OWNER-5** · low · open · Two AGENTS.MD vocabulary entries need the owner's approval:
  - Age verification ends "It unlocks nothing yet", but it decides who marks, sees and receives NSFW stickers. Proposed ending: "It's what lets an adult mark, see and receive NSFW stickers."
  - Gift Message says it goes "into one 1:1 chat", but the picker lets the giver pick several chats, groups included (the frontend review's SHELL-3). Proposed: "…into the chats the giver picks; it can't be received from a group chat." Or, per SHELL-3, limit the picker to one friend and keep the entry.

## Checked and fine

Candidates the lanes checked and found fine, so nobody raises them again.

### REST API and services

- `/api/images/` path traversal: @hono/node-server 2.1.1's `serveStatic` rejects `.` and `..` segments, doubled slashes and backslashes after decoding.
- What `/api/logs` serves: structured lines go through `redact` (URLs, keys, JWTs, LINE user IDs), and the one raw `console.error` left (`apps/api/src/chatMenu/fromEnvironment.ts:56`) logs an unreadable menus file, no secret.
- Every `AppDeps` member is used, `giverNotice` included.
- `onError` and `notFound` on both `createApp` and `createServer` aren't redundant: tests run `createApp` alone, and a parent app never uses a mounted app's `notFound`.
- Every code in `routes/gifts.ts`'s `REFUSAL_STATUS` is produced by a `refuse(...)` call, `deposit_held` and `gift_held` included.
- GET /api/gratitude/:giftId has no giver or receiver check on purpose: the Transfer Trail shows every gift's Gratitude and replay to everyone.
- `liveUser`'s 401 branches after `requireSession` can be reached (a DELETE /me can land at an await), and they narrow the row's type.
- CSRF: the session cookie is SameSite=Lax, and the JSON routes require a JSON content type.
- Dev sign-in can't reach the box through a deploy: `chain.env` gets a fixed list of keys, `deploy-api.sh` refuses a `drawing-api.env` that mentions `DEV_SIGN_IN` (`deploy.sh` runs that check first), and the app loads dev sign-in only under LIFF Mock (`apps/frontend/src/line/liff.ts:164`).
- Test helpers (`testing/`, `gifts/testGifts.ts`, `gratitude/testReplays.ts`, `tickets/testSpends.ts`) are imported only by tests, and every helper in `testing/` has users outside the folder.
- Every `apps/api/.env.example` key is read by `server.ts`'s schemas, and every `apps/api` dependency is imported.
- `apps/api/tsconfig.json` sets no `strict`, and TypeScript 7 is strict by default.
- The `./dev-sign-in` export is used: `liff.ts` imports it, and so does `liff.test.ts`.
- `stickerChain.ts` uses sticker-chain's seal, gift, claim and name functions, and now its `bytes32`, rather than copying their transaction logic; only a small `address()` check is its own.
- LINE's ID-token verify (5 s), LINE messaging (5 s), Privy (5 s, no retries), Sui (10 s) and World ID (10 s) all have explicit timeouts; `SuiGrpcClient.getTransaction` passes `signal` on as its gRPC abort.
- Absorbed errors that are justified: `lineMessaging.ts`'s `.json().catch(() => null)` still throws `LineApiError` with the HTTP status; dev sign-in's `parseJson` catch is commented, and the schema refuses what it returns; `imageStore.ts`'s `exists()` rethrows everything but ENOENT.
- `apps/api/scripts/build.ts`'s `import.meta.main: "false"` matches `packages/db/src/migrate.ts:31`.
- `fakeClock` starts far from the live day boundary, which is now midnight in Tokyo (`0ac19ec7` updated its comment).
- `services/foilMask.ts`'s constants are named and explained.
- Age verification falls back to the proof's own nullifier (`routes/ageVerification.ts:110`), so a verdict with no nullifier doesn't get around one account per World ID.

### Gifts, Gratitude, stickers, tickets, Explore and the database

- `apps/api/src/stickers/timelapseLimit.ts` stays its own file, so the app imports `MAX_TIMELAPSE_BYTES` through `@drawing-app/api/client` without the database package.
- `apps/api/src/streak.ts` is small, but User Stats and Explore's leaderboards share it.
- Packaging, `reportShared`, `takeOut`, `checkDeposit`, Receiving, `recordGratitude`, Sealing's row writes and ticket spends use immediate transactions that check the state again inside; chain calls stay outside, with a read after.
- `takeOut` closes a gift only once the escrow says `rejected` or `expired_returned`, so a gift whose claim is still landing can't be taken out.
- Receiving's `receivingNow` WeakMap makes overlapping receives share one claim, on purpose, as its comment says.
- Giving's and Receiving's gift reads, the Transfer Trail, Explore's lists and `isLabelTaken` use indexes (the lane checked with EXPLAIN), and the gifts rebuild kept every index they use; user search's full scan is needed for substring matching and is capped by its LIMIT.
- `apps/api/src/ens/labels.ts`: the commented catch around `normalize` is intended, and the long fallback label is longer than any handle, so no one can squat it.
- `apps/api/src/chatMenu/fromEnvironment.ts` absorbs an unreadable menus.json but logs it with `console.error`.
- The midnight timers wait under 25 hours and are unref'd, failures are logged and never thrown, and retries and progress reads stay within LINE's limits.
- `MAX_COMBO_MS` equals `GAME_CONFIG.maxDurationMs`, and a combo's cap is wall time, so a tier-up freeze can't push `durationMs` past it.
- The migration journal lists every SQL file in `packages/db/drizzle/`, one for one.
- `PRAGMA foreign_keys` lines inside a migration do nothing in the migrator's transaction; `migrateDatabase` turns foreign keys off first, which keeps a rebuild's rename from rewriting other tables' REFERENCES. This holds only while migrations run through `migrateDatabase`.
- The `updated_at` triggers don't clash with Drizzle's `$onUpdate`, and they cover upserts; the gifts rebuild in 0012 re-adds `gifts_updated_at`.
- `createTestDb` is fast enough per call that caching it isn't worth it.
- `MAX_HITS` never refuses a real combo: the Mini-game's rate limits keep a combo's hits under it, and its scoring numbers haven't changed since the lane simulated them.
- A missing `DATABASE_URL` can't open an empty database on the box: deploy/drawing-api.env sets an absolute path, and `ProtectSystem=strict` leaves only data/ and images/ writable.
- `gifts_expiry` compares the database's clock with the API's; the route tests start their clock at the real time for it (`apps/api/src/gifts/testGifts.ts:25`).
- `relinkSpenders` scans `ticket_uses`' covering index once a day.
- The other indexes each serve a query: `gifts_received`, `gratitude_created`, `gifts_for_user`, `gifts_one_per_sticker`, `gifts_giver`, `stickers_owner`, `stickers_artist` and `stickers_created`.
- `price_yen` and `paid_jpyc` are write-only audit columns: the app lists purchases from Sui.

### Tests

- `apps/api/src/routes/stickers.chain.test.ts` stays its own file: it needs forge and anvil, and it's the only test of real on-chain mint reconciliation.
- `gratitude.test.ts` and `gratitudeReads.test.ts` split along `gratitude/record.ts` and `gratitude/feed.ts`, with no assertion in both.
- The NSFW and `own_gift` tests in `receiving.test.ts` and `giftsForYou.test.ts` test different routes: Receiving, and packaging for a picked person.
- Giving's take-out retry is checked on the mock chain and on the escrow chain, which take different code paths.
- The `if (!x) throw` guards in the route tests fail loudly, and `explore.test.ts`'s `summary()` asserts every sealed entry.
- `createGiftsTestApp` starts on the real clock, as its comment says the `gifts_expiry` CHECK needs; the other route tests' fake clock starts at noon in Tokyo, so none flakes at midnight.
- Ticket test titles that say "midnight" are right: every day turns over at midnight in Tokyo.
- `stickers.test.ts`'s `ticketsSpent` and `TICKET_DAY` never reset, but `checkTicket` (`apps/api/src/stickers/seal.ts:85`) reads only the ticket's owner and sticker, so test order can't change a result.
- `tickets.test.ts`'s own `jpycOf` is an independent check of the pack prices; don't swap it for `jpycFor`.
- `lineMenu.test.ts`'s `afterEach` check that no secret reaches the log.
- `ageVerification.test.ts`'s World ID 3.0 proof: World still accepts that protocol.
- `apps/api/src/routes/stickers.test.ts:386`, a timelapse without density: stored timelapses gained `density` in `f5bdcf42`, after sealing first uploaded them, so it keeps older stored ones readable, like `replay.test.ts`'s `strokePasses`.
- `packages/db/src/migrate.test.ts`: the only check that `packages/db/drizzle/` builds the tables, indexes and triggers the schema describes.
- The db schema tests run the CHECK and UNIQUE SQL with real writes, which route tests don't reach; `users.test.ts`'s shared LINE name test is the only one for two people at the handle prompt with one LINE name.
- `updatedAtTriggers.test.ts`'s first two tests fail without Drizzle's `$onUpdate` and without the trigger.
- `apps/api/src/services/journal.test.ts` checks that GET /api/logs on a machine without journalctl answers an error instead of taking the server down.
- `apps/api/src/app.flow.test.ts`: the only test that chains routes through the typed client; its `clock.set(new Date())` is there for the `gifts_expiry` CHECK.
- `diagnostics.test.ts`'s redaction test keeps secrets out of the public `/api/logs`.
- `foilMask.test.ts`'s expects inside `if`s run on many pixels in both branches.
- `midnight.test.ts`'s sleep, timers and clock are fakes, so it doesn't depend on real time.
- The LINE verify request's form fields (now in `packages/sticker-chain/test/line.test.ts`) and World ID's verify URL pin external API contracts.
- `replay.test.ts`'s "optional, for replays recorded before them" protects stored Gratitude rows.
- No test comment carries a date, a plan pointer or research notes.

### Sticker chain, auth server and Sui packages

- `packages/sticker-chain/src/generated/contracts.ts` matches the contracts: the only contract edits since it was generated (`ab278c7f`) are a comment and interface members wagmi doesn't generate. The API and the app use it; only tests use `croquisResolverAbi`.
- The auth server accepts a request with no Origin header: the LINE ID token is the credential, and the dev proxy sets Origin itself (`apps/frontend/vite.config.ts:17`).
- `packages/sticker-chain/src/line.ts:140-148` re-checks `iss`, `aud` and `exp` after LINE's verify: cheap defense for sign-in and the auth server.
- `returnExpiredGift` (`packages/sticker-chain/contracts/StickerGiftEscrow.sol:191`) is a safety valve anyone can call; the API's expiry sweep (`apps/api/src/gifts/expiry.ts`) calls it for each gift the escrow still holds past its expiry.
- Events the apps never read (PersonNamed, StickerNamed, StickerNameSynced, NameTargetSet, GatewayChanged, ExpiredGiftReturned) let explorers and indexers follow the chain, and cost little.
- `GIFT_PENDING = 1` in `packages/sticker-chain/contracts/ens/CroquisResolver.sol:50-51` copies the escrow's enum and says so; importing it would make an import cycle. `EnsRoles.ALL` is documented (`packages/sticker-chain/contracts/ens/EnsV2.sol:71-73`).
- `privySubject` is shared with the API's smart wallet lookup (`apps/api/src/services/privySmartWallets.ts:2`) on purpose.
- The three `packages/sticker-chain/test/helpers` files are used and don't overlap; `foundry.ts` is also used by the API's chain test (`apps/api/src/routes/stickers.chain.test.ts:27`).
- `DeployStickerContracts` is a reusable redeploy script; `CroquisSetup` is shared by it, `CroquisFixture` and `LocalCroquis`.
- `timingSafeEqual` against a commitment that's public on chain (`packages/sticker-chain/src/gift-sticker.ts:28`) is unnecessary but harmless.
- The deployer keeping `SEALER_ROLE` on StickerNFT (`packages/sticker-chain/contracts/StickerNFT.sol:31`) gives it nothing beyond its admin role.

### Deploy and docs

- deploy/README.md matches deploy.sh, deploy-api.sh, deploy/lib.sh and the three units.
- AGENTS.MD's /api/logs text (newest line first, SERVER_LOG_LINES, `?lines=` up to MAX_SERVER_LOG_LINES) matches `apps/api/src/app.ts` and journal.ts.
- serve.py and sticker-board.service still serve the app, and the API serves only /api/*.
- deploy-contracts.sh can be run again for a contract redeploy.
- install-chain-env.mjs runs on the box in both check and install mode, and the secrets reach it over ssh stdin (`deploy/deploy-api.sh:53`, `:89`).
- menus.json reaches the API as line-menus.json through LINE_CHAT_MENUS_FILE. greeting.md is a manual runbook worth keeping.
- The on-box /api/me checks leave out curl's `-f` on purpose, because the 401 body carries "signed_out".
- Each silenced error has a stated reason: `readlink || true` and `grep 2>/dev/null || continue` in install-node.sh, gpg's stderr (the VALIDSIG check does the verifying), and `knip || true` in .husky/pre-commit.
- SupplementaryGroups=systemd-journal lets the API read the whole journal, but journal.ts asks only for drawing-api and sticker-auth.
- A deleted account's croquis.eth name stays reserved: `users.ens_label` is kept on deletion, since an onchain name is forever, and the ENS gateway answers nothing for it (`apps/api/src/routes/ens.ts:33`).

## Refuted

- The deleted REST API plan's note that a deposit landing after a take-out and repackage answers 500: `takeOut` records a take-out only once the escrow says `rejected` or `expired_returned`, so no deposit can land after it, and Packaging hands back the gift already in the bag rather than making a second one for `gifts_one_per_sticker` to refuse.

## Not covered

- `apps/frontend`, beyond what the API shares with it: the frontend code review.
- The box: only read-only checks (the database opened read-only, the journal and the health checks).
- The Move packages were read, not run against a Sui network.
