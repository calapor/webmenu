#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:?set REMOTE=user@host}"
REMOTE_DIR="${REMOTE_DIR:-/opt/webmenu}"

do_sync() {
  if command -v rsync >/dev/null 2>&1; then
    rsync -az --delete \
      --exclude node_modules --exclude data --exclude '.env*' \
      . "$REMOTE:$REMOTE_DIR/"
  else
    echo "(rsync absent — using tar-over-ssh)"
    tar -cz \
      --exclude ./node_modules --exclude ./data \
      --exclude './.env*' --exclude ./.git \
      . | ssh "$REMOTE" "mkdir -p '$REMOTE_DIR' && tar -xz -C '$REMOTE_DIR'"
  fi
}

do_install() {
  ssh "$REMOTE" "bash -lc \"
    set -e
    cd '$REMOTE_DIR'
    npm install --omit=dev --legacy-peer-deps
  \""
}

do_restart() {
  ssh "$REMOTE" "systemctl restart webmenu"
}

case "${1:-all}" in
  sync)    do_sync ;;
  install) do_install ;;
  restart) do_restart ;;
  all)     do_sync; do_install; do_restart ;;
  *) echo "usage: $0 [sync|install|restart|all]" >&2; exit 2 ;;
esac
