#!/usr/bin/env bash
# deploy/deploy-api.sh: build the REST API (apps/api) and run it on the box, behind the LIFF endpoint.
#
#   ./deploy/deploy-api.sh
#   ./deploy/deploy-api.sh --preflight-only
#
# deploy/deploy.sh runs it too. HAProxy sends DEPLOY_URL's /api/ to 127.0.0.1:8788 (deploy/drawing-api.service).
# The API ships as one bundle, with the box's own build of better-sqlite3 beside it, and runs on the Node that
# package.json pins (deploy/install-node.sh). On start, it applies pending migrations from drizzle/, and it serves
# the sticker images under /api/images/.
set -euo pipefail
PREFLIGHT_ONLY=false
if [ "${1:-}" = "--preflight-only" ] && [ "$#" -eq 1 ]; then
  PREFLIGHT_ONLY=true
elif [ "$#" -ne 0 ]; then
  echo "Usage: deploy-api.sh [--preflight-only]" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Dev sign-in lets anyone sign in as anyone, so the box's config may not mention it, even commented out.
if grep -q DEV_SIGN_IN "$ROOT/deploy/drawing-api.env"; then
  echo "✗ deploy/drawing-api.env mentions DEV_SIGN_IN: dev sign-in lets anyone sign in as anyone, so it never" \
    "goes on the box. Remove it and deploy again." >&2
  exit 1
fi
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT/deploy/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  . "$ENV_FILE"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"
DIR="${DEPLOY_API_DIR:-/srv/drawing-api}"
AUTH_DIR="${DEPLOY_AUTH_DIR:-/srv/sticker-auth}"
URL="${DEPLOY_URL:-https://sticker.195-201-8-147.sslip.io}"
STAGE="$(mktemp -d)"
REMOTE_STAGE=""
cleanup() {
  rm -rf "$STAGE"
  if [ -n "$REMOTE_STAGE" ]; then ssh "$TARGET" "rm -rf '$REMOTE_STAGE'"; fi
}
trap cleanup EXIT

# One SSH connection for every ssh and rsync below: the box resets bursts of new ones.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-deploy-%C" -o ControlPersist=60)
ssh() { command ssh "${SSH_OPTS[@]}" "$@"; }
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"

# Validate the merged credentials before replacing any running server code. Existing secrets stay on
# the server; the auth service's Privy secret can be reused when this is the API's first chain deploy.
REMOTE_STAGE="$(ssh "$TARGET" "mktemp -d /tmp/drawing-api-deploy.XXXXXXXX")"
rsync -c "$ROOT/deploy/install-chain-env.mjs" "$TARGET:$REMOTE_STAGE/install-chain-env.mjs"
chain_config() {
  printf 'STICKER_CHAIN_MODE=sepolia\nETHEREUM_SEPOLIA_RPC_URL=%s\nSTICKER_NFT_ADDRESS=%s\nSTICKER_GIFT_ESCROW_ADDRESS=%s\nSTICKER_SEALER_PRIVATE_KEY=%s\nCROQUIS_NAMES_ADDRESS=%s\nCROQUIS_RESOLVER_ADDRESS=%s\nENS_GATEWAY_PRIVATE_KEY=%s\nPRIVY_APP_ID=%s\nPRIVY_APP_SECRET=%s\n' \
    "${ETHEREUM_SEPOLIA_RPC_URL:-}" "${STICKER_NFT_ADDRESS:-}" "${STICKER_GIFT_ESCROW_ADDRESS:-}" \
    "${STICKER_SEALER_PRIVATE_KEY:-}" "${CROQUIS_NAMES_ADDRESS:-}" "${CROQUIS_RESOLVER_ADDRESS:-}" \
    "${ENS_GATEWAY_PRIVATE_KEY:-}" "${PRIVY_APP_ID:-}" "${PRIVY_APP_SECRET:-}"
}
chain_config | ssh "$TARGET" "node '$REMOTE_STAGE/install-chain-env.mjs' '$DIR/chain.env' '$AUTH_DIR/secrets.env' check"
if [ "$PREFLIGHT_ONLY" = true ]; then exit 0; fi

SQLITE_VERSION="$(cd "$ROOT/packages/db" && node -p "require('better-sqlite3/package.json').version")"
# sharp's exports don't include its package.json, so it's read as a file.
SHARP_VERSION="$(cd "$ROOT/apps/api" && node -p "JSON.parse(require('fs').readFileSync('node_modules/sharp/package.json', 'utf8')).version")"
NODE_VERSION="$(node -p "require('$ROOT/package.json').devEngines.runtime.version")"
pnpm --dir "$ROOT" --filter @drawing-app/api build
"$ROOT/deploy/install-node.sh" drawing-api

echo "→ rsync → $TARGET:$DIR"
# /srv belongs to root, so a missing folder is made once with sudo and handed to the deploy user.
ssh "$TARGET" "test -d '$DIR' || sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" -m 755 '$DIR'"
ssh "$TARGET" "mkdir -p '$DIR/server' '$DIR/data' '$DIR/images'"

# By content, without times: every deploy rebuilds the bundle, and a new timestamp alone would restart it. The Node
# version is in it so that a new Node reinstalls the native modules too.
printf '{ "private": true, "type": "module", "engines": { "node": "%s" }, "dependencies": { "better-sqlite3": "%s", "sharp": "%s" } }\n' \
  "$NODE_VERSION" "$SQLITE_VERSION" "$SHARP_VERSION" >"$STAGE/package.json"
changed="$(rsync -ci "$STAGE/package.json" "$TARGET:$DIR/server/package.json")"
if [ -n "$changed" ]; then
  # With the pinned Node's npm, so native modules match the Node that loads them.
  ssh "$TARGET" "cd '$DIR/server' && PATH=/usr/local/lib/nodejs/node-24/bin:\$PATH \
    /usr/local/lib/nodejs/node-24/bin/npm install --omit=dev --no-audit --no-fund --loglevel=error"
fi
changed+="$(rsync -ci "$ROOT/apps/api/dist/server.mjs" "$TARGET:$DIR/server/server.mjs")"
changed+="$(rsync -rci --delete "$ROOT/packages/db/drizzle/" "$TARGET:$DIR/drizzle/")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.env" "$TARGET:$DIR/api.env")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.service" "$TARGET:$DIR/")"
# The session cookie's secret is made on the box and never leaves it.
changed+="$(ssh "$TARGET" "test -s '$DIR/secrets.env' || { umask 077 \
  && printf 'SESSION_SECRET=%s\n' \"\$(openssl rand -hex 32)\" > '$DIR/secrets.env' && echo 'made a session secret'; }")"
changed+="$(chain_config | ssh "$TARGET" "node '$REMOTE_STAGE/install-chain-env.mjs' '$DIR/chain.env' '$AUTH_DIR/secrets.env' install")"
if [ -n "$changed" ]; then
  ssh "$TARGET" "sudo install -m 644 '$DIR/drawing-api.service' /etc/systemd/system/drawing-api.service \
    && sudo systemctl daemon-reload && sudo systemctl enable -q drawing-api && sudo systemctl restart drawing-api"
  echo "↻ restarted drawing-api"
  sleep 2
fi

# A signed-out call must get the API's own refusal: serve.py answers unknown paths with the app, also with a 200.
ssh "$TARGET" "curl -sS --max-time 5 http://127.0.0.1:8788/api/me" | grep -q '"signed_out"' \
  || { echo "✗ the API on the box doesn't answer; see: journalctl -u drawing-api" >&2; exit 1; }
echo "✓ 127.0.0.1:8788 on the box"
curl -sS --max-time 15 "$URL/api/me" | grep -q '"signed_out"' || {
  echo "✗ $URL/api/me isn't the API's: HAProxy must send /api/ to 127.0.0.1:8788" >&2
  exit 1
}
echo "✓ $URL/api/me"
