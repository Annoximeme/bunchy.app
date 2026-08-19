#!/usr/bin/env bash
# Bunchy, turn the public site off and on.
#
#   ./maintenance.sh soon     hide the site behind "coming soon" (pre-launch)
#   ./maintenance.sh on       hide the site behind "maintenance"
#   ./maintenance.sh off      put the site back
#   ./maintenance.sh status   what is it doing right now
#   ./maintenance.sh link     print the preview link that gets you past the gate
#
# The switches are flag files that Caddy tests for on every request, so
# flipping one takes effect immediately, no restart, no deploy, no downtime.
# Nothing here touches the app or the database; the site keeps running behind
# the gate, which is what makes the preview link work.
set -euo pipefail

cd "$(dirname "$0")"

FLAGS="docker/flags"
# 0777 because two different uids write here: you, from the host, and the app
# container (uid 1001) when an admin uses /admin/site. A bind mount does not
# map uids, so there is no single owner that satisfies both. The directory
# holds two empty marker files and nothing else, so the mode costs nothing.
mkdir -p "$FLAGS"
chmod 0777 "$FLAGS" 2>/dev/null || true

domain() {
  # shellcheck disable=SC2002
  [ -f .env ] && grep -m1 '^DOMAIN=' .env | cut -d= -f2- | tr -d '"' || echo "your-domain"
}

token() {
  [ -f .env ] && grep -m1 '^PREVIEW_TOKEN=' .env | cut -d= -f2- | tr -d '"' || echo ""
}

preview_link() {
  local t
  t="$(token)"
  if [ -z "$t" ]; then
    echo "  No PREVIEW_TOKEN in .env, you would lock yourself out too." >&2
    echo "  Add one:  echo \"PREVIEW_TOKEN=\$(head -c 24 /dev/urandom | base64 | tr -d '/+=')\" >> .env" >&2
    return 1
  fi
  echo "https://$(domain)/?preview=$t"
}

case "${1:-status}" in
  soon)
    preview_link >/dev/null || exit 1
    rm -f "$FLAGS/ON"
    touch "$FLAGS/SOON"
    echo "Coming-soon page is ON. The public sees it; you do not, once you have"
    echo "opened the preview link below on each device."
    echo
    echo "  $(preview_link)"
    ;;
  on)
    preview_link >/dev/null || exit 1
    rm -f "$FLAGS/SOON"
    touch "$FLAGS/ON"
    echo "Maintenance page is ON."
    echo
    echo "  $(preview_link)"
    ;;
  off)
    rm -f "$FLAGS/ON" "$FLAGS/SOON"
    echo "Gate is OFF, the site is public."
    ;;
  link)
    preview_link
    ;;
  status)
    if [ -f "$FLAGS/SOON" ]; then
      echo "COMING SOON, the public sees the coming-soon page (503)."
    elif [ -f "$FLAGS/ON" ]; then
      echo "MAINTENANCE, the public sees the maintenance page (503)."
    else
      echo "OFF, the site is public."
    fi
    ;;
  *)
    echo "usage: $0 {soon|on|off|status|link}" >&2
    exit 2
    ;;
esac
