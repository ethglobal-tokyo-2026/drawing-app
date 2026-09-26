#!/usr/bin/env bash
# deploy/deploy-api.sh: build the REST API (apps/api) and run it on the box, behind the LIFF endpoint.
#
#   ./deploy/deploy-api.sh
#
# deploy/deploy.sh runs it too. HAProxy sends DEPLOY_URL's /api/ to 127.0.0.1:8788 (deploy/drawing-api.service).
# The box runs Node 22, so the API ships as one bundle, with the box's own build of better-sqlite3 beside it. On
# start, it applies pending migrations from drizzle/, and it serves the sticker images under /api/images/.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT/deploy/.env" ]; then
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"
DIR="${DEPLOY_API_DIR:-/srv/drawing-api}"
URL="${DEPLOY_URL:-https://sticker.195-201-8-147.sslip.io}"
SQLITE_VERSION="$(cd "$ROOT/packages/db" && node -p "require('better-sqlite3/package.json').version")"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# One SSH connection for every ssh and rsync below: the box resets bursts of new ones.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-deploy-%C" -o ControlPersist=60)
ssh() { command ssh "${SSH_OPTS[@]}" "$@"; }
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"

pnpm --dir "$ROOT" --filter @drawing-app/api build

echo "→ rsync → $TARGET:$DIR"
# /srv belongs to root, so a missing folder is made once with sudo and handed to the deploy user.
ssh "$TARGET" "test -d '$DIR' || sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" -m 755 '$DIR'"
ssh "$TARGET" "mkdir -p '$DIR/server' '$DIR/data' '$DIR/images'"

# By content, without times: every deploy rebuilds the bundle, and a new timestamp alone would restart it.
printf '{ "private": true, "type": "module", "dependencies": { "better-sqlite3": "%s" } }\n' "$SQLITE_VERSION" \
  >"$STAGE/package.json"
changed="$(rsync -ci "$STAGE/package.json" "$TARGET:$DIR/server/package.json")"
if [ -n "$changed" ]; then
  ssh "$TARGET" "cd '$DIR/server' && npm install --omit=dev --no-audit --no-fund --loglevel=error"
fi
changed+="$(rsync -ci "$ROOT/apps/api/dist/server.mjs" "$TARGET:$DIR/server/server.mjs")"
changed+="$(rsync -rci --delete "$ROOT/packages/db/drizzle/" "$TARGET:$DIR/drizzle/")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.env" "$TARGET:$DIR/api.env")"
changed+="$(rsync -ci "$ROOT/deploy/drawing-api.service" "$TARGET:$DIR/")"
# The session cookie's secret is made on the box and never leaves it.
changed+="$(ssh "$TARGET" "test -s '$DIR/secrets.env' || { umask 077 \
  && printf 'SESSION_SECRET=%s\n' \"\$(openssl rand -hex 32)\" > '$DIR/secrets.env' && echo 'made a session secret'; }")"
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
