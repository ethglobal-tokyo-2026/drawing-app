# Marking a sticker 18+, by anyone, at seal or after: plan

Spec: `docs/superpowers/specs/2026-10-07-mark-18-plus-anytime-design.md` (approved). Two lanes, built in
parallel against the contract below. Each works test first, one commit per task, and runs `pnpm check`
before reporting. No AI attribution lines. AGENTS.MD's NSFW entries wait for the owner's wording sign-off.

## Contract

| Where  | What                                                                                                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seal   | `POST /api/stickers` takes `nsfw: true` from anyone. Sealing stops refusing it with `nsfw_not_opted_in`; giving and receiving still refuse an NSFW sticker to anyone without the NSFW opt-in.                    |
| Route  | `POST /api/stickers/:stickerId/nsfw`, no body → 200 `{ sticker, cdnPurged }`: `sticker` as `GET /api/stickers/:stickerId` answers it for the caller; `cdnPurged` false when the CDN purge was skipped or failed. |
| Errors | 404 `sticker_not_found`; 403 `not_original_artist` (anyone but its Original Artist); 409 `already_nsfw`. Both new codes join `ErrorBody`.                                                                        |
| Client | `ApiClient.markStickerNsfw(stickerId): Promise<{ sticker: Sticker; cdnPurged: boolean }>`, `httpApi` posts it and throws a refusal on a non-2xx, as `setNsfwOptIn` does.                                         |
| Fastly | `FASTLY_PURGE_TOKEN`, a token that can only purge Croquis's service, in `deploy/.env` → the box's `chain.env`. Absent: the purge is skipped and logged.                                                          |

## Lane 1: server (`apps/api`, `deploy/`)

1. **Seal for everyone.** Drop the seal's opt-in check, and turn its tests around: an NSFW seal without the opt-in seals, and the sealer then sees it blurred.
2. **The route.**
   - Order: the Original Artist and not-yet-marked checks, then `saveVeiled`, then one guarded `UPDATE … SET nsfw = 1, veiled_hash = ? WHERE id = ? AND nsfw = 0`. Zero changed rows answers 409.
   - The `stickers_veiled` CHECK holds, and no migration is needed.
   - A gift on its way is allowed; receiving already re-reads the mark.
3. **The CDN purge.**
   - Purge every CDN URL that shows the drawing itself (find which files in the image code: not the mask, spec or rim), with `POST https://api.fastly.com/purge/<host>/<path>` and `Fastly-Key`.
   - Log each purge with the ID Fastly answers.
   - Retry a failure in-process a few times with backoff, under a timeout. Then log `cdn.purge.failed` with the URLs, and answer `cdnPurged: false`.
   - Fastly's service answers a `PURGE` request with 404, so the API is the only way.
4. **Deploy.** `deploy-api.sh` writes `FASTLY_PURGE_TOKEN` into `chain.env` when `deploy/.env` has it, and the runbook (`deploy/README.md`) says how to make the token (purge-only, on the one service).
5. **Docs.** The sticker contract's README says the Sui object keeps the mark it was sealed with, and the database's mark is the current one.

## Lane 2: app (`apps/frontend`)

1. **The drawing screen's 18+ switch shows for everyone,** off by default. For someone without the NSFW opt-in, its words say they'll see it blurred too: a catalog string with its `/** where */`.
2. **Mark 18+ on the detail.**
   - Who sees it: the Original Artist, on their own sticker that isn't marked yet.
   - The button: tomato label stock, never a key.
   - The confirm, before it's marked: what marking does; that it can't be undone; that anyone who has already seen the sticker may keep a copy.
   - On success: forget the kept board and the board query, as the NSFW opt-in switch does, and show the detail again from the answer. A refusal shows the error line with its reason.
3. **Docs.**
   - PRODUCT.md's NSFW lines: anyone can mark at seal, the Original Artist after.
   - DESIGN.md's 18+ switch and the detail's Mark 18+.

Check both in Chromium and WebKit, in English and Japanese, before reporting (dev server per the lane's brief).
