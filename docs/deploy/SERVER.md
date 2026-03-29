# Деплой админки на сервер (Next.js standalone + nginx + SSL)

Схема: **nginx** проксирует `adminfront.porublyu.parmenid.tech` → **127.0.0.1:3001** (Next standalone с BFF `/api/auth/*`). Статический `root` + `try_files` для этого домена не используется.

## 1. Подготовка сервера

- DNS **A** для `adminfront.porublyu.parmenid.tech` → IP сервера.
- Установите **Node.js 20+** (например [NodeSource](https://github.com/nodesource/distributions) или пакет дистрибутива).
- См. [SECURITY.md](SECURITY.md) — ключи SSH, смена пароля.

## 2. Код приложения

Скопируйте репозиторий на сервер, например:

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env.local \
  ./porublyuadmin/ root@SERVER:/opt/porubly/admin-front/
```

На сервере URL API задаётся через `/etc/porubly/admin-front.env` при сборке; локальный `.env.local` в rsync лучше **не** копировать, чтобы не пересечься с прод-настройками.

## 3. Переменные окружения

```bash
sudo install -d /etc/porubly
sudo cp /opt/porubly/admin-front/deploy/env.admin-front.example /etc/porubly/admin-front.env
sudo nano /etc/porubly/admin-front.env   # проверьте URL API
sudo chmod 600 /etc/porubly/admin-front.env
```

`NEXT_PUBLIC_API_URL` в этом файле должен совпадать с тем, что будет при сборке (скрипт подхватывает файл перед `npm run build`).

## 4. Установка (одна команда на сервере)

```bash
sudo bash /opt/porubly/admin-front/deploy/install-on-server.sh
```

Скрипт: `build-standalone.sh`, права `www-data` на `.next/standalone`, systemd `porubly-admin-front`, копирует `deploy/nginx-adminfront.conf.example` в sites-available, `reload nginx`.

Шаблон nginx **включает блок `listen 443 ssl`** с путями к сертификату `adminfront.porublyu.parmenid.tech`, чтобы повторный деплой не затирал HTTPS (раньше в шаблоне был только `:80`, и после `install-on-server.sh` запросы на 443 попадали на другой vhost с чужим сертификатом).

## 5. SSL (Let's Encrypt)

```bash
# интерактивно (рекомендуется при первом запуске):
sudo certbot --nginx -d adminfront.porublyu.parmenid.tech

# или с переменной email:
sudo CERTBOT_EMAIL=you@domain.com bash /opt/porubly/admin-front/deploy/certbot-adminfront.sh
```

Автообновление: `systemctl status certbot.timer`. При отсутствии таймера добавьте cron: `0 3 * * * certbot renew --quiet && systemctl reload nginx`.

На **совсем новом** сервере, если сертификата ещё нет, `nginx -t` упадёт на отсутствии `fullchain.pem`. Сначала выпустите сертификат (например временный конфиг только на `:80` + `certbot --nginx -d adminfront...`), затем применяйте полный шаблон из репозитория.

## 6. Проверка (smoke)

```bash
curl -sI http://127.0.0.1:3001/login | head -3
curl -sI https://adminfront.porublyu.parmenid.tech/login | head -5
sudo journalctl -u porubly-admin-front -n 30 --no-pager
```

После переключения nginx на proxy ответ по `/login` должен быть от Next (заголовок `x-powered-by: Next.js` или заметно больший HTML). Пока отдаётся старая статическая заглушка из `/var/www/porubly-admin`, размер ответа обычно очень маленький (десятки байт).

В браузере: логин → F5 (сессия через refresh cookie).

## Обновление версии

```bash
cd /opt/porubly/admin-front && git pull   # или rsync снова
sudo bash deploy/install-on-server.sh
```
