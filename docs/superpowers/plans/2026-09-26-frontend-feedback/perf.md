# Perf lane: how fast the sticker board opens, and the foil on first load

Research only; no code changed. The code I read is main 42d698a, in the feedback-plan worktree.

**How I measured.** Production build of 42d698a with `VITE_DEV_SLIP=on`, with LIFF Mock forced on by a
scratch Vite plugin (/tmp/feedback-plan/perf/vite.perf.config.ts). It is served the way the box serves the
app: gzip, `/assets/` immutable, index.html `no-cache`, and `/api` sent to the shared API
(/tmp/feedback-plan/perf/liveish.mjs on 127.0.0.1:5192). Chromium runs with 250 ms latency per request,
12 Mbit/s down and 4x CPU. The first load has an empty cache (cold); the second load uses the same context
(warm).

**Test user.** `perfowner` has 12 stickers, and 5 of them were drawn by `perfartist` or `perfartisttwo`.
Their images were sealed through the app's own sealing (seal.mjs) and given through the REST API (gift.py).

**Live measurements from this Mac, in Japan.** The round trip to the box is about 265 ms. Connect takes
0.26 s, TLS is done at 0.53 s, and the first byte of HTML arrives at 0.79 s. LINE's CDN answers in 29 ms
and api.line.me in 64 ms.

**Where the files are.** Scripts, runs, traces and frames are all in /tmp/feedback-plan/perf/. The runs
are in `runs/*.json`; open `runs/PT-*.trace.json` in Chrome DevTools. The foil frames are in `foil/`.

## Where the 5–7 s goes (model for an iPhone in LINE)

| Step                                                                                                          | Warm open    | Cold open (new stickers or after a deploy) | Basis                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| LINE opens the view; DNS, TCP and TLS to Germany; index.html (`no-cache`, so one round trip even when cached) | 0.8 s        | 0.8 s                                      | measured live                                                                  |
| Critical JS and CSS (about 390 KB gzip)                                                                       | 0            | +0.4–0.6 s                                 | measured live (all critical assets over one HTTP/2 connection: 1.1–1.2 s wall) |
| JS evaluation on the phone                                                                                    | 0.1 s        | 0.15 s                                     | 4x trace: 90–200 ms                                                            |
| `liff.init` (waits for LIFF's own XLT manifest, then its messages) + `getProfile`                             | 0.2–0.5 s    | 0.2–0.5 s                                  | code verified; time suspected                                                  |
| POST /api/session: 1 round trip + the box asking LINE's verify endpoint from Germany                          | 0.55–0.85 s  | 0.55–0.85 s                                | measured live: verify adds 0.3–0.6 s                                           |
| Sticker board, tickets and pending gifts, in parallel (board JSON 114 KB raw)                                 | 0.3–0.5 s    | 0.3–0.5 s                                  | measured locally                                                               |
| Sticker images: 49 requests, 3.7 MB for 12 stickers                                                           | 0 (cached)   | +1.5–3 s                                   | measured locally: 2.66 s to 5.54 s                                             |
| Privy's SDK downloads during the images (52 chunks, 737 KB gzip)                                              | small        | +2–3.4 s                                   | measured locally: all images in at 5.4 s without Privy, 8.8 s with it          |
| **Total**                                                                                                     | **≈2.5–3 s** | **≈5–8 s**                                 |                                                                                |

Local end-to-end numbers. Without Privy: cold, all sticker images are in at 5.4–5.5 s; warm at 1.04–1.09 s
(runs/A-_, A2-_). With Privy loading as it does in LINE: cold at 8.6–8.8 s, warm at 1.08 s (runs/P-_, PT-_).
In LINE, the warm number also pays for the TLS setup, the real LIFF and the verify call, which puts it
at about 2.5–3 s. ad0ll's 5–7 s matches the cold column. The warm column is the floor that every open
pays today.

---

## Item 1: first opening the sticker board takes 5–7 s

- **Item:** "It takes a really long time to first open up your sticker board, like five or seven seconds. I
  expect it to be much snappier."
- **Now:** verified numbers are in the table above. The chain is strictly serial:
  HTML → JS → `liff.init` → `getProfile` → POST /api/session → GET board → images.
  - line/liff.ts:57-60 awaits `liff.init`, then `liff.getProfile()`, before LineGate lets the app through.
  - api/SessionGate.tsx:36-51 posts the ID token on every open. It never tries the session cookie first.
  - apps/api/src/services/lineVerifier.ts:4 has the server call `https://api.line.me/oauth2/v2.1/verify`
    from Germany on every sign-in.
  - The session cookie has no Max-Age (apps/api/src/session.ts:17-22), so nothing lasts between opens.
- **Cause (ranked):**
  1. **Sticker image bytes.** Verified. The sticker PNG is 574–704 px RGBA, about 250 KB even for a simple
     doodle; with its mask, spec and rim it is about 310 KB per sticker. That is 3.7 MB for 12 stickers,
     and about 2.9 s of the cold load at 12 Mbit/s. Real drawings with more ink will be bigger. Explains
     about 40–50% of a cold open.
  2. **Privy's SDK competes with the board.** Verified locally. identity/PrivySignIn.tsx:5-6 says it
     "loads once the board is up and never delays it". It actually starts at the same render as the
     board (main.tsx:54-55: `<App />` and `<PrivySignIn />` are siblings). That is 1.3 MB gzip of JS on
     the same origin. The board JSON arrives 2.1 s later (4.63 s instead of 2.56 s), and all images 3.4 s
     later. Cold only; when warm, Privy's chunks are cached.
  3. **Round trips to Germany in series, and LINE verified on every open.** Verified: 5 serial round
     trips of about 265 ms in a warm open, plus 0.3–0.6 s for the verify call. This is most of the warm
     2.5–3 s.
  4. **Code preloaded while the images download.** Verified in the waterfall.
     - `StatBoard.preload()` runs at module load (sticker-board/StickerBoard.tsx:95). It pulls viem
       through `stat-board/addresses.ts:2`: `getAddress`, ccip, parseAbi and more, about 60 KB gzip.
     - The idle preloads (StickerDetail, Giving with viem, Explore) come to about 80–100 KB gzip. Safari
       has no `requestIdleCallback`, so they fire on a 1 s timer after the board mounts
       (ui/lazyWithPreload.ts:52), in the middle of the image downloads.
     - Cost: about 0.2–0.3 s of a cold open.
  5. **JSON payloads.** Verified: 114 KB for the board and 58 KB for tickets (raw), and the outline paths
     are 87–100% of that. With gzip that is 33 + 20 KB; without outlines, about 15 KB raw. Whether
     HAProxy compresses JSON is unknown. Small.
  6. **Fonts.** Verified: not on the critical path (async CSS, `display=swap`). The Google Fonts CSS is
     88 KB gzip and 343 KB raw, with 368 `@font-face` rules (242 of them Zen Kaku Gothic New, 123 Dela
     Gothic One). Mona Sans is 96 KB. They cost bandwidth and one style pass on the phone. Small.
  7. **Entry chunk (536 KB raw, 176 KB gzip).** Verified. It carries the Gratitude Mini-game (79 KB raw,
     statically imported by StickerBoard.tsx:28), the whole drawing screen (65 KB raw; App.tsx:7 mounts
     DrawingScreen at boot) and Phosphor (67 KB raw). CPU is small at 4x (entry eval about 90 ms); the
     bytes cost about 0.05–0.1 s cold.
- **Fix (priority order):**
  1. **F1: WebP sticker images made on the server.** Size M.
     - At seal, the API writes WebP derivatives next to the PNGs: sticker q85 with alpha, masks lossless.
       The board uses them, and a board-size rendition (≈440 px) is optional.
     - Measured on one sticker: png 202 KB becomes 27 KB (AVIF: 17 KB); mask 19 KB becomes 3.9 KB; spec
       23 KB becomes 7 KB; rim 16 KB becomes 5 KB. That is 260 KB down to 43 KB per sticker (−83%).
     - It has to be the server: WebKit can't encode WebP from a canvas (known platform limit), so the
       sealing worker on an iPhone can't make them.
     - PNGs stay the canonical files for the content hash and the NFT.
     - Files: apps/api/src/stickers/seal.ts, services/imageStore.ts (sharp), shapes.ts (URLs),
       frontend stickers/stickerUrls.ts, StickerFigure.tsx, plus a one-off backfill on the box.
  2. **F2: start Privy after the board settles.** Size S–M.
     - Mount `PrivySignIn` once the board's stickers are decoded and the first-load chips are done
       (about 3 s).
     - Mount it at once when a gift link opens (`giftClaimToken`), or when `waitForSmartWallet()` is
       first called (seal, give, receive).
     - Files: main.tsx:55, identity/PrivySignIn.tsx, identity/smartWallet.ts (a start trigger),
       StickerBoard.tsx (a "board complete" signal).
     - Measured locally: 8.8 s becomes 5.4 s cold. Keep the SDK's retry-loop guard in mind.
  3. **F3: shorten the chain.**
     - a) **Cookie first.** Size M. Give the session cookie a Max-Age. At boot, request `/api/me`, the
       board and tickets with the cookie in parallel with `liff.init`. After `liff.init`, check that
       LINE's `sub` matches the session's user; POST /api/session only when the cookie is missing or
       doesn't match. This saves the verify (0.3–0.6 s) and overlaps LIFF with the board request
       (about 0.3–0.6 s).
       Files: apps/api/src/session.ts, routes/session.ts (return a check value for the sub),
       api/SessionGate.tsx, api/ApiRoot.tsx, line/LineGate.tsx.
     - b) **Don't wait for `getProfile`.** Size S. Use `liff.getDecodedIDToken()` for the name and
       picture and fetch the profile afterwards (line/liff.ts:60). Saves one LINE round trip.
     - c) **Verify LINE ID tokens locally** against LINE's JWKS (`/oauth2/v2.1/certs`, ES256; the LIFF
       SDK itself does this), cached on the server. Size S–M. This speeds up first sign-ins and Privy's
       `/v1/auth` exchange on the box.
       Files: apps/api/src/services/lineVerifier.ts and the sticker-auth server.
     - d) Optional: LIFF's pluggable core without the i18n module drops the two XLT fetches that
       `liff.init` waits for. But main.tsx:24 uses `liff.i18n.setLang`. Size M, small gain; last.
  4. **F4: show the last sticker board at once.** Size M.
     - Keep the last board JSON (no outlines) in localStorage for the signed-in user.
     - Draw it as soon as JS runs; its images come from the immutable HTTP cache. Swap in the fresh board
       when it lands.
     - With F3a, a warm open reaches a full board at about 1.0–1.3 s instead of about 2.5–3 s.
     - Files: StickerBoard.tsx (`useApiQuery("sticker-board")`), api/useApiQuery.ts (initial data), a new
       small board cache module.
  5. **F5: nothing else downloads while the board assembles.** Size S.
     - Gate `StatBoard.preload()` (StickerBoard.tsx:95), `usePreloadWhenIdle` (StickerBoard.tsx:250,
       App.tsx:56) and the idle mount of the stat board (StickerBoard.tsx:825) on "board complete" plus a
       quiet second.
     - Drop viem from addresses.ts (a small checksum helper, or a lazy import).
  6. **F6: smaller JSON.** Size S–M. Leave `outline` out of GET /api/sticker-boards/:id and /api/tickets;
     the sticker detail and the Transfer Trail load it. Confirm HAProxy gzips `application/json`. The
     types derive from Drizzle through drizzle-zod, so change the schema, not a copy.
  7. **F7: trim the entry chunk.** Size M. Lazy-load the Gratitude Mini-game, and load the drawing screen
     after the board is complete, keeping its restore of a sheet in progress.
  8. **F8: fonts.** Size S. Request Zen Kaku Gothic New only when the language is Japanese: English opens
     skip 242 `@font-face` rules.
  9. **F9 (infrastructure, decision below).** Size M. Put a CDN with a Tokyo point of presence in front
     of `/assets/` and `/api/images/`. Measured round trips from here: Germany 265 ms, Hetzner Singapore
     125 ms; a Tokyo CDN edge would be about 10–30 ms (not measured here).
  10. **F10: measure on the phone.** Size S. Add boot milestones to the performance recorder: LIFF
      ready, session, board JSON, first sticker decoded, all stickers. Add a frame summary for the 5 s
      after the board is complete. Then ad0ll can copy a real LINE-on-iPhone report. Today the recorder
      keeps its recording in memory and copies it to the clipboard; there are no saved reports in
      localStorage (only the on/off setting), the API or /tmp.
- **Expected results:** warm opens go from about 2.5–3 s to about 1.0–1.3 s (F3a + F4). Cold opens go
  from about 5–8 s to about 2.5–3 s (F1 + F2 + F3 + F5).
- **Impeccable:** `/impeccable optimize` owns F1–F10. `/impeccable polish` does the final pass.
- **Size:** F1 M · F2 S–M · F3a M · F3b S · F3c S–M · F3d M · F4 M · F5 S · F6 S–M · F7 M · F8 S · F9 M · F10 S.

## Item 2: the foil on first load is slow and doesn't look good

- **Item:** "The foil loading when you first load the board is very slow… a little bit of lag on the foil
  gloss that displays in the motion when you first load the board… it doesn't look very good."
- **Now:**
  - Steady state is fine in Chromium: 0 frames over 20 ms in 5 s at 4x CPU, worst 12 ms (steady/).
  - Around the load, it is not.
    - Cold, with Privy: the main thread is blocked right as the stickers finish, by Privy's
      embedded-wallet iframe script (292 ms) and its `main.js` (761 ms) at 7.0–8.6 s.
    - Warm: a 109 ms Privy block lands 0.2 s after the stickers appear.
    - Trace: runs/PT-250ms-12M-4x-{cold,warm}.trace.json.
  - Each sticker's four images arrive separately over about 3 s. The foil (masked by `--m`) and the
    resin highlights (masked by `--mt`/`--mb`) stay invisible until their mask arrives, then pop in, one
    sticker at a time.
  - Frames: foil/cr-foil-0..5.png, and foil/cr-foil-zoom-sheet.png (500 ms apart, 2x zoom).
- **Cause (ranked):**
  1. **Main-thread work landing on the board's first seconds.** Verified in Chromium.
     - Privy's SDK and its iframe: in WebKit on iOS, a cross-origin iframe shares the page's main thread
       (suspected).
     - The idle preloads and the stat board's mount on Safari's 1 s timer. The cork back is a 390 × 2001
       layer.
     - The motions that JS starts (sheen sweeps, stick, artist chip pop-ins) stutter.
  2. **Uncoordinated arrival of each sticker's layers.** Verified in code: StickerFigure.tsx renders the
     foil, image and resin as soon as each URL loads. The gloss "loads in" piece by piece.
  3. **The look itself.** Verified in frames.
     - The band reads as a flat, soft rainbow outline: six broad hue blocks that crawl on a 7 s loop,
       with no metallic contrast and no sparkle.
     - The 9-copy mask dilation (sticker-foil.css:24-44) gives a soft, slightly lumpy outer edge and an
       uneven width (0.71x on the diagonals).
     - The sticker's cast shadow draws a dark groove between the white edge and the band, so the foil
       reads as a ring behind the sticker, not as its edge.
     - The white glint now sweeps only on a tilt (light.ts:48, commit efae4ef). Tilt needs motion
       permission on iOS, so most phones never see a glint. DESIGN.md still says "a white glint sweeps it
       every 4.2s, staggered per sticker."
  4. **iOS compositing cost.** Suspected; can't be seen here.
     - Each foil sticker is a 9-layer mask over an animated layer. Every sticker also carries four masked
       resin layers, with the specular swaying.
     - Chromium, verified: 107 layers, 77 of them drawing, 45 device megapixels at 3x. That includes a
       full-screen `.board-draw` layer made by overlap and the 2001 px cork.
     - ad0ll reverted an earlier "hold still" change (d758892) because that cost was never measured. So
       measure on the device before trading motion: Safari Web Inspector, Timelines → Layers and
       Rendering Frames, on the page opened in iOS Safari after LINE Login.
- **Fix (priority order):**
  1. F2 and F5 above: nothing heavy runs in the board's first seconds. Sizes S–M.
  2. **G1: reveal each sticker whole.** Size S–M.
     - Decode its image, mask, spec and rim together (`Image.decode()`) before its material shows.
     - Start the foil flow and the specular sway once the board is complete, at a phase already in
       motion (negative delay, as now), so nothing starts late and jumps.
     - Files: StickerFigure.tsx, PlacedSticker.tsx, StickerBoard.tsx. The transitions lane owns what the
       reveal looks like.
  3. **G2: bake the foil band's mask.** Size M.
     - One mask image of the silhouette dilated by a distance transform (the sticker image covers the
       inside), instead of nine mask copies.
     - Crisp, even width; one mask per foil sticker on the compositor.
     - Made on the server from mask.png (sharp), with a backfill. The band width scales with the sticker,
       which is a small departure from "5px on the board".
     - Files: apps/api (images), stickers/StickerFoil.tsx, sticker-foil.css.
  4. **G3: bring back the timed glint** that DESIGN.md specifies: every 4.2 s, staggered by No., as a
     compositor transform animation. Keep the tilt sweep as an extra. Size S. Decision below.
  5. **G4: make the band read as foil, within DESIGN.md.** Size M.
     - Keep the six bands, the 96 px period and the 7 s flow.
     - Add a fine static diffraction grating (2–3 px diagonal hairlines at low alpha) that the bands flow
       under, so they glitter instead of crawling.
     - Cast the sticker's shadow from the band's outer edge, so the foil sits on the sticker and the dark
       groove goes.
     - A crisp outer edge (G2).
     - Motion stays on transform and opacity; the foil holds still under reduced motion.
- **Impeccable:** `/impeccable optimize` for G1 and the device measurement. `/impeccable animate` for G2–G4
  (the foil's material and motion). Then `/impeccable polish`.
- **Size:** G1 S–M · G2 M · G3 S · G4 M.

## Decisions for ad0ll

1. **Session cookie lifetime and cookie-first boot (F3a).**
   - A 30-day signed cookie, with a LINE sub check after `liff.init`, means opens skip LINE's verify.
   - Recommend: yes.
2. **When Privy starts (F2).**
   - After the board settles, or at once for a gift link, seal, give or receive. The chat menu switch
     and the Sui wallet setup then happen a few seconds later.
   - Recommend: yes.
3. **Image format (F1).**
   - WebP (iOS 14+) or AVIF (iOS 16+; about 40% smaller than WebP, slower to encode).
   - Recommend: WebP now; PNG stays canonical.
4. **Infrastructure (F9).**
   - A CDN in Japan for static files and sticker images needs a real domain instead of sslip.io. A box
     in Singapore halves the round trip, but the data lives only on the box and there are no backups.
   - Recommend: a CDN once there is a domain; no box move.
5. **Foil glint (G3).**
   - Restore DESIGN.md's timed glint, or keep the tilt-only glint from efae4ef and change DESIGN.md.
   - Recommend: restore it. Most iPhones never grant motion permission, so tilt-only means no glint.
6. **Last board from storage (F4).**
   - It can be up to one refresh out of date (about 0.5 s).
   - Recommend: yes.

## Overlaps

- **Transitions lane.** They own how the board looks while it loads and assembles. F4 (the last board at
  once) and G1 (the whole-sticker reveal) change what is on screen during that time; I own when it gets
  there.
- **i18n.** PR #10 (`i18n/handoff`, draft) moves LineGate and SessionGate text into the catalog, and
  F3a/F3b touch those files. main.tsx:24's `liff.i18n.setLang` limits F3d.
- **Privy and wallets.** F2 moves MakeSuiWallet, SponsorshipCheck and the returning chat menu later.
- **Merged perf branches.** perf/seal-worker (0e21a72) and perf/zipper-pull (fa20a7a) are merged and are
  not touched. The seal worker can't make WebP on iOS, hence F1 on the server.

## Side findings (other lanes)

- **Sealing is broken under LIFF Mock at 42d698a.** Verified. Since 7abcd9f Privy is off under Mock, so
  `waitForSmartWallet()` (identity/smartWallet.ts, 15 s) fails: "Your sticker wallet is taking too long
  to get ready". The mock chain also never mints, so api/smartWalletApi.ts:11 throws "could not be added
  to your wallet yet" after the server has already saved the sticker. Lanes told to seal on the dev
  server can't. I seeded with a scratch build that stubs both checks.
- **Stickers that arrive together pile up.** Verified. Six unplaced stickers all landed on the first spot
  (0.5, 0.42), stacked, because `placeUnplaced` fell back to the same spot. I spread them through the API
  for the frames.
- **Playwright's WebKit on macOS draws the cork back, mirrored, over the board.** Seen here only; iPhone
  reports don't show it. Probably a headless compositing artifact.
