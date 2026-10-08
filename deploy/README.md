# Deployment

One box serves the app behind HAProxy at `DEPLOY_URL`: `/api/` goes to the REST API, `/v1/auth/` and `/.well-known/jwks.json` to the LINE → Privy auth server, and everything else to the web app. Run the scripts from the repository root.

## Settings

- `deploy/.env`, gitignored (copy `deploy/.env.example`): the box's SSH login (`DEPLOY_TARGET`), the API's secrets (the Sui server key, Shinami's access key, Privy's app secret, the Messaging API channel's secret and Fastly's API token), and `SUI_DEPLOYER_PRIVATE_KEY`, which only `publish-sui.mjs` reads. `DEPLOY_ENV_FILE` points the deploy scripts and `publish-sui.mjs` at another gitignored file.
- `deploy/drawing-api.env` and `deploy/sticker-auth.env`: the API's and the auth server's settings. They're tracked, so no secret goes in them, and both deploy scripts refuse a `drawing-api.env` that mentions `DEV_SIGN_IN`. `drawing-api.env` also holds the IDs of the published stickers package, which `publish-sui.mjs` prints, and `deploy-api.sh` stops while one is blank.
- The box makes the auth server's signing key and the API's session secret itself, and they never leave it.

## Main only

`deploy.sh` and `deploy-api.sh` build whatever is checked out, so they refuse to deploy unless HEAD is the commit `main` points to and nothing is uncommitted, untracked files included. The contracts' submodules don't count: nothing the deploy builds reads them. Deploy from a clean checkout of main. In an emergency, `DEPLOY_ANY_CHECKOUT=on ./deploy/deploy.sh` deploys the checkout as it is. `deploy-api.sh --preflight-only` publishes nothing, so it runs from any checkout.

## `./deploy/deploy.sh`

Publishes everything, in order:

1. `deploy-api.sh --preflight-only` checks the stickers package's IDs in `drawing-api.env` and the chain settings in `deploy/.env`.
2. Builds the frontend, with the developer slip on and its hashed files on `CDN_ORIGIN` when set, and the auth server.
3. `deploy-api.sh` publishes the API (below).
4. `install-node.sh` puts the pinned Node on the box for the auth server.
5. Syncs the site and the auth server, makes the signing key if it's missing, and restarts `sticker-board` and `sticker-auth` when their files changed.
6. Checks that the box and `DEPLOY_URL` serve the build and the auth server's JWKS, and that `CDN_ORIGIN`, when set, serves the build's entry script with its CORS header, or sends it to the box while the CDN cap is on; then fills both of the CDN's build shields (below).

## CDN

With `CDN_ORIGIN` set in `deploy/.env`, the build's hashed files, under `/assets/`, load from Fastly in front of the box, from edges near the people using the app; the box is far from Japan. `deploy.sh` passes it to the build (`apps/frontend/vite.config.ts`), then checks Fastly serves the entry script with its CORS header. Set it empty and deploy again to load everything from the box.

The sticker images load from it too once `CDN_BASE_URL` in `drawing-api.env` is Fastly's `/api/images`, with the API deployed and Display's image host moved to it (`publish-sui.mjs --set-image-host`). An NSFW sticker's drawing still loads from `IMAGE_BASE_URL`, the box's own, which checks the session cookie for it and marks it private, so no CDN keeps a copy.

Everything else stays on the box: index.html, which LIFF opens there, the public folder's files, which LINE fetches by their fixed paths, and the API and the auth server, since the session cookie goes only to the box.

- Scripts, fonts and the sticker images the app reads on canvases and as CSS masks load from another origin only with CORS, so `serve.py` sends `Access-Control-Allow-Origin: *` with every hashed file, and the API with every public sticker image, and Fastly keeps it in its copies. Deploy them before setting `CDN_ORIGIN` or `CDN_BASE_URL`, so no copy is made without it.
- The sealing worker's script must come from the page's own origin, so it starts through a module of the page's own that imports the CDN's copy (`apps/frontend/src/ui/startWorker.ts`). Where the CDN's copy won't load, the cut runs on the main thread.
- Fastly's service "Croquis's website" (`nKXNm4mB3I2iYnrEbsobML`) answers at `stickeroo.freetls.fastly.net`, Fastly's HTTP/2 name for the service's `stickeroo.global.ssl.fastly.net` domain, which speaks only HTTP/1.1 but must stay on the service for the other to answer, with three backends, all the box at `stickeroo.art` over HTTPS. `/assets/` goes to `box`, shielded in Tokyo (`nrt-tokyo-jp`), from POPs whose `server.region` is APAC, Asia or Asia-South, and to `box-us`, shielded in Chicago (`chi-il-us`), from everywhere else. `deploy.sh` requests every hashed file through both shields after each deploy, naming each in an `X-Croquis-Fill` header, so a first visit in Japan or the US is a cache hit at the shield nearby; the `croquis-hash` snippet gives a fill its own cache key at the POP it enters by, so it reaches its shield even when that POP holds the file. `box-images` takes `/api/images/` and is shielded in Frankfurt (`frankfurt-de`), near the box: a sticker image is new when it's first opened, and Frankfurt fetches it from the box faster than Tokyo or Chicago can. Misses stream as they arrive. Its `croquis-recv` VCL snippet passes only GET and HEAD for `/assets/` and `/api/images/`, with no cookie or query string, and answers everything else 404; `croquis-fetch` streams misses, keeps errors only briefly, and keeps no copy of a fill at the POP it entered by. A new version takes a minute or two to reach every POP. Fastly can evict a file nobody requests long before its TTL, and a shield then fetches it from the box again, which from Tokyo is slower than a shield beside the box would be, so deploy shortly before a demo to refill both shields. It caches by the box's `Cache-Control`. `FASTLY_API_TOKEN` in `deploy/.env` manages it through Fastly's API.
- The CDN cap keeps Fastly within its free allowance. Every `CDN_CAP_EVERY_MS` the API (`apps/api/src/cdn/cdnCap.ts`) adds up the service's requests and bytes since the month began, in UTC as Fastly bills, from Fastly's hourly stats, which trail by a few minutes. At `CDN_CAP_SHARE` of the free allowance it sets `send_to_box`, in the service's `croquis_cdn` edge dictionary, to the month, such as `2026-10`, and sets it back to `no` once a later month starts. While it isn't `no`, `croquis-recv` answers every request with a 307 to the same file on the box (`croquis-error`), and the app loads everything from there. For the app's own requests the redirect names `https://stickeroo.art` and allows credentials: WebKit checks it as a credentialed request once it leads to the page's origin, where a wildcard fails. Redirects still count as requests, which Fastly bills past its free allowance. `yes` sends everything to the box until someone sets `no` again, and the cap leaves it: `curl -X PUT -H "Fastly-Key: $FASTLY_API_TOKEN" https://api.fastly.com/service/nKXNm4mB3I2iYnrEbsobML/dictionary/i2D4jijJ2M9v9JlGENCYW3/item/send_to_box -d item_value=yes`. The API logs `cdn.cap.checked` with the month's usage at boot, then `cdn.cap.reached`, `cdn.cap.lifted` and `cdn.cap.check_failed`. It counts this service alone, so another Fastly service on the account would use the same allowance unseen.
- A copy cached without the CORS header breaks the app until it expires, a year on. Clear it with `curl -X POST -H "Fastly-Key: $FASTLY_API_TOKEN" https://api.fastly.com/service/nKXNm4mB3I2iYnrEbsobML/purge_all`, then deploy again a few minutes later so both build shields hold the build again.

## `./deploy/deploy-api.sh`

Publishes the API alone; `--preflight-only` stops after checking the stickers package's IDs and the chain settings. It builds the API, installs `better-sqlite3` and `sharp` for the pinned Node on the box, and syncs the migrations, `drawing-api.env` and `deploy/line/menus.json`. It makes the session secret if it's missing, and writes the box's mode-600 `chain.env` from `deploy/.env`: the Sui server key, Shinami's access key, Privy's app ID and secret, the Messaging API channel's ID and secret, and Fastly's API token, all required. Nothing else goes in it, so a setting the API stopped reading leaves the box with the next deploy. It restarts `drawing-api` when anything changed, then checks `/api/me` on the box and at `DEPLOY_URL`.

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

`--image-host` is the https host that Display joins each sticker's image file name to: the API's `CDN_BASE_URL`, or its `IMAGE_BASE_URL` without a CDN. Display names only public images, an NSFW sticker's veiled one included. With `--publish` it sends two transactions, because a transaction can't call the package it publishes: the publish, then `set_server` and `create_display`, which sends the `DisplayCap` to the deployer. When the second fails, the package is published but unusable by the API; run again for a fresh one.

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

- `stickeroo.art` is at Namecheap, on its own DNS: an A record for `@` to the box and a CNAME for `www`. Namecheap's API `setHosts` replaces every record at once, so a change sends both, with `EmailType=FWD`.
- The box serves other sites through the same HAProxy, in `/etc/haproxy/haproxy.cfg`; Croquis's part routes `stickeroo.art` by host and redirects `www` to it.
- acme.sh in `bawler`'s home issues the certificate, answering Let's Encrypt on port 8888 behind HAProxy's `/.well-known/acme-challenge/` route, and its `haproxy` deploy hook installs each renewal in `/etc/haproxy/certs/`.
- LINE opens the LIFF app's endpoint URL, set in the Login channel's LIFF tab, and Privy reads the auth server's keys from the JWKS URL in its dashboard; both name the domain.
