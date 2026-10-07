# Marking a sticker 18+, by anyone, at seal or after

Approved 2026-10-07. Nothing is built yet. Your request: "let anyone optionally (deselected by
default) choose to say an image is 18+ before or after the seal."

Today only someone with the NSFW opt-in sees the 18+ switch on the drawing screen, the seal route refuses
the mark from anyone else (`nsfw_not_opted_in`), and a sealed sticker's mark never changes, on Croquis or on
Sui.

## Decisions

### Decided

1. **At seal, for everyone.** The 18+ switch shows for everyone, off by default; the seal route stops
   asking for the opt-in. Seeing and receiving NSFW stickers stay behind the opt-in.
2. **Someone without the opt-in who marks their sticker sees it blurred**, as the rule is today ("even
   their own"): board, tray, detail, Explore, and no timelapse. The switch's label says so before they seal.
   They can still give it; whoever receives it needs the opt-in.
3. **After seal: the Original Artist only,** from the sticker's detail. A holder marking someone else's
   work would blur it for everyone, which invites griefing.
4. **One-way.** Unmarking would make the drawing public again, and every public moment is cached by the
   CDN and browsers for a year; a mark can't call those copies back.
5. **Off chain first.** The Sui object keeps the mark it was sealed with. Changing it needs a package
   upgrade, which this repo has no tooling for, and splitting the API's one package ID into the original
   (for types) and the latest (for calls); the wrong one derives wrong object IDs without an error. The
   database's mark is the current one; the docs say so.
6. **The CDN copies go when it's marked.** The box purges the drawing's three files from Fastly as part of
   the mark, through a Fastly API token that can only purge (`purge_select`) on Croquis's service, kept in
   the box's env like its other secrets. Wallets that show the Sui object's image then get the box's 403:
   a broken image rather than the drawing.

### Later, not now

- The Sui object follows the mark: either Display's image link points at a server route that redirects
  to the sticker's current image (no upgrade; check that Display's templates take the object's `{id}`), or
  a compatible upgrade records the mark on chain. Both after upgrade tooling exists.

## What a mark after seal can't undo

A sticker marked after sealing was public until then. Browsers that showed it keep it (`immutable`, a
year), and its URL can be rebuilt from the content hash on Sui. A purge clears Fastly's copies, not a
browser's. The mark means "stop showing it from now
on", not "never shown". The confirmation says so in plain words before the artist marks it.

## Server

- `POST /api/stickers/:stickerId/nsfw`: refused for anyone but the Original Artist, and for a sticker
  already marked.
  - Makes the veil first (`images.saveVeiled`, which never overwrites a file).
  - Then one guarded update, `nsfw = 1, veiled_hash = ?` where `nsfw = 0`, which keeps the `stickers_veiled`
    CHECK; no migration.
  - Then a Fastly purge of each file's URL (`POST https://api.fastly.com/purge/<host>/<path>`), logged
    with the purge ID Fastly answers; a failed one is reported in the response and the log, and retried.
    Fastly's service answers a `PURGE` request with 404 (`croquis-recv` passes only GET and HEAD), so the
    API is the only way.
- A gift on its way: allowed. Receiving re-reads the mark and refuses anyone without the opt-in.
- Identical drawings share their files by content hash, so marking one hides its twin's drawing too.

## App

- Drawing screen: the 18+ switch for everyone; its label for someone without the opt-in says they'll see it
  blurred too.
- Sticker detail, your own sticker, not yet marked: "Mark 18+", tomato label stock since it can't be undone,
  behind a confirm that says what it does and what it can't undo.
- On success: forget the kept board and the board query, as the opt-in switch does, and reload the detail.

## Docs and tests that change

- AGENTS.MD's NSFW sticker and NSFW opt-in entries (vocabulary: needs your approval), PRODUCT.md, DESIGN.md's
  18+ switch, the contract README, `deploy/README.md`.
- Tests that expect a 403 for marking without the opt-in, the drawing screen hiding the switch, and the
  mark never changing.

## Build order

1. At seal for everyone: the switch, the route, strings and tests.
2. The mark after seal: route, confirm, CDN invalidation, the app's caches.
3. Docs.
