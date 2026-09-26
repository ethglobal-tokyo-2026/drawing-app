# Deployment

Run `./deploy/deploy.sh` to publish the API before its frontend, or `./deploy/deploy-api.sh` for
the API alone. Both use the gitignored `deploy/.env`. `./deploy/deploy-api.sh --preflight-only`
checks chain configuration without publishing a build.

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
