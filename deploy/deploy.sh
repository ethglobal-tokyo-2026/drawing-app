#!/usr/bin/env bash
# deploy/deploy.sh: build the frontend and the LINE → Privy auth server, and publish both behind the LIFF endpoint once
# deploy-api.sh has published the REST API. deploy/.env (gitignored, see .env.example) names the box and holds the
# API's secrets. HAProxy serves DEPLOY_URL: serve.py on 127.0.0.1:3003 (sticker-board.service) serves the app, and the
# auth server on 127.0.0.1:8787 (sticker-auth.service) answers /v1/auth/ and /.well-known/jwks.json.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT/deploy/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  . "$ENV_FILE"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"
DIR=/srv/sticker-board
AUTH_DIR=/srv/sticker-auth
URL="${DEPLOY_URL:-https://sticker.195-201-8-147.sslip.io}"
DIST="$ROOT/apps/frontend/dist"
AUTH_BUILD="$ROOT/packages/sticker-chain/dist/auth-server"
KEY_ID="$(sed -n 's/^AUTH_KEY_ID=//p' "$ROOT/deploy/sticker-auth.env")"

# One SSH connection for every ssh and rsync below: the box resets bursts of new ones. A box that doesn't answer, or
# stops answering, fails the deploy instead of hanging it.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-deploy-%C" -o ControlPersist=60
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
ssh() { command ssh "${SSH_OPTS[@]}" "$@"; }
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"
# The checks on the box retry: a server that just restarted refuses connections until it has started.
BOX_CURL="curl --retry 10 --retry-connrefused --retry-delay 1 --max-time 5"

: "${STICKER_GIFT_ESCROW_ADDRESS:?set STICKER_GIFT_ESCROW_ADDRESS in deploy/.env for the frontend}"
[[ "$STICKER_GIFT_ESCROW_ADDRESS" =~ ^0x[0-9a-fA-F]{40}$ ]] || {
  echo "Invalid STICKER_GIFT_ESCROW_ADDRESS" >&2
  exit 1
}
export VITE_STICKER_ESCROW_ADDRESS="$STICKER_GIFT_ESCROW_ADDRESS"
# Only an explicitly public RPC belongs in the browser bundle; the backend RPC can contain credentials.
if [ -n "${VITE_STICKER_RPC_URL:-}" ]; then export VITE_STICKER_RPC_URL; fi
"$ROOT/deploy/deploy-api.sh" --preflight-only

# The live app shows the stat board's developer slip, so its test tools (the gratitude mini-game,
# LINE and Privy's checks) can be tried inside LINE on a phone.
VITE_DEV_SLIP=on pnpm --dir "$ROOT" --filter frontend build
pnpm --dir "$ROOT" --filter @drawing-app/sticker-chain build:auth-server
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
if [ -n "$changed" ]; then
  ssh "$TARGET" "sudo install -m 644 '$DIR/sticker-board.service' /etc/systemd/system/sticker-board.service \
    && sudo systemctl daemon-reload && sudo systemctl enable -q sticker-board && sudo systemctl restart sticker-board"
  echo "↻ restarted sticker-board"
fi

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
# The auth server needs no secrets.env now that the REST API links chat menus; deploy-api.sh installs
# the Messaging API channel's secrets for the API.
if [ -n "$auth_changed" ]; then
  ssh "$TARGET" "sudo install -m 644 '$AUTH_DIR/sticker-auth.service' /etc/systemd/system/sticker-auth.service \
    && sudo systemctl daemon-reload && sudo systemctl enable -q sticker-auth && sudo systemctl restart sticker-auth"
  echo "↻ restarted sticker-auth"
fi

# Compare what's served with the build, on the box and then publicly, so a wrong route can't pass as a 200.
ssh "$TARGET" "$BOX_CURL -fsS http://127.0.0.1:3003/" | cmp -s - "$DIST/index.html" \
  || { echo "✗ the server on the box doesn't serve the build" >&2; exit 1; }
echo "✓ 127.0.0.1:3003 on the box"
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
