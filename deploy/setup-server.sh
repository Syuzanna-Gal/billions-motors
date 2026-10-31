#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for billions.am. Run as root:
#   bash setup-server.sh
# Safe to run again: every step checks what's already there.
#
# Installs: Node.js 22, PostgreSQL 18 (same version as development, so dumps restore cleanly),
# Caddy (web server with automatic HTTPS), a firewall, automatic security updates, a swap file,
# nightly database backups, and the site itself as a systemd service.
set -euo pipefail

DOMAIN="${DOMAIN:-billions.am}"
REPO="${REPO:-https://github.com/Syuzanna-Gal/billions-motors.git}"
APP_USER=billions
BASE=/srv/billions
APP="$BASE/app"
ENV_FILE=/etc/billions.env

step() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" = 0 ] || { echo "Run as root."; exit 1; }
export DEBIAN_FRONTEND=noninteractive

step "System packages"
apt-get update -q
apt-get install -yq ca-certificates curl gnupg git ufw unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https
install -d -m 0755 /etc/apt/keyrings

step "Node.js 22"
if ! command -v node >/dev/null || ! node -v | grep -q '^v22\.'; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -q && apt-get install -yq nodejs
fi
node -v

step "PostgreSQL 18"
if ! command -v /usr/lib/postgresql/18/bin/postgres >/dev/null; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor --yes -o /etc/apt/keyrings/postgresql.gpg
  echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(. /etc/os-release; echo "$VERSION_CODENAME")-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -q && apt-get install -yq postgresql-18
fi
systemctl enable --now postgresql

step "Caddy (HTTPS)"
if ! command -v caddy >/dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/caddy.gpg
  echo "deb [signed-by=/etc/apt/keyrings/caddy.gpg] https://dl.cloudsmith.io/public/caddy/stable/deb/debian any-version main" > /etc/apt/sources.list.d/caddy.list
  apt-get update -q && apt-get install -yq caddy
fi

step "Swap (2 GB, so builds never run out of memory)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

step "Firewall: SSH, HTTP, HTTPS only"
ufw allow OpenSSH >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443/tcp >/dev/null
ufw --force enable

step "Automatic security updates"
dpkg-reconfigure -f noninteractive unattended-upgrades

step "App user and folders"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$BASE" "$BASE/uploads"
install -d -o postgres -g postgres -m 0750 "$BASE/backups"

step "Database and settings"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'billions') THEN CREATE ROLE billions LOGIN; END IF;
END \$\$;
ALTER ROLE billions PASSWORD '$DB_PASS';
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = 'billions'" | grep -q 1 \
    || sudo -u postgres createdb -O billions billions
  umask 077
  cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgres://billions:$DB_PASS@127.0.0.1:5432/billions
UPLOAD_DIR=$BASE/uploads
SITE_URL=https://$DOMAIN
# "true" until launch day: search engines are told not to index the site.
SITE_NOINDEX=true
SEED_DEMO=false
# Fallbacks only: the real contact details are edited in Admin → Contact info.
NEXT_PUBLIC_PHONE="+374 00 000 000"
NEXT_PUBLIC_WHATSAPP="37400000000"
NEXT_PUBLIC_TELEGRAM="billions_am"
NEXT_PUBLIC_EMAIL="info@$DOMAIN"
NEXT_TELEMETRY_DISABLED=1
ENV
  chown root:"$APP_USER" "$ENV_FILE" && chmod 0640 "$ENV_FILE"
fi

step "Site code"
if [ ! -d "$APP/.git" ]; then
  sudo -u "$APP_USER" git clone --depth 1 "$REPO" "$APP"
fi
install -m 0755 "$APP/deploy/update.sh" /usr/local/bin/billions-update

step "Service"
cat > /etc/systemd/system/billions.service <<UNIT
[Unit]
Description=Billions Motors website
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=$APP_USER
Group=$APP_USER
EnvironmentFile=$ENV_FILE
WorkingDirectory=$APP/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
# Hardening: the site can only write to its photo folder.
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
# Next.js keeps a small cache inside its build folder.
ReadWritePaths=$BASE/uploads $APP/.next/standalone/.next

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable billions >/dev/null

step "Web server"
cat > /etc/caddy/Caddyfile <<CADDY
# HTTPS certificates are obtained automatically once $DOMAIN points to this server.
$DOMAIN {
	encode zstd gzip
	request_body {
		max_size 80MB
	}
	reverse_proxy 127.0.0.1:3000
}

www.$DOMAIN {
	redir https://$DOMAIN{uri} permanent
}
CADDY
systemctl reload caddy || systemctl restart caddy

step "Nightly database backup (kept 14 days)"
cat > /etc/cron.d/billions-backup <<CRON
# Every night at 23:30 UTC (03:30 in Yerevan): database copy, 14 days kept.
30 23 * * * postgres pg_dump -Fc billions -f $BASE/backups/billions-\$(date +\%Y\%m\%d).dump && find $BASE/backups -name 'billions-*.dump' -mtime +14 -delete
CRON
chmod 0644 /etc/cron.d/billions-backup

step "Build and start"
/usr/local/bin/billions-update

printf '\n\033[1;32mDone.\033[0m Next: restore the database and photos (deploy/README.md), then point %s to this server.\n' "$DOMAIN"
