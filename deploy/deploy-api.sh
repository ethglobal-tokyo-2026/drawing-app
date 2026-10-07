#!/usr/bin/env bash
# deploy/deploy-api.sh: build the REST API (apps/api) and run it on the box behind the LIFF endpoint; deploy.sh runs it
# too. --preflight-only checks the chain configuration on the box and stops. HAProxy sends DEPLOY_URL's /api/ to
# 127.0.0.1:8788 (drawing-api.service). The API ships as one bundle, with the box's own builds of its native modules
# beside it, on the Node that package.json pins (install-node.sh). On start it applies pending migrations from drizzle/,
# and it serves the sticker images under /api/images/.
set -euo pipefail
PREFLIGHT_ONLY=false
if [ "${1:-}" = "--preflight-only" ] && [ "$#" -eq 1 ]; then
  PREFLIGHT_ONLY=true
elif [ "$#" -ne 0 ]; then
  echo "Usage: deploy-api.sh [--preflight-only]" >&2
  exit 1
fi

# shellcheck source=deploy/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
# The preflight publishes nothing, so it runs from any checkout.
if [ "$PREFLIGHT_ONLY" = false ]; then require_main_checkout; fi
# Dev sign-in lets anyone sign in as anyone, so the box's config may not mention it, even commented out.
if grep -q DEV_SIGN_IN "$ROOT/deploy/drawing-api.env"; then
  echo "✗ deploy/drawing-api.env mentions DEV_SIGN_IN: dev sign-in lets anyone sign in as anyone, so it never" \
    "goes on the box. Remove it and deploy again." >&2
  exit 1
fi
# The stickers package's IDs, which publish-sui.mjs prints. The API can't start without them, so a blank one stops the
# deploy here, before any running server code is replaced.
for key in SUI_STICKER_PACKAGE SUI_STICKER_REGISTRY SUI_SERVER_CONFIG SUI_GIFT_ESCROW; do
  grep -Eq "^$key=0x[0-9a-f]{64}$" "$ROOT/deploy/drawing-api.env" || {
    echo "✗ deploy/drawing-api.env has no $key (0x and 64 hexadecimal digits): publish the stickers package with" \
      "deploy/publish-sui.mjs, and paste the KEY=value lines it prints." >&2
    exit 1
  }
done
DIR="${DEPLOY_API_DIR:-/srv/drawing-api}"
URL="${DEPLOY_URL:-https://stickeroo.art}"
STAGE="$(mktemp -d)"
REMOTE_STAGE=""
cleanup() {
  rm -rf "$STAGE"
  if [ -n "$REMOTE_STAGE" ]; then ssh "$TARGET" "rm -rf '$REMOTE_STAGE'"; fi
}
trap cleanup EXIT

# The check on the box retries: the API refuses connections until it has applied its migrations and started.
BOX_CURL="curl --retry 10 --retry-connrefused --retry-delay 1 --max-time 5"
# A stalled registry or native build fails the deploy instead of hanging it.
NPM_INSTALL_TIMEOUT=10m

# Validate the chain settings in deploy/.env before replacing any running server code. The install writes the box's
# chain.env from them alone, so it holds exactly what the API reads.
REMOTE_STAGE="$(ssh "$TARGET" "mktemp -d /tmp/drawing-api-deploy.XXXXXXXX")"
rsync -c "$ROOT/deploy/install-chain-env.mjs" "$TARGET:$REMOTE_STAGE/install-chain-env.mjs"
chain_config() {
  printf 'SUI_SERVER_PRIVATE_KEY=%s\nSHINAMI_ACCESS_KEY=%s\nPRIVY_APP_ID=%s\nPRIVY_APP_SECRET=%s\nLINE_MESSAGING_CHANNEL_ID=%s\nLINE_MESSAGING_CHANNEL_SECRET=%s\n' \
    "${SUI_SERVER_PRIVATE_KEY:-}" "${SHINAMI_ACCESS_KEY:-}" "${PRIVY_APP_ID:-}" "${PRIVY_APP_SECRET:-}" \
    "${LINE_MESSAGING_CHANNEL_ID:-}" "${LINE_MESSAGING_CHANNEL_SECRET:-}"
}
chain_config | ssh "$TARGET" "node '$REMOTE_STAGE/install-chain-env.mjs' '$DIR/chain.env' check"
if [ "$PREFLIGHT_ONLY" = true ]; then exit 0; fi

SQLITE_VERSION="$(cd "$ROOT/packages/db" && node -p "require('better-sqlite3/package.json').version")"
# sharp's exports don't include its package.json, so it's read as a file.
SHARP_VERSION="$(cd "$ROOT/apps/api" && node -p "JSON.parse(require('fs').readFileSync('node_modules/sharp/package.json', 'utf8')).version")"
NODE_VERSION="$(pinned_node_version)"
# install-node.sh links the pinned Node here, by major.
NODE_BIN="/usr/local/lib/nodejs/node-${NODE_VERSION%%.*}/bin"
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
  ssh "$TARGET" "cd '$DIR/server' && PATH=$NODE_BIN:\$PATH \
    timeout $NPM_INSTALL_TIMEOUT $NODE_BIN/npm install --omit=dev --no-audit --no-fund --loglevel=error"
fi
changed+="$(rsync -ci "$ROOT/apps/api/dist/server.mjs" "$TARGET:$DIR/server/server.mjs")"
changed+="$(rsync -rci --delete "$ROOT/packages/db/drizzle/" "$TARGET:$DIR/drizzle/")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.env" "$TARGET:$DIR/api.env")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.service" "$TARGET:$DIR/")"
# The chat menus' IDs, which LINE_CHAT_MENUS_FILE names.
changed+="$(rsync -ci "$ROOT/deploy/line/menus.json" "$TARGET:$DIR/line-menus.json")"
# The session cookie's secret is made on the box and never leaves it.
changed+="$(ssh "$TARGET" "test -s '$DIR/secrets.env' || { umask 077 \
  && printf 'SESSION_SECRET=%s\n' \"\$(openssl rand -hex 32)\" > '$DIR/secrets.env' && echo 'made a session secret'; }")"
changed+="$(chain_config | ssh "$TARGET" "node '$REMOTE_STAGE/install-chain-env.mjs' '$DIR/chain.env' install")"
if [ -n "$changed" ]; then install_and_restart_unit drawing-api "$DIR"; fi

# A signed-out call must get the API's own refusal: serve.py answers unknown paths with the app, also with a 200.
ssh "$TARGET" "$BOX_CURL -sS http://127.0.0.1:8788/api/me" | grep -q '"signed_out"' \
  || { echo "✗ the API on the box doesn't answer; see: journalctl -u drawing-api" >&2; exit 1; }
echo "✓ 127.0.0.1:8788 on the box"
curl -sS --max-time 15 "$URL/api/me" | grep -q '"signed_out"' || {
  echo "✗ $URL/api/me isn't the API's: HAProxy must send /api/ to 127.0.0.1:8788" >&2
  exit 1
}
echo "✓ $URL/api/me"
