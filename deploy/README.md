# Deployment

One box serves the app behind HAProxy at `DEPLOY_URL`: `/api/` goes to the REST API, `/v1/auth/` and `/.well-known/jwks.json` to the LINE → Privy auth server, and everything else to the web app. Run the scripts from the repository root.

## Settings

- `deploy/.env`, gitignored (copy `deploy/.env.example`): the box's SSH login (`DEPLOY_TARGET`), the Sepolia RPC, keys and contract addresses, and the secrets for Privy, the Messaging API channel and World ID. `DEPLOY_ENV_FILE` points `deploy.sh` and `deploy-api.sh` at another gitignored file. `./deploy/create-sepolia-accounts.mjs` adds a deployer and a sealer key to it, unless it has them.
- `deploy/drawing-api.env` and `deploy/sticker-auth.env`: the API's and the auth server's settings. They're tracked, so no secret goes in them, and both deploy scripts refuse a `drawing-api.env` that mentions `DEV_SIGN_IN`.
- The box makes the auth server's signing key and the API's session secret itself, and they never leave it.

## `./deploy/deploy.sh`

Publishes everything, in order:

1. `deploy-api.sh --preflight-only` checks the chain settings: `deploy/.env` merged with the box's `chain.env`.
2. Builds the frontend, with the developer slip on and `STICKER_GIFT_ESCROW_ADDRESS` as its escrow, and the auth server.
3. `deploy-api.sh` publishes the API (below).
4. `install-node.sh` puts the pinned Node on the box for the auth server.
5. Syncs the site and the auth server, makes the signing key if it's missing, and restarts `sticker-board` and `sticker-auth` when their files changed.
6. Checks that the box and `DEPLOY_URL` serve the build and the auth server's JWKS.

`VITE_STICKER_RPC_URL`, optional, goes into the browser bundle, so it must be a public RPC; the API's RPC never does.

## `./deploy/deploy-api.sh`

Publishes the API alone; `--preflight-only` stops after checking the chain settings. It builds the API, installs `better-sqlite3` and `sharp` for the pinned Node on the box, and syncs the migrations, `drawing-api.env` and `deploy/line/menus.json`. It makes the session secret if it's missing, and installs the chain settings in the box's mode-600 `chain.env`, keeping values already there that `deploy/.env` leaves out. It restarts `drawing-api` when anything changed, then checks `/api/me` on the box and at `DEPLOY_URL`. `node --test deploy/install-chain-env.test.mjs` tests the chain settings' installer.

Before replacing `server.mjs`, API deployment prepares any missing WebP Sticker images from
the stored PNGs. It briefly stops an active API so no older Sealing request can add PNG-only
assets after the scan. Conversion only adds missing files; it never replaces existing images.
The new server stays staged until conversion succeeds. A conversion failure or timeout aborts
deployment and restarts the previous API; the enclosing deployment does not publish the frontend.
Inspect the reported image failure and retry deployment after correcting it.

To inspect images without changing them, run `backfill-sticker-webp.mjs --dry-run` from the
API's server directory with `IMAGE_DIR` set, using the API's Node runtime and user.

The deployment regression test uses local temporary files and fake transport/service commands,
never SSH or a running server:

```sh
pnpm --filter @drawing-app/api exec vitest run scripts/deployApi.test.ts
```

## `bash deploy/deploy-contracts.sh`

Deploys the names under croquis.eth and `StickerGiftEscrow` to Ethereum Sepolia with Foundry's `forge script`, from `packages/sticker-chain` with its submodules initialized. It needs `ETHEREUM_SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `STICKER_SEALER_PRIVATE_KEY`, `ENS_GATEWAY_PRIVATE_KEY` and `ENS_GATEWAY_URL` in `deploy/.env`.

- With `STICKER_NFT_ADDRESS` set, it keeps that StickerNFT; otherwise it deploys one.
- The deployer stays the administrator. The sealer gets mint, claim-signing and naming permissions, and the gateway key's address is the only signer `CroquisResolver` trusts.
- When the deployer owns croquis.eth, it points croquis.eth at the new registry and resolver; otherwise it prints the two addresses croquis.eth's owner sets.

Copy the printed `STICKER_NFT_ADDRESS`, `STICKER_GIFT_ESCROW_ADDRESS`, `CROQUIS_NAMES_ADDRESS` and `CROQUIS_RESOLVER_ADDRESS` into `deploy/.env`, then run `./deploy/deploy.sh`.

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
