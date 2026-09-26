# Giving and Receiving: what's left

The plan for `docs/superpowers/specs/2026-09-26-giving-receiving-design.md` is built and merged. Remove this file when the items below are done.

- [x] **The gift message’s hero image.** `buildGiftMessage` takes `heroUrl`, and nothing passes one yet: render `GiftBag` sealed with no handle and no sticker at 1040 × 1040, keep it under 1 MB beside `giving/Giving.tsx`, and pass `new URL(heroPng, location.origin).href` (HTTPS only).
- [x] **Recording gratitude.** When `GratitudeMiniGame` takes `giftId`, pass it from `StickerBoard.tsx`'s Send gratitude sheet (`owed.gift.id`) and the detail's `onSendGratitude` gift.
- [ ] **The giver's side on screen.** The badge, "@bob accepted your sticker ♡" and the silhouette naming its receiver have tests but no screenshot yet: seal a sticker, give it through LINE's picker to a second LINE account, and reopen the board after that account receives it.
- [ ] **"Not friends in LINE yet?"** needs a check on a phone (the spec's last section).
