#!/usr/bin/env bash
# deploy/deploy.sh: build apps/frontend and publish it to the LIFF app's endpoint.
#
#   ./deploy/deploy.sh
#
# deploy/.env (gitignored, see .env.example) names the box. It serves the build at DEPLOY_URL: HAProxy in front,
# and deploy/serve.py behind it on 127.0.0.1:3003, run by deploy/sticker-board.service.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$ROOT/deploy/.env" ]; then
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"
DIR="${DEPLOY_DIR:-/srv/sticker-board}"
URL="${DEPLOY_URL:-https://sticker.195-201-8-147.sslip.io}"
DIST="$ROOT/apps/frontend/dist"

pnpm --dir "$ROOT" --filter frontend build

echo "→ rsync → $TARGET:$DIR"
ssh "$TARGET" "mkdir -p '$DIR/site'"
rsync -a --delete --exclude='.DS_Store' "$DIST/" "$TARGET:$DIR/site/"

# The server and its unit rarely change, so restart only when one did.
changed="$(rsync -ai "$ROOT/deploy/serve.py" "$ROOT/deploy/sticker-board.service" "$TARGET:$DIR/")"
if [ -n "$changed" ]; then
  ssh "$TARGET" "sudo install -m 644 '$DIR/sticker-board.service' /etc/systemd/system/sticker-board.service \
    && sudo systemctl daemon-reload && sudo systemctl enable -q sticker-board && sudo systemctl restart sticker-board"
  echo "↻ restarted sticker-board"
  sleep 1
fi

# Compare what's served with the build, on the box and then publicly, so a wrong route can't pass as a 200.
ssh "$TARGET" "curl -fsS --max-time 5 http://127.0.0.1:3003/" | cmp -s - "$DIST/index.html" \
  || { echo "✗ the server on the box doesn't serve the build" >&2; exit 1; }
echo "✓ 127.0.0.1:3003 on the box"
curl -fsS --max-time 15 "$URL/" | cmp -s - "$DIST/index.html" || { echo "✗ $URL/ doesn't match the build" >&2; exit 1; }
echo "✓ $URL/"
