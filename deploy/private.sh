#!/usr/bin/env bash
# Closes or opens the whole site with a browser login (username + password). Run on the server as root:
#   billions-private on       ask everyone for the password (creates one the first time)
#   billions-private new      make a new password (the old one stops working)
#   billions-private off      open the site to everyone (launch day)
#   billions-private status   show whether it's closed, and the login
set -euo pipefail
ACCESS=/etc/caddy/billions-access.caddy
SECRET=/root/billions-site-login.txt
USERNAME=billions

show() { echo "Site login → username: $USERNAME   password: $(cat "$SECRET")"; }

new_password() {
  umask 077
  openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 14 > "$SECRET"
}

case "${1:-status}" in
  on|new)
    { [ "$1" = new ] || [ ! -s "$SECRET" ]; } && new_password
    hash=$(caddy hash-password --plaintext "$(cat "$SECRET")")
    printf 'basic_auth {\n\t%s %s\n}\n' "$USERNAME" "$hash" > "$ACCESS"
    systemctl reload caddy
    echo "The site is now closed: only people with the login can open it."
    show ;;
  off)
    : > "$ACCESS"
    systemctl reload caddy
    echo "The site is now open to everyone." ;;
  status)
    if [ -s "$ACCESS" ]; then echo "Closed (login required)."; show; else echo "Open to everyone."; fi ;;
  *) echo "Usage: billions-private on|new|off|status"; exit 1 ;;
esac
