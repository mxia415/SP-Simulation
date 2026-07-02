#!/bin/zsh
set -e

cd "$(dirname "$0")"

PORT=8765
URL="http://127.0.0.1:${PORT}/"

if ! /usr/sbin/lsof -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  python3 -m http.server "${PORT}" >/tmp/lingzhu-sp-s-http.log 2>&1 &
  sleep 1
fi

open -a "Google Chrome" "${URL}"
