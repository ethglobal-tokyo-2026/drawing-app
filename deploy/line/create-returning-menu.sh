#!/usr/bin/env bash
# deploy/line/create-returning-menu.sh: create the returning-user rich menu (Draw, My board, Explore) in LINE.
#
#   ./deploy/line/create-returning-menu.sh           validate and create the menu, then upload returning-menu.png
#   ./deploy/line/create-returning-menu.sh --print   print the menu object, without calling LINE
#
# Reusable: LINE can't replace a menu's image, so a new image means running this again for a new menu. It never
# sets the default menu or links anyone; the auth server links returning users. Needs curl, jq, and the Messaging
# API channel's LINE_MESSAGING_CHANNEL_ID and LINE_MESSAGING_CHANNEL_SECRET in deploy/.env (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$ROOT/deploy/.env" ]; then
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
fi
IMAGE="$ROOT/deploy/line/returning-menu.png"
LIFF_URL="https://liff.line.me/2011732197-P98cxGpu"

# Three full-height columns, one over each tile of the image; the app opens the screen its path names.
MENU="$(
  cat <<JSON
{
  "size": { "width": 2500, "height": 843 },
  "selected": true,
  "name": "Returning: Draw · My board · Explore",
  "chatBarText": "Sticker Board",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "label": "Draw", "uri": "$LIFF_URL/draw" }
    },
    {
      "bounds": { "x": 833, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "label": "My board", "uri": "$LIFF_URL" }
    },
    {
      "bounds": { "x": 1666, "y": 0, "width": 834, "height": 843 },
      "action": { "type": "uri", "label": "Explore", "uri": "$LIFF_URL/explore" }
    }
  ]
}
JSON
)"

case "${1:-}" in
  --print)
    printf '%s\n' "$MENU"
    exit 0
    ;;
  "") ;;
  *)
    echo "usage: $0 [--print]" >&2
    exit 2
    ;;
esac

CHANNEL_ID="${LINE_MESSAGING_CHANNEL_ID:?set LINE_MESSAGING_CHANNEL_ID in deploy/.env}"
CHANNEL_SECRET="${LINE_MESSAGING_CHANNEL_SECRET:?set LINE_MESSAGING_CHANNEL_SECRET in deploy/.env}"
command -v jq >/dev/null || { echo "✗ this needs jq to read LINE's answers" >&2; exit 1; }
[ -f "$IMAGE" ] || { echo "✗ $IMAGE is missing" >&2; exit 1; }
# LINE sees the image only after the menu exists, so an oversized one is caught here instead.
IMAGE_BYTES="$(wc -c <"$IMAGE" | tr -d ' ')"
[ "$IMAGE_BYTES" -le 1000000 ] || { echo "✗ $IMAGE is $IMAGE_BYTES bytes; LINE takes at most 1 MB" >&2; exit 1; }

# Bounded in time; on an error status, --fail-with-body still prints LINE's answer, which says what's wrong.
line_curl() { curl -sS --connect-timeout 10 --max-time 60 --fail-with-body "$@"; }

# Secrets reach curl on stdin, never as arguments, so they can't show in the process list.
TOKEN=""
line_api() { # url, then curl options
  local url="$1"
  shift
  printf 'Authorization: Bearer %s\n' "$TOKEN" | line_curl -H @- "$@" "$url"
}

echo "→ getting a channel access token"
if ! answer="$(printf '%s' "$CHANNEL_SECRET" | line_curl https://api.line.me/oauth2/v3/token \
  --data-urlencode grant_type=client_credentials \
  --data-urlencode "client_id=$CHANNEL_ID" \
  --data-urlencode client_secret@-)"; then
  echo "✗ LINE didn't issue a channel access token: $answer" >&2
  exit 1
fi
TOKEN="$(printf '%s' "$answer" | jq -r '.access_token // empty' 2>/dev/null)" || TOKEN=""
# The answer isn't printed here: it may hold a token.
[ -n "$TOKEN" ] || { echo "✗ LINE's token answer has no access_token" >&2; exit 1; }

echo "→ validating the menu"
if ! answer="$(line_api https://api.line.me/v2/bot/richmenu/validate \
  -H 'Content-Type: application/json' --data-binary "$MENU")"; then
  echo "✗ LINE rejected the menu: $answer" >&2
  exit 1
fi

echo "→ creating the menu"
if ! answer="$(line_api https://api.line.me/v2/bot/richmenu \
  -H 'Content-Type: application/json' --data-binary "$MENU")"; then
  echo "✗ LINE didn't create the menu: $answer" >&2
  exit 1
fi
MENU_ID="$(printf '%s' "$answer" | jq -r '.richMenuId // empty' 2>/dev/null)" || MENU_ID=""
[ -n "$MENU_ID" ] || { echo "✗ LINE's answer has no richMenuId: $answer" >&2; exit 1; }

echo "→ uploading $(basename "$IMAGE") to $MENU_ID"
if ! answer="$(line_api "https://api-data.line.me/v2/bot/richmenu/$MENU_ID/content" \
  -H 'Content-Type: image/png' --data-binary "@$IMAGE")"; then
  echo "✗ LINE didn't take the image for $MENU_ID: $answer" >&2
  # LINE never shows a menu without an image, so don't leave one behind.
  if answer="$(line_api "https://api.line.me/v2/bot/richmenu/$MENU_ID" -X DELETE)"; then
    echo "  deleted $MENU_ID, which had no image" >&2
  else
    echo "✗ couldn't delete $MENU_ID, which has no image: $answer" >&2
  fi
  exit 1
fi

echo "✓ created $MENU_ID"
echo "Next: set LINE_RETURNING_RICH_MENU_ID=$MENU_ID in deploy/sticker-auth.env, then run ./deploy/deploy.sh"
