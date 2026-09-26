#!/usr/bin/env bash
# deploy/line/create-returning-menu.sh: create the returning-user rich menu (Draw, My board, Explore) in LINE, in
# English or Japanese.
#
#   ./deploy/line/create-returning-menu.sh en|ja           validate and create the menu, then upload its image
#   ./deploy/line/create-returning-menu.sh en|ja --print   print the menu object, without calling LINE
#
# en uploads returning-menu.png, and ja returning-menu.ja.png. Reusable: LINE can't replace a menu's image, so a new
# image means running this again for a new menu. It never sets the default menu or links anyone; the auth server
# links returning users to the menu in the app's language. Needs curl, jq, and the Messaging API channel's
# LINE_MESSAGING_CHANNEL_ID and LINE_MESSAGING_CHANNEL_SECRET in deploy/.env (gitignored).
set -euo pipefail

usage() {
  echo "usage: $0 en|ja [--print]" >&2
  exit 2
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$ROOT/deploy/.env" ]; then
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
fi
LIFF_URL="https://liff.line.me/2011732197-P98cxGpu"

# The area labels are what screen readers read out; LINE takes at most 20 characters each.
case "${1:-}" in
  en)
    IMAGE="$ROOT/deploy/line/returning-menu.png"
    NAME="Returning: Draw · My board · Explore"
    CHAT_BAR_TEXT="Sticker Board"
    LABELS=("Draw" "My board" "Explore")
    MENU_ID_SETTING="LINE_RETURNING_RICH_MENU_ID_EN"
    ;;
  ja)
    IMAGE="$ROOT/deploy/line/returning-menu.ja.png"
    NAME="Returning (ja): かく · マイボード · さがす"
    CHAT_BAR_TEXT="シールボード"
    LABELS=("かく" "マイボード" "さがす")
    MENU_ID_SETTING="LINE_RETURNING_RICH_MENU_ID_JA"
    ;;
  *) usage ;;
esac

# Three full-height columns, one over each tile of the image; the app opens the screen its path names.
MENU="$(
  cat <<JSON
{
  "size": { "width": 2500, "height": 843 },
  "selected": true,
  "name": "$NAME",
  "chatBarText": "$CHAT_BAR_TEXT",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "label": "${LABELS[0]}", "uri": "$LIFF_URL/draw" }
    },
    {
      "bounds": { "x": 833, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "label": "${LABELS[1]}", "uri": "$LIFF_URL" }
    },
    {
      "bounds": { "x": 1666, "y": 0, "width": 834, "height": 843 },
      "action": { "type": "uri", "label": "${LABELS[2]}", "uri": "$LIFF_URL/explore" }
    }
  ]
}
JSON
)"

[ $# -le 2 ] || usage
case "${2:-}" in
  --print)
    printf '%s\n' "$MENU"
    exit 0
    ;;
  "") ;;
  *) usage ;;
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
echo "Next: set $MENU_ID_SETTING=$MENU_ID in deploy/sticker-auth.env, then run ./deploy/deploy.sh"
