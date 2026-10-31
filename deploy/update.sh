#!/usr/bin/env bash
# Puts the latest code from GitHub live. Run on the server as root:  billions-update
# If the build fails the script stops before restarting. Note: the build replaces the .next
# folder the running site reads from, so pages may error for the minute or two it takes.
set -euo pipefail
APP=/srv/billions/app
ENV_FILE=/etc/billions.env
as_app() { sudo -u billions -H env HOME=/srv/billions bash -c "$1"; }

cd "$APP"
as_app "git fetch --depth 1 origin main && git reset --hard origin/main"
as_app "git log -1 --format='Code: %h %s'"

# NEXT_PUBLIC_* values are built into the pages, so the build needs the same settings as the site.
# Dev dependencies (TypeScript, Tailwind) are needed to build, even though NODE_ENV is production.
# "npm install" rather than "npm ci": it also works when package.json was updated without the lock file.
as_app "set -a && . $ENV_FILE && set +a && npm install --include=dev --no-audit --no-fund && npm run build"

# Standalone output: the server needs the static files and public folder next to it.
as_app "cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/"

systemctl restart billions
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/hy; then echo "Site is up."; exit 0; fi
  sleep 1
done
echo "The site did not start — see: journalctl -u billions -n 50"
exit 1
