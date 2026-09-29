#!/usr/bin/env bash
# deploy/install-node.sh <unit>...: put the Node that package.json pins (devEngines.runtime) on the box under
# /usr/local/lib/nodejs/, and leave the box's own /usr/bin/node alone. deploy.sh runs it for sticker-auth, and
# deploy-api.sh for drawing-api. Both units start from the major's link, /usr/local/lib/nodejs/node-<major>/bin/node,
# and a named unit on that link restarts until it runs the pinned version. A new major needs a new link: change it in
# both units, and esbuild's target in apps/api/scripts/build.ts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT/deploy/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  . "$ENV_FILE"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"
VERSION="$(node -p "require('$ROOT/package.json').devEngines.runtime.version")"
[[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "✗ package.json pins Node '$VERSION', not a version" >&2; exit 1; }
# A unit still on another major's link would pass every check on the old Node.
for unit in "$@"; do
  grep -q "^ExecStart=/usr/local/lib/nodejs/node-${VERSION%%.*}/bin/node " "$ROOT/deploy/$unit.service" \
    || { echo "✗ deploy/$unit.service doesn't start from /usr/local/lib/nodejs/node-${VERSION%%.*}" >&2; exit 1; }
done

# One SSH connection for every ssh below: the box resets bursts of new ones. A box that doesn't answer, or stops
# answering, fails the install instead of hanging it.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-deploy-%C" -o ControlPersist=60
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
ssh() { command ssh "${SSH_OPTS[@]}" "$@"; }

ssh "$TARGET" "bash -s -- '$VERSION' $*" <<'BOX'
set -euo pipefail
version="$1"
shift
dir=/usr/local/lib/nodejs
name="node-v$version-linux-x64"
link="$dir/node-${version%%.*}"
if [ ! -x "$dir/$name/bin/node" ]; then
  echo "→ installing $name on the box"
  tmp="$(mktemp -d)"
  stage=""
  trap 'rm -rf "$tmp"; if [ -n "$stage" ]; then sudo rm -rf "$stage"; fi' EXIT
  cd "$tmp"
  # Checked as nodejs.org says: a Node releaser signs SHASUMS256.txt. gpg also passes a file with no signature at
  # all, so only its VALIDSIG status counts. The box has gpg but not gpgv, and a GNUPGHOME of its own keeps the
  # deploy user's keyring out of it.
  export GNUPGHOME="$tmp/gnupg"
  install -d -m 700 "$GNUPGHOME"
  # Per attempt: a stalled download fails the install instead of hanging it.
  download_max_time=300
  get() { curl -fsS --retry 3 --connect-timeout 15 --max-time "$download_max_time" -L "$@"; }
  get -o keyring.kbx https://github.com/nodejs/release-keys/raw/HEAD/gpg/pubring.kbx
  get -O "https://nodejs.org/dist/v$version/SHASUMS256.txt.asc"
  get -O "https://nodejs.org/dist/v$version/$name.tar.xz"
  gpg --batch --quiet --status-file gpg-status --no-default-keyring --keyring "$tmp/keyring.kbx" \
    --output SHASUMS256.txt --decrypt SHASUMS256.txt.asc 2>/dev/null && grep -q '^\[GNUPG:\] VALIDSIG ' gpg-status \
    || { echo "✗ no Node releaser signed SHASUMS256.txt" >&2; exit 1; }
  sha256sum --check --ignore-missing --quiet SHASUMS256.txt \
    || { echo "✗ $name.tar.xz doesn't match SHASUMS256.txt" >&2; exit 1; }
  # Unpacked beside its place and moved there once it runs, so a cut-off install never passes for a whole one.
  sudo install -d -m 755 "$dir"
  stage="$(sudo mktemp -d "$dir/.$name.XXXXXX")"
  sudo tar --no-same-owner -xJf "$name.tar.xz" -C "$stage"
  [ "$(sudo "$stage/$name/bin/node" --version)" = "v$version" ] || { echo "✗ the unpacked $name doesn't run" >&2; exit 1; }
  sudo rm -rf "${dir:?}/$name"
  sudo mv "$stage/$name" "$dir/$name"
fi
if [ "$(readlink "$link" || true)" != "$name" ]; then
  sudo ln -sfn "$name" "$link"
  echo "→ $link → $name"
fi
# Checked on every run, so a run cut off after moving the link is caught up. A stopped unit stays stopped, and a
# unit not on the link yet moves to it, and restarts, when its deploy installs the unit.
for unit in "$@"; do
  grep -q "^ExecStart=$link/" "/etc/systemd/system/$unit.service" 2>/dev/null || continue
  pid="$(systemctl show -p MainPID --value "$unit")"
  if [ "$pid" != 0 ] && [ "$(sudo readlink -f "/proc/$pid/exe")" != "$dir/$name/bin/node" ]; then
    sudo systemctl restart "$unit"
    echo "↻ restarted $unit on $name"
  fi
done
BOX
