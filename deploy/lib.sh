# deploy/lib.sh: what deploy.sh, deploy-api.sh and install-node.sh share, sourced after their set -euo pipefail. It
# loads DEPLOY_ENV_FILE (deploy/.env by default) and requires DEPLOY_TARGET, the box's SSH login.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT/deploy/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  . "$ENV_FILE"
fi
TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET (user@host) in deploy/.env}"

# One SSH connection for every ssh and rsync: the box resets bursts of new ones. A box that doesn't answer, or stops
# answering, fails the script instead of hanging it.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-deploy-%C" -o ControlPersist=60
  -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
ssh() { command ssh "${SSH_OPTS[@]}" "$@"; }
export RSYNC_RSH="ssh ${SSH_OPTS[*]}"

# deploy.sh and deploy-api.sh build and publish whatever is checked out, so they deploy only the commit main points
# to, with nothing uncommitted. DEPLOY_ANY_CHECKOUT=on, for an emergency, deploys the checkout as it is.
require_main_checkout() {
  local head main changes
  head="$(git -C "$ROOT" rev-parse --short HEAD)"
  if [ "${DEPLOY_ANY_CHECKOUT:-}" = on ]; then
    echo "⚠ DEPLOY_ANY_CHECKOUT=on: deploying the checkout at $head as it is, whatever main is" >&2
    return
  fi
  main="$(git -C "$ROOT" rev-parse --short --verify --quiet refs/heads/main)" || main="none"
  # The submodules hold the contracts' Solidity libraries, which nothing these scripts build reads.
  changes="$(git -C "$ROOT" status --porcelain --ignore-submodules)"
  if [ "$head" = "$main" ] && [ -z "$changes" ]; then
    echo "→ deploying main at $head"
    return
  fi
  {
    echo "✗ $(basename "$0") builds what's checked out, so it deploys only main's commit, with nothing uncommitted:"
    if [ "$head" != "$main" ]; then echo "  HEAD is $head, and main is $main"; fi
    if [ -n "$changes" ]; then
      echo "  uncommitted:"
      printf '%s\n' "$changes" | sed 's/^/    /'
    fi
    echo "  Deploy from a clean checkout of main. In an emergency, DEPLOY_ANY_CHECKOUT=on deploys this one anyway."
  } >&2
  exit 1
}

# The Node that the root package.json pins (devEngines.runtime), which install-node.sh puts on the box.
pinned_node_version() {
  local version
  version="$(node -p "require('$ROOT/package.json').devEngines.runtime.version")"
  [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "✗ package.json pins Node '$version', not a version" >&2; return 1; }
  echo "$version"
}

# Installs a unit's file, which its deploy synced into the unit's folder on the box, and restarts the unit.
install_and_restart_unit() {
  local unit="$1" dir="$2"
  ssh "$TARGET" "sudo install -m 644 '$dir/$unit.service' /etc/systemd/system/$unit.service \
    && sudo systemctl daemon-reload && sudo systemctl enable -q $unit && sudo systemctl restart $unit"
  echo "↻ restarted $unit"
}
