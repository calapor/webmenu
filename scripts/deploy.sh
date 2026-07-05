#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:?set REMOTE=user@host}"
REMOTE_DIR="${REMOTE_DIR:-/opt/webmenu}"
APP_VERSION="${GIT_COMMIT:0:7} (#${BUILD_NUMBER:-0})"

do_sync() {
  if command -v rsync >/dev/null 2>&1; then
    rsync -az --delete \
      --exclude node_modules --exclude .next --exclude data --exclude '.env*' \
      . "$REMOTE:$REMOTE_DIR/"
  else
    echo "(rsync absent — using tar-over-ssh)"
    tar -cz \
      --exclude ./node_modules --exclude ./.next --exclude ./data \
      --exclude './.env*' --exclude ./.git \
      . | ssh "$REMOTE" "mkdir -p '$REMOTE_DIR' && tar -xz -C '$REMOTE_DIR'"
  fi
}

do_build() {
  ssh "$REMOTE" "bash -lc \"
    set -e
    source ~/.nvm/nvm.sh
    cd '$REMOTE_DIR'
    npm install --legacy-peer-deps
    APP_VERSION='$APP_VERSION' npm run build
  \""
}

do_restart() {
  ssh "$REMOTE" "systemctl restart webmenu"
}

case "${1:-all}" in
  sync)    do_sync ;;
  build)   do_build ;;
  restart) do_restart ;;
  all)     do_sync; do_build; do_restart ;;
  *) echo "usage: $0 [sync|build|restart|all]" >&2; exit 2 ;;
esac
