#!/usr/bin/env bash
# Выполнить на сервере один раз после работающего HTTP vhost и DNS.
# Рекомендуется интерактивный запуск для ввода email:
#   sudo certbot --nginx -d adminfront.porublyu.parmenid.tech
set -euo pipefail
if [[ -n "${CERTBOT_EMAIL:-}" ]]; then
  certbot --nginx -d adminfront.porublyu.parmenid.tech \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
else
  certbot --nginx -d adminfront.porublyu.parmenid.tech
fi
systemctl reload nginx
systemctl status certbot.timer --no-pager || true
