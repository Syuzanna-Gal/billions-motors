# Server (billions.am)

One DigitalOcean Droplet (Frankfurt, Ubuntu 24.04, 4 GB) runs everything:
the site (Node.js, systemd service `billions`), PostgreSQL 18, and Caddy (HTTPS).

| What | Where |
|---|---|
| Site code | `/srv/billions/app` (a clone of this repo) |
| Car photos | `/srv/billions/uploads` |
| Settings (database password etc.) | `/etc/billions.env` |
| Nightly database copies (14 days) | `/var/backups/billions` |
| Web server config | `/etc/caddy/Caddyfile` |

## First setup (once)

```sh
ssh root@SERVER 'git clone --depth 1 https://github.com/Syuzanna-Gal/billions-motors.git /root/billions-src && bash /root/billions-src/deploy/setup-server.sh'
```

## Move the database and photos from a Mac

```sh
KEY=~/Downloads/billions-server-key/id_ed25519
/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump -Fc -d billions -f ~/Downloads/billions.dump
scp -i $KEY ~/Downloads/billions.dump root@SERVER:/root/
rsync -az -e "ssh -i $KEY" ~/Downloads/billions-motors/.data/uploads/ root@SERVER:/srv/billions/uploads/
ssh -i $KEY root@SERVER 'bash /srv/billions/app/deploy/restore.sh /root/billions.dump'
```

The restore removes the development test accounts (`*@billions.local`).

## Everyday

- Put the latest code live: `ssh root@SERVER billions-update`
- Logs: `journalctl -u billions -f`
- Restart: `systemctl restart billions`
- Launch day: set `SITE_NOINDEX=false` in `/etc/billions.env`, then `billions-update`.
