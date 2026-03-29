#!/usr/bin/env bash
# Запускать на сервере от root после копирования репозитория в /opt/porubly/admin-front
# Пример: rsync -az --delete ./porublyuadmin/ root@SERVER:/opt/porubly/admin-front/
#         ssh root@SERVER 'bash -s' < deploy/install-on-server.sh
#
# Требует: Node.js 20+ (node, npm в PATH), nginx, certbot (опционально для SSL).

set -euo pipefail
INSTALL_ROOT="${INSTALL_ROOT:-/opt/porubly/admin-front}"
ENV_FILE="${ENV_FILE:-/etc/porubly/admin-front.env}"
UNIT_SRC="$(cd "$(dirname "$0")" && pwd)/systemd/porubly-admin-front.service.example"
NGX_SRC="$(cd "$(dirname "$0")" && pwd)/nginx-adminfront.conf.example"

if [[ ! -f "$INSTALL_ROOT/package.json" ]]; then
  echo "Expected repo at $INSTALL_ROOT (package.json missing)" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Create $ENV_FILE from deploy/env.admin-front.example (chmod 600)" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:?missing in env file}"
export API_URL="${API_URL:-$NEXT_PUBLIC_API_URL}"

cd "$INSTALL_ROOT"
bash "$INSTALL_ROOT/deploy/build-standalone.sh"

chown -R www-data:www-data "$INSTALL_ROOT/.next/standalone"

install -d /etc/porubly
chmod 600 "$ENV_FILE" 2>/dev/null || true

sed "s|/opt/porubly/admin-front|$INSTALL_ROOT|g" "$UNIT_SRC" \
  > /etc/systemd/system/porubly-admin-front.service
systemctl daemon-reload
systemctl enable porubly-admin-front
systemctl restart porubly-admin-front

cp "$NGX_SRC" /etc/nginx/sites-available/porubly-admin-front
if [[ ! -e /etc/nginx/sites-enabled/porubly-admin-front ]]; then
  ln -s /etc/nginx/sites-available/porubly-admin-front /etc/nginx/sites-enabled/porubly-admin-front
fi

# Отключите старый сайт со static root для того же server_name, например:
# rm -f /etc/nginx/sites-enabled/porubly-admin  (имя может отличаться)

nginx -t
systemctl reload nginx

echo "HTTP proxy should work. For HTTPS run: certbot --nginx -d adminfront.porublyu.parmenid.tech"
systemctl --no-pager status porubly-admin-front || true
