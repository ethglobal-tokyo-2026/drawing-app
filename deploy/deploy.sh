#!/usr/bin/env bash
# deploy/deploy.sh: build the frontend and the LINE → Privy auth server, and publish both behind the LIFF endpoint once
# deploy-api.sh has published the REST API. deploy/.env (gitignored, see .env.example) names the box and holds the
# API's secrets. HAProxy serves DEPLOY_URL: serve.py on 127.0.0.1:3003 (sticker-board.service) serves the app, and the
# auth server on 127.0.0.1:8787 (sticker-auth.service) answers /v1/auth/ and /.well-known/jwks.json.
set -euo pipefail
# shellcheck source=deploy/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_main_checkout

DIR=/srv/sticker-board
AUTH_DIR=/srv/sticker-auth
URL="${DEPLOY_URL:-https://stickeroo.art}"
DIST="$ROOT/apps/frontend/dist"
AUTH_BUILD="$ROOT/packages/line-auth/dist/auth-server"
KEY_ID="$(sed -n 's/^AUTH_KEY_ID=//p' "$ROOT/deploy/sticker-auth.env")"
FASTLY_SERVICE_ID="$(sed -n 's/^FASTLY_SERVICE_ID=//p' "$ROOT/deploy/drawing-api.env")"
# The checks on the box retry: a server that just restarted refuses connections until it has started.
BOX_CURL="curl --retry 10 --retry-connrefused --retry-delay 1 --max-time 5"

"$ROOT/deploy/deploy-api.sh" --preflight-only

# The live app shows the stat board's developer slip, so its test tools (the gratitude mini-game,
# LINE and Privy's checks) can be tried inside LINE on a phone.
VITE_DEV_SLIP=on pnpm --dir "$ROOT" --filter frontend build
pnpm --dir "$ROOT" --filter @drawing-app/line-auth build:auth-server
# Publish and verify the API before serving a frontend that depends on it.
"$ROOT/deploy/deploy-api.sh"
# The auth server runs on the Node that package.json pins.
"$ROOT/deploy/install-node.sh" sticker-auth

echo "→ rsync → $TARGET:$DIR"
# /srv belongs to root, so a missing folder is made once with sudo and handed to the deploy user.
for d in "$DIR" "$AUTH_DIR"; do
  ssh "$TARGET" "test -d '$d' || sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" -m 755 '$d'"
done
ssh "$TARGET" "mkdir -p '$DIR/site' '$AUTH_DIR/server'"
# New files move into place together at the end, and old ones go after that, so someone opening the app mid-upload
# never gets an index.html whose chunks are missing.
rsync -a --delay-updates --delete-after --exclude='.DS_Store' "$DIST/" "$TARGET:$DIR/site/"

# The server and its unit rarely change, so restart only when one did. By content, without times: a fresh checkout's
# new timestamps alone would restart it.
changed="$(rsync -ci "$ROOT/deploy/serve.py" "$ROOT/deploy/sticker-board.service" "$TARGET:$DIR/")"
if [ -n "$changed" ]; then install_and_restart_unit sticker-board "$DIR"; fi

echo "→ rsync → $TARGET:$AUTH_DIR"
# By content, without times: every deploy rebuilds the server, and a new timestamp alone would restart it, dropping
# sign-ins in progress.
auth_changed="$(rsync -rci --delete "$AUTH_BUILD/" "$TARGET:$AUTH_DIR/server/")"
auth_changed+="$(rsync -ci "$ROOT/deploy/sticker-auth.env" "$TARGET:$AUTH_DIR/auth.env")"
auth_changed+="$(rsync -ci "$ROOT/deploy/sticker-auth.service" "$TARGET:$AUTH_DIR/")"
# The key that signs Privy JWTs is made on the box and never leaves it.
auth_changed+="$(ssh "$TARGET" "test -s '$AUTH_DIR/signing-key.pem' || { umask 077 \
  && openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -out '$AUTH_DIR/signing-key.pem' \
  && echo 'made a signing key'; }")"
if [ -n "$auth_changed" ]; then install_and_restart_unit sticker-auth "$AUTH_DIR"; fi

# Compare what's served with the build, on the box and then publicly, so a wrong route can't pass as a 200.
ssh "$TARGET" "$BOX_CURL -fsS http://127.0.0.1:3003/" | cmp -s - "$DIST/index.html" \
  || { echo "✗ the server on the box doesn't serve the build" >&2; exit 1; }
echo "✓ 127.0.0.1:3003 on the box"
# Fastly keeps the page a day at each location (deploy/README.md's CDN): the new one replaces it now. The second purge
# catches a location that refilled from the shield before the first purge reached the shield.
for _ in 1 2; do
  curl -fsS --max-time 30 -X POST -H "Fastly-Key: $FASTLY_API_TOKEN" \
    "https://api.fastly.com/service/$FASTLY_SERVICE_ID/purge/page" > /dev/null \
    || { echo "✗ Fastly didn't purge the cached page; see deploy/README.md's CDN" >&2; exit 1; }
  sleep 2
done
echo "✓ purged the cached page from Fastly"
curl -fsS --max-time 15 "$URL/" | cmp -s - "$DIST/index.html" || { echo "✗ $URL/ doesn't match the build" >&2; exit 1; }
echo "✓ $URL/"
# The auth server's JWKS must carry its key ID: serve.py answers unknown paths with the app, also with a 200.
ssh "$TARGET" "$BOX_CURL -fsS http://127.0.0.1:8787/.well-known/jwks.json" | grep -q "\"kid\":\"$KEY_ID\"" \
  || { echo "✗ the auth server on the box doesn't serve its JWKS; see: journalctl -u sticker-auth" >&2; exit 1; }
echo "✓ 127.0.0.1:8787 on the box"
curl -fsS --max-time 15 "$URL/.well-known/jwks.json" | grep -q "\"kid\":\"$KEY_ID\"" || {
  echo "✗ $URL/.well-known/jwks.json isn't the auth server's: HAProxy must send /v1/auth/ and /.well-known/jwks.json to 127.0.0.1:8787" >&2
  exit 1
}
echo "✓ $URL/.well-known/jwks.json"
