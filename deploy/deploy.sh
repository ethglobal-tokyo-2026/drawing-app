#!/usr/bin/env bash
# deploy/deploy.sh: build the frontend and the LINE → Privy auth server, and publish both behind the LIFF endpoint once
# deploy-api.sh has published the REST API. deploy/.env (gitignored, see .env.example) names the box and holds the
# API's secrets. HAProxy serves DEPLOY_URL: serve.py on 127.0.0.1:3003 (sticker-board.service) serves the app, and the
# auth server on 127.0.0.1:8787 (sticker-auth.service) serves public JWKS; /_internal/privy-jwt stays private.
set -euo pipefail
# shellcheck source=deploy/lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_main_checkout

DIR="${DEPLOY_FRONTEND_DIR:-/srv/sticker-board}"
AUTH_DIR="${DEPLOY_AUTH_DIR:-/srv/sticker-auth}"
API_DIR="${DEPLOY_API_DIR:-/srv/drawing-api}"
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
# The auth server runs on the Node that package.json pins.
"$ROOT/deploy/install-node.sh" sticker-auth

# A failed coordinated release restores the previous protected issuer, API and frontend together.
RELEASE_STAGE="$(ssh "$TARGET" "mktemp -d /tmp/croquis-release.XXXXXXXX")"
rsync -c "$ROOT/deploy/release-snapshot.mjs" "$ROOT/deploy/install-auth-secret.mjs" "$TARGET:$RELEASE_STAGE/"
RELEASE_SAVED=false
RELEASE_COMMITTED=false
finish_release() {
  local status=$?
  trap - EXIT INT TERM
  if [ "$RELEASE_SAVED" = true ] && [ "$RELEASE_COMMITTED" = false ]; then
    echo "✗ release failed; restoring previous service/build set" >&2
    if ! ssh "$TARGET" "sudo systemctl stop sticker-auth \
      && node '$RELEASE_STAGE/release-snapshot.mjs' restore '$RELEASE_STAGE/previous' '$API_DIR' '$AUTH_DIR' '$DIR' \
      && for item in 'sticker-auth:$AUTH_DIR' 'drawing-api:$API_DIR' 'sticker-board:$DIR'; do \
        unit=\${item%%:*}; directory=\${item#*:}; \
        if [ \"\$unit\" = sticker-auth ] && ! node '$RELEASE_STAGE/release-snapshot.mjs' check-auth '$RELEASE_STAGE/previous' '$API_DIR' '$AUTH_DIR' '$DIR'; then sudo systemctl disable sticker-auth || exit 1; continue; fi; \
        if test -f \"\$directory/\$unit.service\"; then \
          sudo install -m 644 \"\$directory/\$unit.service\" \"/etc/systemd/system/\$unit.service\" \
          && sudo systemctl daemon-reload && sudo systemctl restart \"\$unit\" || exit 1; \
        else sudo systemctl stop \"\$unit\" || exit 1; fi; \
      done"; then
      echo "✗ rollback failed; retained snapshot at $RELEASE_STAGE/previous for operator recovery" >&2
      exit 1
    fi
    # Restore cached HTML too when a failure happened after the frontend was published.
    curl -fsS --max-time 30 -X POST -H "Fastly-Key: $FASTLY_API_TOKEN" \
      "https://api.fastly.com/service/$FASTLY_SERVICE_ID/purge/page" >/dev/null \
      || { echo "✗ rollback restored services but cached page purge failed" >&2; exit 1; }
  fi
  ssh "$TARGET" "rm -rf '$RELEASE_STAGE'" || { echo "✗ could not remove release snapshot" >&2; exit 1; }
  exit "$status"
}
trap finish_release EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
ssh "$TARGET" "node '$RELEASE_STAGE/release-snapshot.mjs' save '$RELEASE_STAGE/previous' '$API_DIR' '$AUTH_DIR' '$DIR'"
RELEASE_SAVED=true
for d in "$DIR" "$AUTH_DIR" "$API_DIR"; do
  ssh "$TARGET" "test -d '$d' || sudo install -d -o \"\$(id -un)\" -g \"\$(id -gn)\" -m 755 '$d'"
done
ssh "$TARGET" "mkdir -p '$DIR/site' '$AUTH_DIR/server'"
printf 'PRIVY_JWT_INTERNAL_SECRET=%s\n' "${PRIVY_JWT_INTERNAL_SECRET:-}" | \
  ssh "$TARGET" "node '$RELEASE_STAGE/install-auth-secret.mjs' '$API_DIR/privy-internal.env' '$AUTH_DIR/privy-internal.env' install"

echo "→ rsync → $TARGET:$AUTH_DIR"
# By content, without times: every deploy rebuilds the server, and a new timestamp alone would restart it, dropping
# sign-ins in progress.
auth_changed="installed protected auth configuration"
auth_changed+="$(rsync -rci --delete "$AUTH_BUILD/" "$TARGET:$AUTH_DIR/server/")"
auth_changed+="$(rsync -ci "$ROOT/deploy/sticker-auth.env" "$TARGET:$AUTH_DIR/auth.env")"
auth_changed+="$(rsync -ci "$ROOT/deploy/sticker-auth.service" "$TARGET:$AUTH_DIR/")"
# The key that signs Privy JWTs is made on the box and never leaves it.
auth_changed+="$(ssh "$TARGET" "test -s '$AUTH_DIR/signing-key.pem' || { umask 077 \
  && openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt -out '$AUTH_DIR/signing-key.pem' \
  && echo 'made a signing key'; }")"
if [ -n "$auth_changed" ]; then install_and_restart_unit sticker-auth "$AUTH_DIR"; fi

# Protected issuer must be healthy before the authenticated API exchange becomes available.
ssh "$TARGET" "$BOX_CURL -fsS http://127.0.0.1:8787/.well-known/jwks.json" | grep -q "\"kid\":\"$KEY_ID\"" \
  || { echo "✗ protected issuer health check failed" >&2; exit 1; }
"$ROOT/deploy/deploy-api.sh" --restart
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
  echo "✗ $URL/.well-known/jwks.json isn't the auth server's: HAProxy must send only /.well-known/jwks.json to 127.0.0.1:8787" >&2
  exit 1
}
echo "✓ $URL/.well-known/jwks.json"

ssh "$TARGET" "rm -f '$AUTH_DIR/issuance-recovery-required'"
RELEASE_COMMITTED=true
