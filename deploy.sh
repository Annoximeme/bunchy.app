#!/usr/bin/env bash
# Bunchy — deploy.
#
#   ./deploy.sh
#
# Pulls, rebuilds, migrates and restarts. Safe to run repeatedly; safe to run
# while the site is up. Migrations run in their own container and the app only
# starts if they succeed, so a bad migration stops the deploy rather than
# leaving a server talking to a schema it does not match.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env here. Copy .env.production.example to .env and fill it in." >&2
  exit 1
fi

# A deploy that silently used the previous commit is worse than one that fails.
echo "==> Fetching"
git fetch --prune
BEFORE=$(git rev-parse HEAD)
git pull --ff-only
AFTER=$(git rev-parse HEAD)
if [ "$BEFORE" = "$AFTER" ]; then
  echo "    already at $(git rev-parse --short HEAD) — rebuilding anyway"
else
  echo "    $(git rev-parse --short "$BEFORE") -> $(git rev-parse --short "$AFTER")"
fi

echo "==> Building"
docker compose build

echo "==> Migrating and restarting"
# `up -d` recreates only what changed. `migrate` runs to completion first
# because `app` declares service_completed_successfully on it.
docker compose up -d --remove-orphans

echo "==> Waiting for health"
for i in $(seq 1 60); do
  if [ "$(docker compose ps app --format '{{.Health}}' 2>/dev/null)" = "healthy" ]; then
    echo "    healthy after ${i}0s"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "    never became healthy — last 40 lines:" >&2
    docker compose logs app --tail 40 >&2
    exit 1
  fi
  sleep 10
done

# Images accumulate fast on a small VPS; a build a day fills a 50GB disk in
# weeks. Only dangling ones, so a rollback target is never removed.
echo "==> Pruning dangling images"
docker image prune -f >/dev/null

echo "==> Done — $(git rev-parse --short HEAD)"
