# Explore lane: findings and fix plan

Code read at main 42d698a (`.claude/worktrees/feedback-plan`). Frontend paths are relative to `apps/frontend/src`. Screenshots are 390×844 in `/tmp/feedback-plan/explore/`.

Screenshots:

- `now-1-top.png`, `now-2-feed.png`, `now-3-feed-more.png`: Explore on the dev server today, with 10+ real stickers.
- `avatar-before-after.png`: the feed avatar, left with the CSS live until today (942d96e), right with main.
- `proto-30-falling-300ms.png`, `proto-30-falling-900ms.png`, `proto-30-settled.png`, `proto-3-settled.png`, `proto-30-lifted.png`: the pile prototype (`pile-proto.html`, rendered by `render-proto.mjs`). The art is generated doodles that stand in for real stickers.

---

## 1. Bounding box around the avatar

- **Item:** "There's a bounding box appearing around the user's avatar inside the Explore page."
- **Now:** Each feed post's head wraps the artist's photo sticker in `span.feed-avatar` (explore/ExploreScreen.tsx:203-205). The span draws a pink ring as a box-shadow (explore/ExploreScreen.css:401-410). On main the ring is round and hugs the photo's white rim (`avatar-before-after.png`, right).
- **Cause (verified):** The build that was live until today (942d96e) had `.feed-avatar { width: 34px; height: 34px; box-shadow: 0 0 0 1.5px var(--pink), var(--shadow-label) }` with no `border-radius`. The flex parent `.feed-head` blockifies the span, so the ring and its label shadow drew a 34px pink square behind a 36px round photo (turned -4°), which pokes out of the square's sides. Re-applying the old rule on today's dev server reproduces it exactly (`avatar-before-after.png`, left). Fav's 2cbba77 ("round the Explore feed's avatar ring") fixed it: the ring is now `display: inline-flex; flex: none; 36px; border-radius: 50%`. 2cbba77 is not in 942d96e and is in a38f82d, which the live site runs since today's deploy (`git merge-base --is-ancestor` both ways).
- **Fix:** Nothing more to build. Check it once in LINE on an iPhone. I couldn't render WebKit here: Playwright's WebKit build isn't installed for this version. Other avatars can't show a box: the leaderboard's has no wrapper, and the search results' `.result-avatar` wrapper has no ring or shadow. The pile below removes the feed and `.feed-avatar` entirely.
- **Impeccable:** `polish` (verify only).
- **Size:** S.
- **Decisions for ad0ll:** none.
- **Overlaps:** item 2 deletes this element. Its i18n moves are on the in-flight `i18n/explore` branch.

---

## 2. Explore's stickers read as a list; make them a pile, and always show the artist

- **Item:** "When you're looking at the stickers people have made, it looks like a list… This is more creative, so I'd expect a wilder organization. Maybe like stickers falling into a pile of stickers… Just make sure we're showing the artist who drew the sticker."

### Now (verified)

- Explore is one scroll with four parts: search, then a "Today's stickers" strip (explore/ExploreScreen.tsx:298-324), then "This week" leaderboards (134-186), then an activity feed (328-337).
- The strip is 72px stickers in a white card, tilted ±3-4° alternately (ExploreScreen.css:103-141).
- The feed shows one 112px sticker per post, centered, with a head row and a fine-print caption: about 4 stickers per screen (`now-2-feed.png`).
- Each post names the artist three times: avatar, head text, caption (ExploreScreen.tsx:202-222).
- Stickers are a flat `<img src=png>` (ExploreScreen.tsx:188-190). There's no live resin and no light, so they read as thumbnails, not objects.
- The API sends 50 newest seals and receives merged (`activity`), plus up to 50 of today's stickers (`todaysStickers`). There's no paging (apps/api/src/explore/explore.ts:14, 49-118).

### Cause (verified by reading)

- The layout is the pattern DESIGN.md says the world refuses: "Procreate-grey tool chrome with a pixiv-style feed" (DESIGN.md:263).
- DESIGN.md has no Explore section at all, so nothing asked for more.
- Everywhere else, stickers are loose, turned, overlapping objects (the board, the tray's sheets). Explore is the one place they sit in rows.

### Fix: the brief (shape)

- **Job:** Browse what everyone is drawing, see who drew each one, and get to that artist's sticker board. The people coming here are artists killing a minute, in a "look around" mood. Success: they find a sticker they like and land on its artist's board.
- **Thesis:** Explore's Stickers view is a heap of real die-cut stickers dropped on the liner.
  - The newest land on top, falling in as you arrive.
  - Each day is its own layer, on a perforated floor, so scrolling down digs back through older days.
  - Every sticker wears a small name tag with its artist.
  - Tap one to lift it off the pile.
- **Anti-goals:**
  - no grid, cards or rows;
  - no foil (the Other Hand Rule: surfaces that aren't a board show none);
  - no rarity or ranking inside the pile;
  - nothing that hides the artist.

### Screen structure (`proto-30-settled.png`)

1. Search (unchanged).
2. A two-way view switch under it, **Stickers | This week**.
   - It reuses the leaderboard tabs' segmented look (`.leaderboard-tabs`), with the current view in Soda Aqua, Explore's hue.
   - "This week" is today's leaderboard section, moved as is, with its three boards.
   - The pile would bury the leaderboards under hundreds of stickers if they stayed in one scroll.
3. The pile, as day layers, newest day first. Each layer is:
   - a perforation row (the house's "tear here" line) as its top edge;
   - a dot badge at -4°: Seal Yellow "Today 9.26" for today, Liner Lift "9.25" for older days;
   - then that day's heap.
4. The "Today's stickers" strip and the activity feed are deleted, because today's layer is today's stickers.

### The pile layout (reuse, don't invent)

- `sticker-board/tray/sheetPacking.ts` already does the hard part. It's a skyline packer that "lowers each sticker onto it at every x and settles on its own cut line", from real cut lines (`outlineShape` from the API's `outline`, and `profileOf`). It's seeded (`ui/seededRandom.ts`) and stable: "a spot depends only on the stickers before it, so appending moves nothing."
- A pile is the same algorithm with three changes:
  1. **Overlap:** a negative clearance lets each new sticker sink about 40% into what it lands on. The prototype uses 0.42 of its radius; tune on a phone.
  2. **Drop point:** a seeded, center-biased drop x (the sum of three randoms), instead of line-by-line fill, so it heaps into a mound. A slope check nudges it downhill up to 3 times.
  3. **Turn:** a seeded turn of ±17° instead of the sheet's small turns.
- New module `sticker-board/tray/pileLayout.ts` (or `explore/pileLayout.ts`) exports `pileStickers(items, { width, overlap, seed })`. `profileOf` gets exported, or moves to a shared cut-profile module. Unit tests: stable when appending, deterministic per seed, and every tag rect left uncovered (below).
- **Stable between visits and phones:**
  - lay out bottom-up, oldest first, per day layer, in a fixed 360-unit-wide space scaled to the phone's width (360-430px);
  - seed each layer by its day, and each sticker's x and turn by its id.
  - A new sticker only lands on top. Nothing below it moves.
- **Keep the artist visible:** the placement treats the name tag's rect (at the sticker's lower left) as a no-cover zone for later stickers. If a candidate spot would cover an earlier tag, try the next seeded x.

### How it moves (animate; transform and opacity only)

- **Fall-in on arrival:**
  - today's newest 12-16 stickers fall from the top of the pile area (clipped under the view switch, never over the search), oldest first, so the newest lands last and on top;
  - each falls on a gravity ease-in (about `cubic-bezier(.55,0,1,.45)`), 55ms apart, taking 620ms each (prototype values);
  - it spins from ±24° into its seeded turn;
  - it lands with a squash (1.05, 0.93), a 5px rebound, then rest: the house stick settle.
  - A still-in-the-air frame is `proto-30-falling-900ms.png`.
- **Return visits:** only stickers new since your last visit fall (remember the newest id seen). The rest are already there, so the 100th visit costs nothing.
- **While you watch:** a sticker sealed while Explore is open falls onto the pile when data refreshes. That's truthful activity, not a flourish.
- **Shadows:** a filter must not animate. The falling sticker carries a separate shadow element that converges in transform and opacity, from the Peeling offset to the Sticker cast offset.
- **Lift:**
  - Tap a sticker and it peels up toward the top right, the house peel (280ms, `--ease-peel`), and flies to the lifted view. Its spot in the pile keeps a faint ghost at about 18% (`proto-30-lifted.png`).
  - Put back plays the flight backward into its spot, with the stick settle.
  - `sticker-board/detailLift.ts` (`useDetailLift`) is this flight for the board. Generalize its `originOf` and sticker type rather than writing a second one.
- **Reduced motion:**
  - no fall: the whole pile fades in over 150ms;
  - lift and put back crossfade in 150ms (detailLift's `CROSSFADE_MS`);
  - new arrivals just appear.

### Browsing

- **Tap** lifts a sticker into a bottom sheet (`proto-30-lifted.png`):
  - the sticker large (about 210px) with live resin under the one light (`StickerFigure` plus `useLight` while open);
  - the artist chip;
  - fine print: No. · drawing time · date, plus "to @ken" if it was given;
  - **Go to @mika's sticker board** (label stock, not a key: Explore has no key);
  - a Put back quiet link.
  - Tapping the scrim, Escape or LINE's back (`useBackToClose`) also puts it back.
- **Next and previous:** swipe sideways in the sheet to lift the next or previous sticker in pile order (newest first). `sticker-board/detailPaging.ts` (`swipeLock`, `swipeTo`) is this gesture already. Arrow keys and two small buttons do the same for keyboards and screen readers.
- **Older stickers:** scroll down. Each day layer ends at the next one's perforation. Near the bottom, the next older day loads and its layer appears already settled: digging, not arriving.
- **At 3 stickers** (`proto-3-settled.png`):
  - a small heap on today's floor, stickers kept at their normal size;
  - older days follow below, so the screen never looks empty;
  - with no stickers ever: an empty layer with a faint kiss-cut outline where the first will land, and "The first sticker sealed lands here."
- **At 30:** today's heap is about 1.5 screens (`proto-30-settled.png`).
- **At 300:**
  - mount only the stickers within about 1.5 screens of the scroll position. Positions come from the layout, so skipped stickers cost nothing;
  - a busy day's layer can be several screens tall;
  - the layout needs only sizes and outlines, and images load as they near the viewport.

### Where the artist shows

- **Every sticker in the pile wears a name tag:** a Liner Lift pill at its lower left, turned a little against the sticker. It holds the artist's LINE picture as a 16px photo sticker (letter fallback) and "@handle" in 11px bold.
  - The layout keeps every tag uncovered.
  - The tag is part of the sticker's tap target.
  - The prototype shows tags stay readable at 30 stickers.
- **A given sticker adds a second, aqua tag, "to @ken".** Aqua means giving.
- **The lifted view shows the artist chip**, but a plain one. `ArtistChip`'s picture sits in a turning foil ring (stickers/artist-chip.css:35-50), and DESIGN.md:329 bans foil on surfaces that aren't a board. Add a `plain` variant to `stickers/ArtistChip.tsx`: white edge, no ring. The prototype's chip is that variant.

### Performance (suspected until measured on an iPhone; overlaps the perf lane)

- **Pile stickers render flat:** just the PNG, which already has its cut, edge, cast and baked resin (ExploreScreen.css:423), with no CSS filter, no mask layers and no light.
- **Only the lifted sticker gets live resin.** Each live-resin sticker adds:
  - four masked layers (`stickers/LiveResin.tsx`);
  - three more image downloads (mask, spec and rim, about 57 KB together for one real sticker on disk);
  - an infinite 11s sway (stickers/live-resin.css:64);
  - a restyle on every light beat (stickers/light.ts:18-19).
  - A heap of 20-30 of those is the wrong place to spend that. Whether the top 4-6 of the pile could afford it is a question for the perf lane's recorder on a real phone.
- **Images are the real cost:**
  - one sealed sticker's PNG on disk is 202,729 bytes at 574×579 (`ls -la data/feedback-images`);
  - 30 of them are about 6 MB to download;
  - decoded they're about 40 MB, which is arithmetic from 574×579×4 per image, not measured.
  - Recommend a small image made at seal time (about 256px) for the pile and tray. Server change, M, perf lane.
- **Taps land on what you see:** clip each sticker button to its cut line (`clip-path: polygon(...)` from `outline`, the same points `outlineShape` reads). A tap on a transparent corner then reaches the sticker underneath.

### Accessibility

- **DOM order is newest first**, whatever the visual stacking.
  - Each day is a `<section>` with an `<h2>`: "Today", "Yesterday", "9.24".
  - Each day holds an `<ol>` of `<button>`s labeled "No.0147 by @mika, 5 min ago", plus ", given to @ken" if given.
- **Focus:** a focused sticker rises to the top of the pile, lifts 2px and gets the house focus ring (2px Ink at a 3px offset). Enter or Space lifts it.
- **The lifted view:**
  - is a dialog (`role="dialog"`, `aria-modal`);
  - traps focus (`ui/useFocusTrap.ts`) and has visible Next and Previous;
  - returns focus to the sticker's button on close.
- **Motion:** falling is decoration, so it's hidden from assistive tech. A polite live region can say "2 new stickers" when some arrive while open.

### Other states

- **Loading:** today's badge and the empty floor show at once, and the stickers fall in when data arrives. The fall-in is the loading transition, replacing "Loading…" (ExploreScreen.tsx:387). This overlaps the transitions lane.
- **Error:** keep `Failed` with Try again (ExploreScreen.tsx:228-239).
- **Search:** results replace both views, as now.

### Gifts in the pile

A gift is an event, and PRODUCT.md wants "User gave [sticker] to User" in the global feed. That's decision 2 below.

### Files

- **Frontend:**
  - `explore/ExploreScreen.tsx`: views switch; drop `Today`'s strip and `FeedPost`; keep `ThisWeek` and search.
  - New `explore/StickerPile.tsx` and `explore/sticker-pile.css`: the layers, name tags and fall-in.
  - New `explore/LiftedSticker.tsx`: the sheet.
  - The layout: `pileLayout.ts`, plus the `profileOf` export in `sticker-board/tray/sheetPacking.ts`.
  - `stickers/ArtistChip.tsx` and `artist-chip.css`: the `plain` variant.
  - `sticker-board/detailLift.ts`: generalize the origin.
  - `i18n/strings/explore.ts`, each new string `{ en, ja }` under its where-comment. New keys:
    - `views.stickers`, `views.thisWeek`;
    - `pile.today`, `pile.yesterday`, `pile.day`, `pile.sticker` (the button label), `pile.givenTo`, `pile.empty`, `pile.newArrivals`;
    - `lifted.goToBoard`, `lifted.putBack`, `lifted.next`, `lifted.previous`, `lifted.caption`.
    - The strip's and feed's keys (`today.*`, `feed.*`) get deleted.
- **API:**
  - Phase 1 needs no API change: build today's and earlier layers from `activity`'s 50 events, grouped by Tokyo day.
  - Phase 2 adds `GET /api/explore/stickers?day=YYYY-MM-DD`: that day's events, oldest first, with sticker, event, giver and receiver, and the next older day with any events. Plus the small image. It goes in `apps/api/src/explore/explore.ts` and `apps/api/src/routes/explore.ts`, with `ticketDay` and `ticketDayStart` for Tokyo days.
- **DESIGN.md:** add an Explore section: the views switch, day layers, name tags, the lifted view, the plain chip and the pile's motion. Also update the Artist chip section.

### Phasing

1. **Phase 1 (M-L):** the pile from today's payload, flat stickers, name tags, fall-in, lift, views switch, a11y, reduced motion.
2. **Phase 2 (M):** day paging API, virtualization, small images (with the perf lane).
3. **Phase 3 (S-M):** gift resurfacing, if chosen, and live arrivals.

- **Impeccable:**
  - `shape`: this brief, for ad0ll to confirm;
  - `overdrive`: owns the pile, its layout and the fall-in. Its "propose first" step is decisions 1 and 2 below;
  - `animate`: fall, lift, put back, reduced motion;
  - `delight`: arrivals on return visits;
  - `harden`: 0 / 3 / 300, errors, screen readers;
  - `optimize`: images, with the perf lane;
  - `polish` last.
- **Size:** L overall. Phase 1 is about a day.

### Decisions for ad0ll

1. **How the pile falls.** (a) Side view: stickers drop down the screen and heap on each day's floor, as prototyped. (b) Top-down: stickers drop toward you onto a loose spread, the way the board works. _Recommend (a):_ it's the "falling into a pile" he described, and the Gratitude mini-hearts already pile along the bottom that way.
2. **Gifts.** (a) A sticker stays in the layer of the day it was sealed, and a gift adds a "to @ken" tag. Simple, but today's gifts don't show at the top. (b) A gift drops the sticker again on top of today's pile with the aqua tag. Its old spot keeps a hatched silhouette, the board's given-sticker language (`sticker-board/GivenStickerSilhouette.tsx`). Layers stay stable because events only append. _Recommend (b)_ ("Giving is the product"), shipped in phase 3 with (a) until then.
3. **Leaderboards.** Move them to a **This week** view beside **Stickers**, or keep one scroll with the leaderboard under today's layer. _Recommend the views switch._ A pile of hundreds would bury them.
4. **Name tags.** Show on every sticker, as asked and prototyped, or show only on the top layer and on lift, which is calmer but hides artists. _Recommend every sticker._
5. **Live resin in the pile.** None but the lifted sticker, or the top 4-6 too if the perf lane's phone numbers allow. _Recommend none for phase 1._
6. **Name.** Call it "sticker pile" in code (`StickerPile`) with no AGENTS.MD entry, since it's a screen element. _Recommend yes._

### Overlaps

- **Transitions lane:** the views switch, and the pile's loading state (the fall-in replaces "Loading…").
- **Perf lane:** image weight and decode memory, live-resin budget, the small image at seal time.
- **Icons lane:** the Explore tab icon. The pile doesn't touch it.
- **In flight:**
  - `i18n/explore` (3 commits ahead of main): moves all of Explore's text to the catalog and turns on jsx-no-literals. Build on it.
  - PR #10 `i18n/handoff` (draft).
- `sheetPacking.ts` (the tray) and `ArtistChip` (boards, detail): changes must keep their current behavior.
- Fav's and Aakash's Explore work (`origin/explore-and-profile`) is already merged into main. No duplicate build is pending.

---

## Noticed in passing

1. **(verified) Sealing on the shared dev server fails for new users.**
   - `withSmartWallet` (api/smartWalletApi.ts:5-17) waits for Privy's wallet, which never readies in headless LIFF Mock. The seal ends "Couldn't seal (Your sticker wallet is taking too long…)" (`fail-explore-mika.png`).
   - Even past that wait, the API's mock chain mode returns no token id, and the client rejects the seal.
   - The perf lane's preview on 5191 seals. I made my users' stickers through it (`seal-via-5191.mjs`).
2. **(verified) Those error messages are interface copy with "wallet" in them**, which the brand rules ban: identity/smartWallet.ts:29 and api/smartWalletApi.ts:13.
3. **(verified) The empty leaderboard row has no padding.** "No one is on it yet this week." sits against the card's left edge (ExploreScreen.tsx:167, `now-1-top.png`).
4. **(verified) The feed says "0 MIN" for anything under a minute** (ExploreScreen.tsx:35-40). The pile's labels should say "just now".
