# Frontend review fixes

2026-09-30. The plan that fixes the findings in [the frontend code review](../../review/2026-09-29-frontend-code-review.md). An ID such as DRAW-1 names a finding there, with its trigger and a suggested fix.

## Decisions for ad0ll

Each has a recommendation. The fix lanes leave these three alone until you answer.

1. **The friend picker (SHELL-3).** Gift Messages go out through LINE's full picker on purpose, because its one-pick mode lists friends only and can come up empty. So one message can reach several chats, group chats included, and the first person to open it in a 1:1 chat receives the sticker. AGENTS.MD says a Gift Message goes into one 1:1 chat. _Recommend_ keeping the full picker, rewording the Gift Message row to say the first person to open it receives it, and saying so on the give sheet.
2. **Paid tickets that depend on the phone (TIX-3).** A pack's tickets reach the person only if their phone keeps the payment's digest until the server adds them. _Recommend_ the server recording each purchase (the person, the pack and its price) before the payment is signed, then adding its tickets once Sui shows the payment, so the phone's copy only makes it sooner. It needs a table and a migration. The other way, reading the vault's payment events, needs no client change but depends on Sui's event index.
3. **Mona Sans's slashed zero (CLEAN-2).** The plain zero is patched site by site, with widths tuned to other tokens. _Recommend_ self-hosting a Mona Sans build whose tabular zero is the plain glyph, so `tabular-nums` works everywhere again; or setting the counting figures in another face. A design call.

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
- [x] App shell and sign-in: SHELL-1, SHELL-2, SHELL-6 to SHELL-10, UI-1, CLEAN-10, CLEAN-16. A screen whose code fails to load shows a Reload note; a screen that crashes while rendering still unmounts the app, which needs an app-level boundary
- [x] Shared controls and the catalog import: UI-2 to UI-5, UI-7, GIFT-6, CLEAN-1, CLEAN-9. UI-6 (a held step back racing the Back key) is still open

Wave 2, as wave 1's lanes finish:

- [ ] Seal ceremony: DRAW-14, DRAW-16, DRAW-17
- [x] Gratitude visuals: GRAT-4 to GRAT-7, GRAT-9, GRAT-10, GRAT-12, GRAT-13
- [ ] Dates in Tokyo's day: EXPL-3, TRAY-3, CLEAN-5, CLEAN-7, CLEAN-13, CLEAN-15 (EXPL-1 and EXPL-2 go with the frontend audit's `ux/explore` lane)

Wave 3, once the lanes above are merged, since these touch every area:

- [ ] Shared helpers: CLEAN-3, CLEAN-11, CLEAN-14, CLEAN-20, CLEAN-22
- [ ] One device store, and a query cache: CLEAN-17, CLEAN-21
- [ ] One ticket card shell: CLEAN-4, CLEAN-6
- [ ] Split trayEngine.ts: CLEAN-19
