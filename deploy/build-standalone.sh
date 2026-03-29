#!/usr/bin/env bash
# Сборка standalone и подготовка каталога для запуска node server.js
# Использование (из корня репозитория):
#   export NEXT_PUBLIC_API_URL=https://backend.porublyu.parmenid.tech/api/v1/admin
#   export API_URL="$NEXT_PUBLIC_API_URL"
#   ./deploy/build-standalone.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${NEXT_PUBLIC_API_URL:?Set NEXT_PUBLIC_API_URL (admin API base, must match build-time)}"
export API_URL="${API_URL:-$NEXT_PUBLIC_API_URL}"

npm ci
npm run build

STANDALONE="$ROOT/.next/standalone"
if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "Missing $STANDALONE/server.js — build failed?" >&2
  exit 1
fi

cp -a "$ROOT/public" "$STANDALONE/public"
mkdir -p "$STANDALONE/.next/static"
cp -a "$ROOT/.next/static/." "$STANDALONE/.next/static/"

echo "OK: run from $STANDALONE with: PORT=3001 HOSTNAME=127.0.0.1 node server.js"
