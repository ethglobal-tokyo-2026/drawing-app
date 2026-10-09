# Deployment

One box serves the app behind HAProxy, with Fastly in front of it at `DEPLOY_URL` (CDN, below): `/api/` goes to the REST API, `/v1/auth/` and `/.well-known/jwks.json` to the LINE → Privy auth server, and everything else to the web app. Run the scripts from the repository root.

## Settings

- `deploy/.env`, gitignored (copy `deploy/.env.example`): the box's SSH login (`DEPLOY_TARGET`), the API's secrets (the Sui server key, Shinami's access key, Privy's app secret, the Messaging API channel's secret and Fastly's API token), the operator's LINE user ID, and `SUI_DEPLOYER_PRIVATE_KEY`, which only `publish-sui.mjs` reads. `DEPLOY_ENV_FILE` points the deploy scripts and `publish-sui.mjs` at another gitignored file.
- `deploy/drawing-api.env` and `deploy/sticker-auth.env`: the API's and the auth server's settings. They're tracked, so no secret goes in them, and both deploy scripts refuse a `drawing-api.env` that mentions `DEV_SIGN_IN`. `drawing-api.env` also holds the IDs of the published stickers package, which `publish-sui.mjs` prints, and `deploy-api.sh` stops while one is blank.
- The box makes the auth server's signing key and the API's session secret itself, and they never leave it.

## Main only

`deploy.sh` and `deploy-api.sh` build whatever is checked out, so they refuse to deploy unless HEAD is the commit `main` points to and nothing is uncommitted, untracked files included. The contracts' submodules don't count: nothing the deploy builds reads them. Deploy from a clean checkout of main. In an emergency, `DEPLOY_ANY_CHECKOUT=on ./deploy/deploy.sh` deploys the checkout as it is. `deploy-api.sh --preflight-only` publishes nothing, so it runs from any checkout.

## `./deploy/deploy.sh`

Publishes everything, in order:

1. `deploy-api.sh --preflight-only` checks the stickers package's IDs in `drawing-api.env` and the chain settings in `deploy/.env`.
2. Builds the frontend, with the developer slip on, and the auth server.
3. `deploy-api.sh` publishes the API (below).
4. `install-node.sh` puts the pinned Node on the box for the auth server.
5. Syncs the site and the auth server, makes the signing key if it's missing, and restarts `sticker-board` and `sticker-auth` when their files changed.
6. Checks that the box serves the build, purges the page Fastly keeps (CDN, below), then checks that `DEPLOY_URL` serves the build and both serve the auth server's JWKS.

## CDN

Fastly serves all of stickeroo.art. People connect to the Fastly location nearest them, which answers the build's files, the public sticker images and the page from its cache and passes the rest to the box, so the app loads everything from its own origin.

- The service is "Croquis's website" (`nKXNm4mB3I2iYnrEbsobML`), with stickeroo.art and www.stickeroo.art on a Fastly-managed Let's Encrypt certificate in the TLS configuration "HTTP/3 & TLS v1.3", the one without 0-RTT, which can replay a request. At Namecheap, stickeroo.art has that configuration's A and AAAA records and www its CNAME; the `_acme-challenge` CNAMEs stay for Fastly's renewals.
- Its backend is the box as `origin.stickeroo.art`, an A record with its own certificate from acme.sh in HAProxy, sent Host stickeroo.art so the box's usual routes apply, through one shield in Frankfurt (`frankfurt-de`) beside the box, as Fastly recommends.
- `croquis-recv`: URL purges need the API key and skip the rest; then the cap's pause (below); www redirects to stickeroo.art; build files drop cookies and queries; sticker images drop queries, so purging an image's URL clears its only copy; `/api/` and `/v1/`, the API, sign-in and the server log but not `/api/images/`, are passed, never cached, through the Frankfurt shield, which keeps connections to the box open where a far location rarely has one. HTTP/3 is offered.
- `croquis-hash`: every app route (`/`, `/g/…`, `/draw`, `/explore`) shares one cache entry, so no gift claim token or LIFF query becomes a cache key.
- `croquis-fetch`: build files and public sticker images keep the year their `Cache-Control` gives; an 18+ drawing is private, which Fastly passes, and no image error is kept; the page and the public folder's files are kept a day under surrogate key `page`, which `deploy.sh` purges after each deploy, twice, a moment apart, in case a location refilled from the shield before the purge reached it; other errors are kept 10 seconds. Each time is also set in `Surrogate-Control`, since Fastly keeps anything without a max-age for an hour.
- `croquis-pass`: a passed request waits up to 130 seconds for the box, since receiving a gift waits on Sui; Fastly's default is 15. `croquis-error` answers the cap's pause (607) and the www redirect (601).
- The CDN cap keeps Fastly free. Every `CDN_CAP_EVERY_MS` the API (`apps/api/src/cdn/cdnCap.ts`) adds up the service's requests and bytes since the month began, in UTC as Fastly bills, from Fastly's hourly stats, which trail by a few minutes. At `CDN_WARN_SHARE` of the free allowance it tells the operator (`OPERATOR_LINE_USER_ID`) in LINE, once a month. At `CDN_PAUSE_SHARE` it sets `cap`, in the service's `croquis_cdn` edge dictionary, to the month, such as `2026-10`, and Fastly answers every request with `croquis-error`'s 503 page, "paused until next month", in Japanese and English, except Let's Encrypt's `/.well-known/acme-challenge/`, `/croquis-demo/`, where the QR code sent with the Kyoto Seika application points, and `/demo/`, which forwards there; once a later month starts, the API sets `cap` back to `serve`. `keep` serves past the allowance, and Fastly bills; `stop` pauses by hand; the API changes neither: `curl -X PUT -H "Fastly-Key: $FASTLY_API_TOKEN" https://api.fastly.com/service/nKXNm4mB3I2iYnrEbsobML/dictionary/i2D4jijJ2M9v9JlGENCYW3/item/cap -d item_value=keep`. A paused request still counts as a request. The API logs `cdn.cap.checked` with the month's usage at boot, then `cdn.cap.warned`, `cdn.cap.paused`, `cdn.cap.lifted`, `cdn.cap.warn_failed` and `cdn.cap.check_failed`. It counts this service alone. It reminds the operator in LINE on each of `TOKEN_REMINDER_DAYS` before `FASTLY_API_TOKEN` expires, and once a day while Fastly refuses it, since without a working token it can't pause the site.
- Fastly's spend alert (Account > Billing > Spend alerts in its control panel) emails the account's superusers when a month's charges reach 80% and 100% of the amount set there; Fastly checks once a day.
- Marking a sticker 18+ after its seal (`POST /api/stickers/:stickerId/nsfw`) makes its drawing private once no sticker that isn't 18+ shows it: the box then serves the files that show it (its PNG, its WebP and the flat sheet) only to the NSFW opt-in, and the API purges them by URL through Fastly's API with `FASTLY_API_TOKEN`, then purges them again a moment later, since an edge the first purge reached can refill from a shield it hadn't reached yet (https://www.fastly.com/documentation/guides/full-site-delivery/purging/purging-a-url/). While another sticker that isn't 18+ shows the drawing, or without Fastly's settings, a mark skips the purge, logs `cdn.purge.skipped` and answers `cdnPurged: false`. The purge stays due until it's done (`stickers.cdn_purge_due_at`): one that failed, or that a restart cut off, is retried by the CDN purge sweep at boot and every `CDN_PURGE_SWEEP_EVERY_MS` (`apps/api/src/stickers/nsfwDrawing.ts`), which logs `cdn.purge.retried` for each drawing, `purged` or `still_due`. The API logs `cdn.purge.completed` with each URL and Fastly's purge ID, `cdn.purge.retrying`, and `cdn.purge.failed` with each URL a purge gave up on; a hand purge clears one at once: `curl -X POST -H "Fastly-Key: $FASTLY_API_TOKEN" https://api.fastly.com/purge/stickeroo.art/api/images/<file>`.
- `curl -X POST -H "Fastly-Key: $FASTLY_API_TOKEN" https://api.fastly.com/service/nKXNm4mB3I2iYnrEbsobML/purge/page` clears the cached page; `…/purge_all` clears everything. A new version takes a minute or two to reach every location, and a request sent with `Fastly-Debug: 1` gets `Fastly-Debug-Path`, the locations it went through.

## `./deploy/deploy-api.sh`

Publishes the API alone; `--preflight-only` stops after checking the stickers package's IDs and the chain settings. It builds the API, installs `better-sqlite3` and `sharp` for the pinned Node on the box, and syncs the migrations, `drawing-api.env` and `deploy/line/menus.json`. It makes the session secret if it's missing, and writes the box's mode-600 `chain.env` from `deploy/.env`: the Sui server key, Shinami's access key, Privy's app ID and secret, the Messaging API channel's ID and secret and Fastly's API token, all required, and the operator's LINE user ID when it's set. Nothing else goes in it, so a setting the API stopped reading leaves the box with the next deploy. It restarts `drawing-api` when anything changed, then checks `/api/me` on the box and at `DEPLOY_URL`.

The deployment tests use local temporary files and fake transport/service commands, never SSH or a
running server: `deployApi.test.ts` runs `deploy-api.sh`, and `installChainEnv.test.ts` the chain
settings' installer. `pnpm check` runs both:

```sh
pnpm --filter @drawing-app/api exec vitest run scripts/
```

## `node deploy/publish-sui.mjs`

Publishes the stickers package (`contracts/sui-sticker-contract/stickers`) to the Sui network that `drawing-api.env`'s `SUI_NETWORK` names, names the API's server in it and creates the stickers' Display. It builds with the `sui` CLI, and reads from `deploy/.env`:

- `SUI_DEPLOYER_PRIVATE_KEY`: publishes, and keeps the package's `AdminCap`, `UpgradeCap` and `DisplayCap` afterwards. It never goes on the box.
- `SUI_SERVER_PRIVATE_KEY`: the API's key. Its address becomes the one that mints stickers and claims or returns gifts.
- `SHINAMI_ACCESS_KEY`, optional: Shinami Gas Station pays the gas when it takes the transaction. Otherwise the deployer pays.

Without `--publish` it only simulates: it builds the package, simulates the publish from a throwaway address when `SUI_DEPLOYER_PRIVATE_KEY` isn't set, and prints the cost, what the publish creates, who would pay and the Display's fields. Nothing is sent.

```sh
node deploy/publish-sui.mjs --image-host <the API's public image URL>
node deploy/publish-sui.mjs --image-host <the API's public image URL> --publish
```

`--image-host` is the https host that Display joins each sticker's image file name to: the API's `IMAGE_BASE_URL`. Display names only public images, an NSFW sticker's veiled one included. With `--publish` it sends two transactions, because a transaction can't call the package it publishes: the publish, then `set_server` and `create_display`, which sends the `DisplayCap` to the deployer. When the second fails, the package is published but unusable by the API; run again for a fresh one.

It prints the package's IDs as `KEY=value` lines: `SUI_STICKER_PACKAGE`, `SUI_STICKER_REGISTRY`, `SUI_SERVER_CONFIG` and `SUI_GIFT_ESCROW`. Paste them into `deploy/drawing-api.env` and `apps/api/.env.example`, then run `./deploy/deploy.sh`.

To move the sticker images to another host, run `node deploy/publish-sui.mjs --set-image-host <url> [--publish]`. It sets Display's `image_url` with the deployer's `DisplayCap` (`display_registry::set`), and every sticker follows. It reads `SUI_STICKER_PACKAGE` from `drawing-api.env`.

## LINE: chat menus and greeting

- `./deploy/line/create-returning-menu.sh en|ja plain|3|2|1|reserve|none`, or `en|ja kyoto-seika-10` … `kyoto-seika-1`, `kyoto-seika-reserve` or `kyoto-seika-none` for the 12 menus per language that Kyoto Seika Manga Expression Practice Mode links, or `default [--set-default]`, makes one chat menu in LINE and records its ID in `deploy/line/menus.json`. Commit that and deploy the API, which links each person's menu from it. `--print` prints the menu without calling LINE. It needs `jq`, and the Messaging API channel's ID and secret in `deploy/.env`.
- `pnpm --filter frontend chat-menus` renders the menus' images in `deploy/line/images/` from `returning-menu.html`. LINE can't replace a menu's image, so a new image means a new menu; the old one stays in LINE until it's deleted.
- `deploy/line/greeting.md`: the Official account's greeting and auto-reply settings, set by hand in LINE Official Account Manager.

## On the box

| Unit            | Serves                                             | Its folder                                                                                                                                                                    |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawing-api`   | The REST API, on 127.0.0.1:8788                    | `/srv/drawing-api`: the database in `data/`, the sticker images in `images/`, `server/`, `drizzle/`, `api.env`, `line-menus.json`, and mode-600 `secrets.env` and `chain.env` |
| `sticker-auth`  | The LINE → Privy auth server, on 127.0.0.1:8787    | `/srv/sticker-auth`: `server/`, `auth.env` and `signing-key.pem`                                                                                                              |
| `sticker-board` | The web app, through `serve.py`, on 127.0.0.1:3003 | `/srv/sticker-board`: `serve.py` and the build in `site/`                                                                                                                     |

Each unit's file is `deploy/<unit>.service`, which the deploy scripts install in `/etc/systemd/system/`. `drawing-api` and `sticker-auth` run on the Node that the root `package.json` pins, under `/usr/local/lib/nodejs/`. Their logs: `journalctl -u <unit>` on the box, or `/api/logs` for both.

## Domain

- `stickeroo.art` is at Namecheap, on its own DNS: `@` has the A and AAAA records of Fastly's TLS configuration, `www` a CNAME to Fastly, `origin` an A record to the box, and `_acme-challenge` and `_acme-challenge.www` CNAMEs to Fastly, which renews the site's certificate through them (CDN, above). Namecheap's API `setHosts` replaces every record at once, so a change sends them all, with `EmailType=FWD`.
- The box serves other sites through the same HAProxy, in `/etc/haproxy/haproxy.cfg`; Croquis's part routes `stickeroo.art` by host, the Host Fastly sends; Fastly redirects `www`.
- acme.sh in `bawler`'s home issues `origin.stickeroo.art`'s certificate, the one Fastly checks, answering Let's Encrypt on port 8888 behind HAProxy's `/.well-known/acme-challenge/` route, and its `haproxy` deploy hook installs each renewal in `/etc/haproxy/certs/`.
- LINE opens the LIFF app's endpoint URL, set in the Login channel's LIFF tab, and Privy reads the auth server's keys from the JWKS URL in its dashboard; both name the domain.
