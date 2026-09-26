# NSFW stickers: frontend plan

Frontend only. Branch `feat/nsfw-stickers`. The backend part (World ID verification, `stickers.nsfw`, age status on people, refusals in the API) is separate; until it lands, the frontend reads both from one demo module, so swapping to the API touches only `toSticker`/`toPerson` and deletes that module.

## Decisions

- One flag per sticker, `nsfw`, set before sealing, fixed at seal. No categories.
- Age status per person: `adult | minor | unknown`. Only `adult` sees NSFW stickers, marks them, or receives them. No viewer setting.
- Marking: an "18+" toggle chip beside `SealKey`, adults only. Sealing starts on the key's second tap and at time-up, so there's no step after drawing for a checkbox.
- NSFW stickers wear **pink foil** everywhere, own stickers included (holo foil stays for stickers someone else drew; NSFW overrides it with pink).
- Not adult: the sticker is blurred inside its cut; outline, white edge and pink foil stay sharp, with a small "18+" mark. The blur is CSS, so the image still reaches the device; serving a pre-blurred image is the backend part's.
- Gift bag for NSFW: pink tear tape, pink tint on the frost, a faint bikini emboss, and no ghost of the sticker through the frost or the film. The pull tab reveals it.
- Recipient known (`GiveSheet`, `OfferSheet` swap): NSFW stickers can't be picked unless the recipient is adult. Recipient unknown (`Giving` through LINE's friend picker): sending is allowed; the receiving side refuses anyone not adult.
- Receiving while not adult: refusal screen, pink sealed bag stamped "18+", sticker never shown.

## Vocabulary (in AGENTS.md)

NSFW sticker, Age status, Pink foil.

## Demo stand-ins

- `src/stickers/nsfwDemo.ts`, one localStorage key (`draw.nsfwDemo`): `myAgeStatus` override, `stickerIds` sealed as NSFW on this device, `stickerNos` marked in the developer slip (a private window doesn't share storage with the window that sealed).
- `src/identity/ageStatus.ts`: `AgeStatus`, `ageStatusOf(person)` from a table by handle (`bob: "minor"`, default `adult`); `identity/useMyAgeStatus.ts`: slip override, else `ageStatusOf(me)`.
- `toSticker` sets `StickerView.nsfw` from `isNsfwSticker`. Age status is read with `ageStatusOf` where it's needed (`GiveSheet`, `OfferSheet`), not stored on `PersonView`. Both read when data maps, so slip changes reload the page.
- `SealRequest.nsfw` exists, but `httpApi` can't send it until the seal form has the field; the demo records the sticker after the seal instead.

## Backend contract

- Seal form: `nsfw` (`"true"`/`"false"`); refuse it from anyone not adult.
- Sticker shape: `nsfw: boolean`. Person shape: `ageStatus: "adult" | "minor" | "unknown"`; `Me` too.
- Receive refusal `adults_only` (preview and receive), for an NSFW gift to anyone not adult; `packageGift` with `forUserId` refuses the same.
- Serve a pre-blurred image to viewers who aren't adult.
- Then: `toSticker`/`ageStatusOf`/`useMyAgeStatus` read the API, `httpApi` sends `nsfw`, the frontend `adults_only` check goes, and `nsfwDemo.ts` and `NsfwDemoControls` are deleted.

## Tasks

### 1. Data and rules

- [x] Vocabulary rows in AGENTS.md
- [x] `nsfwDemo.ts`, `ageStatus.ts` as above
- [x] `nsfw` on `StickerView`, `BoardSticker` (`toBoardSticker`), `KeptSticker` (`useKeptStickers`); fixtures
- [x] `src/stickers/nsfw.ts`: `veiledFor`, `canGiveTo`; tested through `StickerPicker.test.tsx` and `receiveFlow.test.ts`

### 2. Pink foil and veil (`src/stickers`)

- [x] `StickerFoil` gains `tone: "holo" | "pink"`: pink bands and a soft pink gloss on the band, tokens beside `--foil-*`
- [x] `StickerFigure` gains `nsfw` and `veiled`: `nsfw` shows pink foil (size from `foil`, else `board`); `veiled` blurs the image masked to `--m`, keeps resin and sweep, centers an "18+" mark
- [x] Callers: `PlacedSticker` (new `nsfw`, `veiled` props; `StickerBoard`, `ArtistBoard` pass them), `ArtistBoard`'s visit view, `explore/LiftedSticker`, `StickerDetail`, `ReceiveGiftDialog`
- [x] Plain `<img>`s get the blur when veiled: `ExploreScreen`'s `StickerImage`, `StickerPicker`
- [x] Tray (`trayEngine.ts`, slot built in `StickerTray.tsx`): NSFW slots get the sheet foil with the pink tone, as gift slots get holo. Own stickers only, so no veil
- [x] `StickerDetail` shows only your own and given stickers, so it takes the foil but no veil or replay change

### 3. Marking at seal (`src/sticker-creation`)

- [x] "18+" toggle chip beside `SealKey`, shown with the key, adults only (`useMyAgeStatus`)
- [x] Toggle kept with the drawing in progress (`session/keptSession.ts`), cleared on `reset-sheet`; time-up seals with its value
- [x] `SealRequest.nsfw` (`api/apiClient.ts`); after `api.seal` succeeds, `markNsfwSticker`
- [x] `SealedCard`: a pink "18+" mark beside "Sealed" (the ceremony's flying sticker is painted on canvases, so no foil there)

### 4. Giving (`src/giving`, `src/offers`)

- [x] `GiftBag` gains `nsfw`: pink replaces `--aqua` on the tape, lobe and loop; pink tint on `.gift-bag__front`'s frost; bikini emboss as an inline SVG on the front at low opacity; `stickerUrl` and the film's `insideUrl` dropped once sealed
- [x] `Giving` passes `nsfw`; its give sheet adds a fine line: only adults verified with World ID can open it
- [x] Gift message hero: `gift-message-hero-nsfw.png` (the pink sealed bag), picked in `Giving`
- [x] `StickerPicker` gains `blocked(sticker)`: those tiles disabled with "18+"; `GiveSheet` and `OfferSheet` pass `!canGiveTo(s, ageStatusOf(recipient))` and show why. Test: an NSFW sticker can't be picked for a minor

### 5. Receiving (`src/receiving`)

- [x] `ReceiveGiftDialog`: NSFW → pink bag, no ghost while sealed
- [x] Not adult → frontend refusal kind `adults_only` beside `needs_server` in `receiveFlow.ts`, decided on `previewed`; `refusals.ts` screen with the pink sealed bag and a new `adults-only` `GiftStamp`; action `backToLine`, which reads as the board when opened from it. Test in `receiveFlow.test.ts`
- [x] `GiftsForYouBadge`: an 18+ mark on its bag when the newest gift is NSFW (the badge is already pink)

### 6. Developer slip (`sticker-board/stat-board`)

- [x] `NsfwDemoControls` beside `GratitudeDemoControls` in `StatBoard`: "My age status" (default / adult / minor / unknown) and "NSFW sticker Nos." field; saving reloads the page

### 7. Strings (`src/i18n/strings`, both languages, `glossary.md` for Japanese, one `/** … */` per string)

- [x] `stickerCreation`: toggle label, its assistive name, sealed card's mark
- [x] `stickers`: "18+" mark, veiled sticker's assistive label
- [x] `giving`: give sheet's fine line, picker's blocked reason, NSFW bag's picture words, the `adults-only` stamp
- [x] `receiving`: `adultsOnly` refusal title and line
- [x] `stickerBoard.developer`: the slip's controls (English only)

### 8. Finish

- [x] Demo: `?as=alice` marks and seals a sticker, places it; `?as=bob` (private window, No. entered in the slip) opens alice's board: blurred with pink foil; bob's slip set to adult: seen plainly
- [x] Alice gives from carol's board; carol as minor gets the refusal, as adult unpackages it from the pink bag and accepts
- [x] Alice gives from bob's board: the NSFW sticker is blocked while bob is a minor
- [x] Frontend lint, typecheck, tests, format (`sticker-chain`'s tests need `forge`, not installed here)
- [ ] Reduced motion and Japanese, checked on a phone

## Out of scope

- World ID sign-in and verification (backend part)
- A pre-blurred image for viewers who aren't adult (backend part)
- A viewer setting to hide or show NSFW
