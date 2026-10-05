# Deployment

One box serves the app behind HAProxy at `DEPLOY_URL`: `/api/` goes to the REST API, `/v1/auth/` and `/.well-known/jwks.json` to the LINE → Privy auth server, and everything else to the web app. Run the scripts from the repository root.

## Settings

- `deploy/.env`, gitignored (copy `deploy/.env.example`): the box's SSH login (`DEPLOY_TARGET`), the Sepolia RPC, keys and contract addresses, and the secrets for Privy, the Messaging API channel and World ID. `DEPLOY_ENV_FILE` points `deploy.sh` and `deploy-api.sh` at another gitignored file.
- `deploy/drawing-api.env` and `deploy/sticker-auth.env`: the API's and the auth server's settings. They're tracked, so no secret goes in them, and both deploy scripts refuse a `drawing-api.env` that mentions `DEV_SIGN_IN`.
- The box makes the auth server's signing key and the API's session secret itself, and they never leave it.

## Main only

`deploy.sh` and `deploy-api.sh` build whatever is checked out, so they refuse to deploy unless HEAD is the commit `main` points to and nothing is uncommitted, untracked files included. The contracts' submodules don't count: nothing the deploy builds reads them. Deploy from a clean checkout of main. In an emergency, `DEPLOY_ANY_CHECKOUT=on ./deploy/deploy.sh` deploys the checkout as it is. `deploy-api.sh --preflight-only` publishes nothing, so it runs from any checkout.

## `./deploy/deploy.sh`

Publishes everything, in order:

1. `deploy-api.sh --preflight-only` checks the chain settings: `deploy/.env` merged with the box's `chain.env`.
2. Builds the frontend, with the developer slip on, `STICKER_GIFT_ESCROW_ADDRESS` as its escrow and its hashed files on `CDN_ORIGIN` when set, and the auth server.
3. `deploy-api.sh` publishes the API (below).
4. `install-node.sh` puts the pinned Node on the box for the auth server.
5. Syncs the site and the auth server, makes the signing key if it's missing, and restarts `sticker-board` and `sticker-auth` when their files changed.
6. Checks that the box and `DEPLOY_URL` serve the build and the auth server's JWKS, and that `CDN_ORIGIN`, when set, serves the build's entry script with its CORS header.

`VITE_STICKER_RPC_URL`, optional, goes into the browser bundle, so it must be a public RPC; the API's RPC never does.

## CDN

With `CDN_ORIGIN` set in `deploy/.env`, the build's hashed files, under `/assets/`, load from a CloudFront distribution in front of the box, from edges near the people using the app; the box is far from Japan. `deploy.sh` passes it to the build (`apps/frontend/vite.config.ts`), then checks the distribution serves the entry script with its CORS header. Set it empty and deploy again to load everything from the box.

Everything else stays on the box: index.html, which LIFF opens there, the public folder's files, which LINE fetches by their fixed paths, and the API and the auth server, since the session cookie goes only to the box.

- Scripts and fonts from another origin load only with CORS, so `serve.py` sends `Access-Control-Allow-Origin: *` with every hashed file, and the distribution keeps it in its copies. Deploy that `serve.py` before setting `CDN_ORIGIN`, so no copy is made without it.
- The sealing worker's script must come from the page's own origin, so it starts through a module of the page's own that imports the CDN's copy (`apps/frontend/src/ui/startWorker.ts`). Where the CDN's copy won't load, the cut runs on the main thread.
- The distribution: its origin is `DEPLOY_URL`'s host over HTTPS. It answers GET and HEAD with the CachingOptimized cache policy, so no cookie or query string reaches the box, and the SimpleCORS response headers policy, and it compresses. It's on CloudFront's flat-rate Free plan, which needs a web ACL; this one has no rules.
- A copy cached without the CORS header breaks the app until it expires, a year on. Clear it with `aws cloudfront create-invalidation --distribution-id <id> --paths '/assets/*'`.

## `./deploy/deploy-api.sh`

Publishes the API alone; `--preflight-only` stops after checking the chain settings. It builds the API, installs `better-sqlite3` and `sharp` for the pinned Node on the box, and syncs the migrations, `drawing-api.env` and `deploy/line/menus.json`. It makes the session secret if it's missing, and installs the chain settings in the box's mode-600 `chain.env`, keeping values already there that `deploy/.env` leaves out. It restarts `drawing-api` when anything changed, then checks `/api/me` on the box and at `DEPLOY_URL`.

The deployment tests use local temporary files and fake transport/service commands, never SSH or a
running server: `deployApi.test.ts` runs `deploy-api.sh`, and `installChainEnv.test.ts` the chain
settings' installer. `pnpm check` runs both:

```sh
pnpm --filter @drawing-app/api exec vitest run scripts/
```

## `bash deploy/deploy-contracts.sh`

Deploys the names under the parent name, `ENS_PARENT_LABEL`.eth, and `StickerGiftEscrow` to Ethereum Sepolia with Foundry's `forge script`, from `packages/sticker-chain` with its submodules initialized. It needs `ETHEREUM_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `STICKER_SEALER_PRIVATE_KEY`, `ENS_GATEWAY_PRIVATE_KEY`, `ENS_GATEWAY_URL` and `ENS_PARENT_LABEL` in `deploy/.env`.

- `ENS_PARENT_LABEL` is the parent name's label, `croquis-app` for croquis-app.eth.
- With `STICKER_NFT_ADDRESS` set, it keeps that StickerNFT; otherwise it deploys one.
- The deployer stays the administrator. The sealer gets mint, claim-signing and naming permissions, and the gateway key's address is the only signer `CroquisResolver` trusts.
- When the deployer owns the parent name, it points that name at the new registry and resolver; otherwise it prints the two addresses the name's owner sets.

Copy the printed `STICKER_NFT_ADDRESS`, `STICKER_GIFT_ESCROW_ADDRESS`, `CROQUIS_NAMES_ADDRESS` and `CROQUIS_RESOLVER_ADDRESS` into `deploy/.env`, then run `./deploy/deploy.sh`.

At boot, and just after each midnight, Tokyo time, the API mints every sealed sticker still without its NFT, oldest first, as Sealing does: one whose mint failed and was never retried, or one sealed in mock chain mode. `sticker.mint.catch_up.swept` tallies each run, and `sticker.mint.catch_up.skipped` says why it left a sticker unminted: its Original Artist has no smart wallet (`no_smart_account`), deleted their account (`no_live_person`), or no longer holds it (`not_held_by_artist`, from Giving in mock chain mode).

## LINE: chat menus and greeting

- `./deploy/line/create-returning-menu.sh en|ja plain|3|2|1|reserve|none`, or `default [--set-default]`, makes one chat menu in LINE and records its ID in `deploy/line/menus.json`. Commit that and deploy the API, which links each person's menu from it. `--print` prints the menu without calling LINE. It needs `jq`, and the Messaging API channel's ID and secret in `deploy/.env`.
- `pnpm --filter frontend chat-menus` renders the menus' images in `deploy/line/images/` from `returning-menu.html`. LINE can't replace a menu's image, so a new image means a new menu; the old one stays in LINE until it's deleted.
- `deploy/line/greeting.md`: the Official account's greeting and auto-reply settings, set by hand in LINE Official Account Manager.

## On the box

| Unit            | Serves                                             | Its folder                                                                                                                                                                    |
| --------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawing-api`   | The REST API, on 127.0.0.1:8788                    | `/srv/drawing-api`: the database in `data/`, the sticker images in `images/`, `server/`, `drizzle/`, `api.env`, `line-menus.json`, and mode-600 `secrets.env` and `chain.env` |
| `sticker-auth`  | The LINE → Privy auth server, on 127.0.0.1:8787    | `/srv/sticker-auth`: `server/`, `auth.env` and `signing-key.pem`                                                                                                              |
| `sticker-board` | The web app, through `serve.py`, on 127.0.0.1:3003 | `/srv/sticker-board`: `serve.py` and the build in `site/`                                                                                                                     |

Each unit's file is `deploy/<unit>.service`, which the deploy scripts install in `/etc/systemd/system/`. `drawing-api` and `sticker-auth` run on the Node that the root `package.json` pins, under `/usr/local/lib/nodejs/`. Their logs: `journalctl -u <unit>` on the box, or `/api/logs` for both.
