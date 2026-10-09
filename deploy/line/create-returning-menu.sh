#!/usr/bin/env bash
# deploy/line/create-returning-menu.sh: create one of the official account's chat menus in LINE, and record its ID in
# deploy/line/menus.json, from which the REST API links each person's menu; it never links anyone itself. A returning
# person's menu (en|ja) has Draw, My board and Explore, with 3, 2 or 1 daily tickets left, only reserve ones, none, or
# no count (plain); with Kyoto Seika Manga Expression Practice Mode on, its own menus (kyoto-seika-…) show 10 down to 1
# daily tickets left, reserve or none. New people's (default) has one bilingual key, and --set-default makes it LINE's
# default too. --print
# prints the menu without calling LINE. `pnpm --filter frontend chat-menus` renders the images; LINE can't replace a
# menu's image, so a new image means a new menu. Needs curl, jq, and the Messaging API channel in deploy/.env.
set -euo pipefail

usage() {
  echo "usage: $0 en|ja plain|3|2|1|reserve|none|kyoto-seika-<1-10>|kyoto-seika-reserve|kyoto-seika-none [--print]" >&2
  echo "       $0 default [--set-default] [--print]" >&2
  exit 2
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MENUS_FILE="$ROOT/deploy/line/menus.json"
LIFF_URL="https://liff.line.me/2011732197-P98cxGpu"

MENU="${1:-}"
STATE=""
case "$MENU" in
  en | ja)
    STATE="${2:-}"
    case "$STATE" in
      plain | 3 | 2 | 1 | reserve | none) ;;
      kyoto-seika-[1-9] | kyoto-seika-10 | kyoto-seika-reserve | kyoto-seika-none) ;;
      *) usage ;;
    esac
    shift 2
    ;;
  default) shift ;;
  *) usage ;;
esac
# A menu for Kyoto Seika Manga Expression Practice Mode shows the standard image for its count; 4–10 are drawn for
# that mode alone.
SHOWS="${STATE#kyoto-seika-}"
PRINT=""
SET_DEFAULT=""
for option in "$@"; do
  case "$option" in
    --print) PRINT=1 ;;
    --set-default) [ "$MENU" = default ] && SET_DEFAULT=1 || usage ;;
    *) usage ;;
  esac
done

command -v jq >/dev/null || { echo "✗ this needs jq to build the menu and read LINE's answers" >&2; exit 1; }

# Screen readers read each area's label, LINE's chat bar shows chatBarText, and the app opens the screen a path names.
# The labels say what the image shows: the key's word, and in words what its tickets say.
case "$MENU" in
  en)
    CHAT_BAR_TEXT="Croquis"
    case "$SHOWS" in
      plain) DRAW="Draw" ;;
      1) DRAW="Draw, 1 ticket left" ;;
      2 | 3 | 4 | 5 | 6 | 7 | 8 | 9) DRAW="Draw, $SHOWS tickets left" ;;
      # "Draw, 10 tickets left" is over LINE's 20 characters.
      10) DRAW="Draw, 10 left" ;;
      reserve) DRAW="Draw, reserve ticket" ;;
      none) DRAW="Draw, out of tickets" ;;
    esac
    MY_BOARD="My board"
    EXPLORE="Explore"
    ;;
  ja)
    CHAT_BAR_TEXT="クロッキー"
    case "$SHOWS" in
      plain) DRAW="かく" ;;
      1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10) DRAW="かく（のこり${SHOWS}枚）" ;;
      reserve) DRAW="かく（有償チケット）" ;;
      none) DRAW="かく（チケットなし）" ;;
    esac
    MY_BOARD="マイボード"
    EXPLORE="発見"
    ;;
esac

if [ "$MENU" = default ]; then
  IMAGE="$ROOT/deploy/line/images/default.png"
  # It can't know anyone's language, so it speaks Japanese first, as the greeting does (greeting.md).
  MENU_JSON="$(jq -n --arg uri "$LIFF_URL" '{
    size: { width: 2500, height: 843 },
    selected: true,
    name: "Default: Open Sticker Board",
    chatBarText: "クロッキー Croquis",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 2500, height: 843 },
        action: { type: "uri", label: "シールボードをひらく", uri: $uri }
      }
    ]
  }')"
  MENU_PATH='["default"]'
else
  IMAGE="$ROOT/deploy/line/images/returning-$MENU-$SHOWS.png"
  # The areas the image draws: the Draw key and its tickets on the left, My board over Explore on the right.
  MENU_JSON="$(jq -n --arg name "Returning ($MENU, $STATE): Draw · My board · Explore" \
    --arg bar "$CHAT_BAR_TEXT" --arg draw "$DRAW" --arg board "$MY_BOARD" --arg explore "$EXPLORE" \
    --arg uri "$LIFF_URL" '{
    size: { width: 2500, height: 843 },
    selected: true,
    name: $name,
    chatBarText: $bar,
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1409, height: 843 },
        action: { type: "uri", label: $draw, uri: "\($uri)/draw" }
      },
      {
        bounds: { x: 1409, y: 0, width: 1091, height: 421 },
        action: { type: "uri", label: $board, uri: $uri }
      },
      {
        bounds: { x: 1409, y: 421, width: 1091, height: 422 },
        action: { type: "uri", label: $explore, uri: "\($uri)/explore" }
      }
    ]
  }')"
  MENU_PATH="[\"$MENU\", \"$STATE\"]"
fi

# LINE takes at most 14 characters on the chat bar and 20 in a label; jq counts characters, not bytes.
too_long="$(printf '%s' "$MENU_JSON" | jq -r '
  (.chatBarText | select(length > 14) | "the chat bar text \"\(.)\" is over 14 characters"),
  (.areas[].action.label | select(length > 20) | "the label \"\(.)\" is over 20 characters")')"
[ -z "$too_long" ] || { echo "✗ $too_long" >&2; exit 1; }

if [ -n "$PRINT" ]; then
  printf '%s\n' "$MENU_JSON"
  exit 0
fi

if [ -f "$ROOT/deploy/.env" ]; then
  # shellcheck source=/dev/null
  . "$ROOT/deploy/.env"
fi
CHANNEL_ID="${LINE_MESSAGING_CHANNEL_ID:?set LINE_MESSAGING_CHANNEL_ID in deploy/.env}"
CHANNEL_SECRET="${LINE_MESSAGING_CHANNEL_SECRET:?set LINE_MESSAGING_CHANNEL_SECRET in deploy/.env}"
[ -f "$IMAGE" ] || { echo "✗ $IMAGE is missing: run pnpm --filter frontend chat-menus" >&2; exit 1; }
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
  -H 'Content-Type: application/json' --data-binary "$MENU_JSON")"; then
  echo "✗ LINE rejected the menu: $answer" >&2
  exit 1
fi

echo "→ creating the menu"
if ! answer="$(line_api https://api.line.me/v2/bot/richmenu \
  -H 'Content-Type: application/json' --data-binary "$MENU_JSON")"; then
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

OLD_ID="$(jq -r --argjson path "$MENU_PATH" 'getpath($path) // empty' "$MENUS_FILE")"
jq --argjson path "$MENU_PATH" --arg id "$MENU_ID" 'setpath($path; $id)' "$MENUS_FILE" >"$MENUS_FILE.tmp"
mv "$MENUS_FILE.tmp" "$MENUS_FILE"
echo "✓ created $MENU_ID, and recorded it in deploy/line/menus.json: commit that, then run ./deploy/deploy-api.sh"

if [ -n "$SET_DEFAULT" ]; then
  echo "→ making it LINE's default menu"
  if ! answer="$(line_api "https://api.line.me/v2/bot/user/all/richmenu/$MENU_ID" -X POST)"; then
    echo "✗ LINE didn't make $MENU_ID the default: $answer" >&2
    exit 1
  fi
  echo "✓ $MENU_ID is the default: everyone without a menu of their own sees it, once they reopen the chat"
fi

if [ -n "$OLD_ID" ] && [ "$OLD_ID" != "$MENU_ID" ]; then
  echo "It replaces $OLD_ID, which stays in LINE, and on everyone linked to it, until it's deleted."
fi
