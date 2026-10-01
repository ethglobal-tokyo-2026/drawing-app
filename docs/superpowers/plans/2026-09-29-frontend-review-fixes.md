# Frontend review fixes

2026-09-30. The plan that fixes the findings in [the frontend code review](../../review/2026-09-29-frontend-code-review.md). An ID such as DRAW-1 names a finding there, with its trigger and a suggested fix.

## Decisions for ad0ll

ad0ll answered SHELL-3 and TIX-3 to the backend session (2026-10-01), which owns both now, and CLEAN-2 to us: the complete fix.

1. **The friend picker (SHELL-3).** Gift Messages go out through LINE's full picker on purpose, because its one-pick mode lists friends only and can come up empty. So one message can reach several chats, group chats included, and the first person to open it in a 1:1 chat receives the sticker. AGENTS.MD says a Gift Message goes into one 1:1 chat. _Answered_: the full picker stays, and AGENTS.MD's Gift Message row says it goes to the chats the giver picks and can't be received from a group chat.
2. **Reserve tickets that depend on the phone (TIX-3).** A pack's tickets reach the person only if their phone keeps the payment's digest until the server adds them. _Answered_: the server records each purchase before the payment is signed, and a sweep adds the tickets of payments Sui shows that the phone never reported. The backend session is building it, the checkout's side included.
3. **Mona Sans's slashed zero (CLEAN-2).** The plain zero is patched site by site, with widths tuned to other tokens. _Answered_: a self-hosted Mona Sans build whose tabular zero is the plain glyph, so `tabular-nums` works everywhere again, and every zero workaround goes.

Calls the lanes made, which ad0ll left to us (2026-10-01). All stand as merged but two, logging out and render crashes, which changed:

- **A signed payment that never shows.** A payment is kept on the phone from the moment it's signed. If Sui still hasn't shown it an hour later (`PAYMENT_LANDS_WITHIN_MS`, a guess), the checkout says it didn't go through and drops it.
- **Logging out mid-drawing** keeps the sticker in progress, for its person alone, so it's there again with its ticket when they sign back in. Deleting it cost the ticket, since the server doesn't hand back an unsealed one, and inside LINE logging out signs the same person straight back in.
- **"Did it go out?"** A Gift Message LINE doesn't confirm sent gets this step, with It went out and Take it out, instead of a second Send in LINE. It gives up waiting on LINE 5 s after the app comes back into view (`PICKER_RETURN_MS`, a guess), or 20 s after asking for the picker while the page never left view (`PICKER_OPENING_MS`, a guess).
- **The stroke unlock.** Fast passes made before the first tap no longer count toward switching to stroke, so a replay switches where its combo did.
- **The Back key.** A Back pressed within 250 ms of an overlay closing by itself is spent on the closed overlay (`STEP_BACK_HOLD_MS`, a guess), so it can't take a second history entry.
- **A sheet's perforation.** A move over 8 px counts as a drag, not a tap (a guess).
- **A seal retry turned away as signed out** keeps the sheet locked for the seal key, even on the first try, when the server can't hold a seal yet: only the seal route's own refusals reopen the sheet.
- **A seal that went out before a reload, on a ticket spent before today**, whose drawing can't be read back: the ticket is dropped rather than risk a new drawing being answered with the old sticker. It costs that ticket.
- **A cut that fails on the phone every time at 0:00** stays locked for the seal key instead of throwing the sticker in progress away, and Start a new sticker beside it lets that sticker and its ticket go.
- **A screen that crashes while rendering** gets a page with the error's words and Reload, from an error boundary around the whole app, in place of a blank page.

## Fix lanes

Each lane owns the files its findings live in, fixes them on its own branch and is merged to main once its checks pass. About six run at once. This checklist is updated as each lane merges.

Fixed on main before the lanes: SHELL-5, by another session's `3a6286ac`.

Wave 1:

- [x] Sealing and spending on the drawing screen: DRAW-1, DRAW-3, DRAW-7, DRAW-8, DRAW-9 (the app's side only: another branch changed the server's mint path), DRAW-10, DRAW-12, DRAW-15, DRAW-18, TIX-2, the timelapse half of DRAW-13, and keeping the ticket spend key until the drawing screen has recorded the ticket use
- [x] The kept drawing and the ink engine: DRAW-2, DRAW-4, DRAW-5, DRAW-6, DRAW-11, DRAW-13
- [x] Sticker tray: TRAY-1, TRAY-2, TRAY-4 to TRAY-8
- [x] Sticker board and stat board: BOARD-1 to BOARD-7, CLEAN-18
- [x] Giving: GIFT-1 to GIFT-4, GIFT-9, GIFT-10, SHELL-4, CLEAN-12, and the API's `deposit_held` and `gift_held` answers
- [x] Receiving, and the gift link in the server log: GIFT-5, GIFT-7, GIFT-8
- [x] Gratitude records: GRAT-1, GRAT-2, GRAT-3, GRAT-8, GRAT-11
- [x] Tickets and payments: TIX-1, TIX-4 to TIX-9, CLEAN-8. For ad0ll to confirm: a signed payment Sui still hasn't shown an hour later counts as not gone through (PAYMENT_LANDS_WITHIN_MS, a guess)
- [x] App shell and sign-in: SHELL-1, SHELL-2, SHELL-6 to SHELL-10, UI-1, CLEAN-10, CLEAN-16. A screen whose code fails to load shows a Reload note; one that crashes while rendering gets the app-wide crash page
- [x] Shared controls and the catalog import: UI-2 to UI-7, GIFT-6, CLEAN-1, CLEAN-9

Wave 2, as wave 1's lanes finish:

- [x] Seal ceremony: DRAW-14, DRAW-16, DRAW-17
- [x] Gratitude visuals: GRAT-4 to GRAT-7, GRAT-9, GRAT-10, GRAT-12, GRAT-13
- [x] Dates in Tokyo's day: EXPL-3, TRAY-3, CLEAN-5, CLEAN-7, CLEAN-13, CLEAN-15 (EXPL-1 and EXPL-2 go with the frontend audit's `ux/explore` lane)

Wave 3, once the lanes above are merged, since these touch every area:

- [x] Shared helpers: CLEAN-3, CLEAN-11, CLEAN-14, CLEAN-20, CLEAN-22. explore/ keeps its private curve and clamp copies, since the frontend audit's Explore lane is working there
- [x] One device store, and a query cache: CLEAN-17, CLEAN-21. explore/pileVisits.ts keeps its own storage code, since the frontend audit's Explore lane is working there
- [x] One ticket card shell: CLEAN-4, CLEAN-6
- [x] Split trayEngine.ts: CLEAN-19. The sticker tray is trayEngine.ts and seven parts beside it, none over 450 lines

## The fixes review

[The review of these lanes' fixes](../../review/2026-10-01-frontend-fixes-code-review.md) found 12 bugs in them: 2 high, 4 medium, 6 low. Follow-up lanes fix them:

- [x] Sealing: R2-1 to R2-4
- [x] Your sticker board's kept answer: R4-1, and the give sheet no longer offers a sticker that just went into a gift
- [x] Tickets: R1-1 to R1-3
- [x] Giving: R3-1 to R3-4. Online, a failed token request and a failed result poll still look alike in LIFF 2.31.0, so a token request that fails online still reads "Did it go out?"

A review of those follow-ups found 6 more, recorded in the same review: 1 medium, 5 low.

- [x] Sealing: F1-1, F1-2, F1-4
- [x] Giving: F2-1, F2-2
- [x] The server mints stickers left unminted: F1-3, by the backend session's mint catch-up

## After the follow-ups

ad0ll approved these on 2026-10-01. One lane each:

- [x] Review the third round of fixes: b1d6fd3a, 1410d0b6, 3afcb287, 36181a92. It found T-1 to T-3, fixed in 4a1299f6
- [x] The crash page and Start a new sticker, seen in WebKit in both languages: the link wraps clear of the seal chip, and the crash page says Reload to try again
- [ ] Japanese seal chips break between phrases, and whether a tap during a tab change's view transition is dropped (verify only)
- [ ] NSFW stickers' full images for adults only: everyone else gets a veiled image, in every view, from `/api/images` and in the NFT metadata
- [x] The Sealed card's keys work as soon as they show, and the pull tab opens the gift bag a little sooner (`PULL.snapAt`, a guess)
- [ ] CLEAN-2: a self-hosted Mona Sans whose tabular zero is plain, with every zero workaround gone
- [x] The finished plans deleted: i18n, the 09-26 frontend feedback, NSFW stickers
- [x] What to check on a phone, in the review record

## Left from the deleted plans

Approved there, not on main. ad0ll keeps or drops each; this plan's deletion drops what's left.

- Explore kept alive between tabs, so its search and scroll survive (`App.tsx` mounts it only while it's open)
- The Shop's price quote cached and prefetched (`useReservePacks` keeps no answer)
- Leaderboard rows sliding to their new rank, instead of dealt again (`useRowDeal`)
- Explore paged by day (`apps/api/src/explore/explore.ts` sends today's stickers and the feed, capped)
- The greeting sent by the server from a follow webhook (`deploy/line/greeting.md` says to turn the Manager's greeting off once it exists)
- A CDN in Japan, once there's a real domain
- ad0ll's, in LINE's consoles: rename the LIFF app, the Login channel and the Official account to Croquis; paste the greeting into LINE Official Account Manager and check its auto-replies

Superseded, so dropped: the board's shell during sign-in (the 30-day session and the board kept on the phone shortened the wait instead), a given sticker dropping again on today's layer in Explore (a gift doesn't move a sticker), the reserve ticket's scalloped ends, and requiring Japanese for every string.
