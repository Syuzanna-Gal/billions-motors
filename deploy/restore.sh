#!/usr/bin/env bash
# Loads a database copy (made with pg_dump -Fc) into the server's database, replacing what's there.
# Run as root:  bash restore.sh /root/billions.dump
# Photos are copied separately into /srv/billions/uploads (see deploy/README.md).
set -euo pipefail
DUMP="${1:?Usage: restore.sh FILE.dump}"
[ -f "$DUMP" ] || { echo "No such file: $DUMP"; exit 1; }

systemctl stop billions
# Safety copy of whatever is there now.
sudo -u postgres pg_dump -Fc billions -f "/var/backups/billions/before-restore-$(date +%Y%m%d-%H%M%S).dump" || true

install -m 0644 "$DUMP" /tmp/billions-restore.dump
sudo -u postgres pg_restore --clean --if-exists --no-owner --no-acl --role=billions -d billions /tmp/billions-restore.dump
rm -f /tmp/billions-restore.dump

# Development-only test accounts must never exist on the live site; their sessions go with them.
sudo -u postgres psql -d billions -v ON_ERROR_STOP=1 -c "DELETE FROM admin_users WHERE email LIKE '%@billions.local';"

chown -R billions:billions /srv/billions/uploads
systemctl start billions
sudo -u postgres psql -d billions -tAc "SELECT 'cars: ' || count(*) FROM vehicles UNION ALL SELECT 'photos: ' || count(*) FROM vehicle_images UNION ALL SELECT 'admins: ' || string_agg(email || ' (' || role || ')', ', ') FROM admin_users"
